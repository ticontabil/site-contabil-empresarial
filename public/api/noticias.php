<?php
/**
 * Notícias de contabilidade e tributos, reunidas de fontes oficiais e especializadas.
 * O site mostra SÓ título, resumo curto, data e o link para a matéria original (decisão de 24/11/2026).
 * Atualiza sozinho de dois jeitos:
 *  - tarefa agendada do cPanel (cron), a cada 15 minutos: php /home/<usuario>/public_html/api/noticias.php
 *    (pela linha de comando sempre busca de novo, então o visitante encontra tudo pronto);
 *  - se por algum motivo o cache passar de 2 horas, o próximo visitante dispara a atualização.
 * Feeds testados em 24/11/2026 (materiais/noticias/feeds.json).
 */
declare(strict_types=1);
require __DIR__ . '/_comum.php';

const IDADE_CACHE = 7200;     // 2 horas
const MAX_ITENS = 300;
const DIAS_MAX = 120;

$FONTES = [
  ['id' => 'receita', 'fotos' => true, 'nome' => 'Receita Federal', 'url' => 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/ultimas-noticias/rss.xml', 'filtrar' => false, 'excluir' => true, 'oficial' => true],
  ['id' => 'fazenda', 'fotos' => true, 'nome' => 'Ministério da Fazenda', 'url' => 'https://www.gov.br/fazenda/RSS', 'filtrar' => true, 'linkContem' => '/assuntos/noticias/', 'oficial' => true],
  ['id' => 'agenciabrasil', 'fotos' => true, 'nome' => 'Agência Brasil', 'url' => 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml', 'filtrar' => true, 'oficial' => true],
  ['id' => 'senado', 'fotos' => true, 'nome' => 'Agência Senado', 'url' => 'https://www12.senado.leg.br/noticias/rss?tema=economia', 'filtrar' => true, 'oficial' => true],
  ['id' => 'camara', 'fotos' => true, 'nome' => 'Agência Câmara', 'url' => 'https://www.camara.leg.br/noticias/rss/dinamico/ECONOMIA', 'filtrar' => true, 'oficial' => true],
  ['id' => 'cfc', 'nome' => 'Conselho Federal de Contabilidade', 'url' => 'https://cfc.org.br/feed/', 'filtrar' => false, 'oficial' => true],
  ['id' => 'contabeis', 'nome' => 'Portal Contábeis', 'url' => 'https://www.contabeis.com.br/rss/noticias/', 'filtrar' => false, 'oficial' => false],
  ['id' => 'jornalcontabil', 'nome' => 'Jornal Contábil', 'url' => 'https://jornalcontabil.com.br/feed/', 'filtrar' => false, 'oficial' => false],
];

// temas (o primeiro que bater vira a etiqueta da notícia) e palavras exigidas nos feeds amplos
$TEMAS = [
  'Reforma Tributária' => '/reforma tribut|\bcbs\b|\bibs\b|imposto seletivo|split payment|comit[eê] gestor/iu',
  'Imposto de Renda' => '/imposto de renda|\birpf\b|\birpj\b|declara[cç][aã]o do ir|restitui[cç]/iu',
  'Simples e MEI' => '/simples nacional|\bmei\b|microempreendedor|pequenas empresas/iu',
  'Trabalhista' => '/esocial|\bfgts\b|folha de pagamento|trabalhist|\binss\b|previd[eê]nci|sal[aá]rio m[ií]nimo|13º|d[eé]cimo terceiro/iu',
  'Fiscal' => '/nota fiscal|\bnf-?e\b|\bnfs-?e\b|\bicms\b|\biss\b|\bsped\b|obriga[cç][oõ]es acess|\bdctf|\becf\b|\befd\b|parcelamento|d[ií]vida ativa|transa[cç][aã]o tribut/iu',
  'Receita Federal' => '/receita federal|\bcnpj\b|\bcpf\b|malha fina|tribut|imposto|arrecada/iu',
  'Contabilidade' => '/cont[aá]bil|contabilidade|contador|\bcfc\b|\bcrc\b|auditoria|balan[cç]o/iu',
];
$EXCLUIR_RECEITA = '/apreens|apreende|coca[ií]na|maconha|drogas|contrabando|descaminho|aduan|alf[aâ]ndeg|cigarros|armas|muni[cç][aã]o|bagagem/iu';

function textoLimpo(string $html, int $max = 0): string {
  $t = html_entity_decode(strip_tags(preg_replace('/<(script|style)[\s\S]*?<\/\1>/i', '', $html)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
  $t = trim(preg_replace('/\s+/u', ' ', $t));
  // sobras comuns dos feeds: "Leia mais em <link>", "O post X apareceu primeiro em Y", "Continue lendo", "[…]"
  $t = preg_replace('/\s*O post .{0,400}? apareceu primeiro em .*$/u', '', $t);
  $t = preg_replace('/\s*(Leia mais|Continue lendo|Saiba mais)( em)?:?\s*(https?:\/\/\S+)?\s*\.?$/iu', '', $t);
  $t = preg_replace('/\s*\[(…|\.\.\.|&#8230;)\]\s*$/u', '…', $t);
  $t = trim($t);
  if ($max > 0 && mb_strlen($t) > $max) {
    $t = mb_substr($t, 0, $max);
    $t = preg_replace('/\s+\S*$/u', '', $t) . '…';
  }
  return $t;
}

function baixar(string $url): ?string {
  $ua = 'ContabilEmpresarialNoticias/1.0 (+https://contabilempresarial.com.br/noticias)';
  if (function_exists('curl_init')) {
    $c = curl_init($url);
    curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 3,
      CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 10, CURLOPT_USERAGENT => $ua, CURLOPT_ENCODING => '',
      CURLOPT_HTTPHEADER => ['Accept: application/rss+xml, application/rdf+xml, application/atom+xml, application/xml, text/xml']]);
    $r = curl_exec($c);
    $ok = $r !== false && curl_getinfo($c, CURLINFO_HTTP_CODE) < 400;
    curl_close($c);
    return $ok ? (string) $r : null;
  }
  $ctx = stream_context_create(['http' => ['timeout' => 10, 'user_agent' => $ua, 'follow_location' => 1]]);
  $r = @file_get_contents($url, false, $ctx);
  return $r === false ? null : $r;
}

/** Só fotos https de verdade (sem logos, ícones, pixels de rastreio ou SVG). */
function imagemValida(string $u): string {
  $u = trim($u);
  if (!preg_match('#^https://[^\s"\x27<>]+$#i', $u)) return '';
  if (preg_match('#\.svg(\?|$)|logo|icon|pixel|tracking|gravatar|emoji|/feed|1x1#i', $u)) return '';
  return $u;
}

/** Capa oficial da matéria (og:image) para fontes que não mandam foto no feed. Uma vez por notícia. */
function capaDaPagina(string $link): string {
  $html = baixar($link);
  if (!$html) return '';
  if (preg_match('/<meta[^>]+property=["\x27]og:image["\x27][^>]+content=["\x27]([^"\x27]+)/i', $html, $m)
    || preg_match('/<meta[^>]+content=["\x27]([^"\x27]+)["\x27][^>]+property=["\x27]og:image/i', $html, $m)) return imagemValida(html_entity_decode($m[1]));
  return '';
}

/** Lê RSS 2.0, RSS 1.0 (RDF) e Atom. */
function lerFeed(string $xml): array {
  $prev = libxml_use_internal_errors(true);
  $x = simplexml_load_string($xml, 'SimpleXMLElement', LIBXML_NOCDATA | LIBXML_NONET);
  libxml_use_internal_errors($prev);
  if (!$x) return [];
  $itens = [];
  $ns = $x->getNamespaces(true);
  $nodes = [];
  if (isset($x->channel->item)) foreach ($x->channel->item as $i) $nodes[] = $i;          // RSS 2.0
  if (!$nodes && isset($ns['']) ) foreach ($x->children($ns[''])->item ?? [] as $i) $nodes[] = $i; // RSS 1.0
  if (!$nodes) foreach ($x->item ?? [] as $i) $nodes[] = $i;
  if (!$nodes && isset($x->entry)) foreach ($x->entry as $i) $nodes[] = $i;              // Atom
  foreach ($nodes as $i) {
    $dc = $i->children('http://purl.org/dc/elements/1.1/');
    $link = trim((string) $i->link);
    if ($link === '' && isset($i->link['href'])) $link = (string) $i->link['href'];
    if ($link === '' && preg_match('#^https?://#', trim((string) $i->guid))) $link = trim((string) $i->guid);
    $rdfAbout = $i->attributes('http://www.w3.org/1999/02/22-rdf-syntax-ns#')['about'] ?? '';
    if ($link === '' && $rdfAbout) $link = (string) $rdfAbout;
    $data = (string) ($i->pubDate ?: $dc->date ?: $i->updated ?: $i->published);
    $desc = (string) ($i->description ?: $i->summary ?: $dc->description);
    // imagem que vem no próprio feed: <imagem-destaque> (Agência Brasil), media:content, enclosure ou 1ª <img> do conteúdo
    $img = trim(strip_tags(html_entity_decode((string) ($i->{'imagem-destaque'} ?? ''))));
    $media = $i->children('http://search.yahoo.com/mrss/');
    if ($img === '' && isset($media->content)) $img = (string) $media->content->attributes()['url'];
    if ($img === '' && isset($i->enclosure) && strpos((string) $i->enclosure['type'], 'image') === 0) $img = (string) $i->enclosure['url'];
    if ($img === '') {
      $html = (string) $i->children('http://purl.org/rss/1.0/modules/content/')->encoded . ' ' . $desc;
      if (preg_match('/<img[^>]+src=["\x27]([^"\x27]+)/i', html_entity_decode($html), $m)) $img = $m[1];
    }
    $itens[] = ['titulo' => textoLimpo((string) $i->title, 220), 'link' => $link, 'data' => $data, 'resumo' => textoLimpo($desc, 320), 'imagem' => imagemValida($img)];
  }
  return $itens;
}

function atualizar(array $FONTES, array $TEMAS, string $EXCLUIR_RECEITA, array $anterior): array {
  $todos = [];
  $status = [];
  $limite = time() - DIAS_MAX * 86400;
  foreach ($FONTES as $f) {
    $xml = baixar($f['url']);
    $lidos = $xml ? lerFeed($xml) : [];
    $status[$f['id']] = ['ok' => $xml !== null && count($lidos) > 0, 'itens' => 0];
    foreach ($lidos as $it) {
      if ($it['titulo'] === '' || !preg_match('#^https://#', $it['link'])) continue;
      if (!empty($f['linkContem']) && strpos($it['link'], $f['linkContem']) === false) continue;
      $texto = $it['titulo'] . ' ' . $it['resumo'];
      if (preg_match('/^(Áudio|Vídeo|Video):/u', $it['titulo'])) continue;
      if (!empty($f['excluir']) && preg_match($EXCLUIR_RECEITA, $texto)) continue;
      $tema = '';
      foreach ($TEMAS as $nome => $re) if (preg_match($re, $texto)) { $tema = $nome; break; }
      if ($f['filtrar'] && $tema === '') continue;          // feed amplo: só o que fala de tributos/contabilidade
      $ts = strtotime($it['data']) ?: time();
      if ($ts < $limite) continue;
      $todos[] = [
        'id' => substr(sha1($it['link']), 0, 12),
        'titulo' => $it['titulo'],
        'resumo' => $it['resumo'],
        'link' => $it['link'],
        'data' => gmdate('c', $ts),
        'ts' => $ts,
        'fonte' => $f['nome'],
        'fonteId' => $f['id'],
        'oficial' => $f['oficial'],
        'tema' => $tema ?: 'Contabilidade',
        // foto só das fontes oficiais (licença aberta com crédito); as demais usam a capa do tema
        'imagem' => $f['oficial'] && !empty($f['fotos']) ? ($it['imagem'] ?? '') : '',
        'credito' => $f['oficial'] && !empty($f['fotos']) ? $f['nome'] : '',
      ];
      $status[$f['id']]['itens']++;
    }
    // fonte fora do ar: mantém as notícias que já tínhamos dela
    if (!$status[$f['id']]['ok']) foreach ($anterior as $a) if (($a['fonteId'] ?? '') === $f['id'] && $a['ts'] >= $limite) $todos[] = $a;
  }
  // sem repetidas (mesmo link ou mesmo título)
  $vistos = [];
  $unicos = [];
  usort($todos, fn($a, $b) => $b['ts'] <=> $a['ts']);
  foreach ($todos as $t) {
    $chave = mb_strtolower(preg_replace('/\W+/u', '', $t['titulo']));
    if (isset($vistos[$t['id']]) || isset($vistos[$chave])) continue;
    $vistos[$t['id']] = $vistos[$chave] = 1;
    $unicos[] = $t;
  }
  $unicos = array_slice($unicos, 0, MAX_ITENS);
  // capa oficial das matérias sem foto no feed: reaproveita a anterior; busca no máximo 12 novas por vez
  $jaTinha = [];
  foreach ($anterior as $a) if (!empty($a['imagem'])) $jaTinha[$a['id']] = $a['imagem'];
  $novas = 0;
  foreach ($unicos as &$u) {
    if ($u['imagem'] !== '' || $u['credito'] === '') continue;
    if (isset($jaTinha[$u['id']])) { $u['imagem'] = $jaTinha[$u['id']]; continue; }
    if ($novas >= 12) continue;
    $novas++;
    $u['imagem'] = capaDaPagina($u['link']);
  }
  unset($u);
  return ['atualizado' => gmdate('c'), 'status' => $status, 'itens' => $unicos];
}

try {
  $arq = pastaDados() . '/noticias.json';
  $cache = is_file($arq) ? json_decode((string) file_get_contents($arq), true) : null;
  // pela linha de comando (cron) sempre atualiza; na web, só se o cache passou de 2 horas
  $velho = PHP_SAPI === 'cli' || !$cache || (time() - filemtime($arq)) > IDADE_CACHE;
  if ($velho) {
    $trava = fopen(pastaDados() . '/noticias.lock', 'c');
    // só um visitante atualiza por vez; os outros recebem o cache atual
    if ($trava && flock($trava, LOCK_EX | LOCK_NB)) {
      @set_time_limit(90);
      $novo = atualizar($FONTES, $TEMAS, $EXCLUIR_RECEITA, $cache['itens'] ?? []);
      if (count($novo['itens']) > 0 || !$cache) {
        file_put_contents($arq . '.tmp', json_encode($novo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
        rename($arq . '.tmp', $arq);
        $cache = $novo;
      } else {
        touch($arq); // tudo falhou: tenta de novo daqui a 2 h, mantendo o que havia
      }
      flock($trava, LOCK_UN);
    }
  }
  $saida = $cache ?: ['atualizado' => null, 'itens' => []];
  $saida['fontes'] = array_map(fn($f) => ['id' => $f['id'], 'nome' => $f['nome'], 'oficial' => $f['oficial']], $FONTES);
  $saida['temas'] = array_keys($TEMAS);
  unset($saida['status']);
  if (PHP_SAPI === 'cli') { echo 'noticias: ' . count($saida['itens']) . " itens
"; exit; }
  responderJson($saida, 200, 600);
} catch (Throwable $e) {
  // pela linha de comando (cron) mostra o motivo no registro; na web, só "indisponível"
  if (PHP_SAPI === 'cli') { echo 'ERRO: ' . $e->getMessage() . ' em ' . basename($e->getFile()) . ':' . $e->getLine() . ' (PHP ' . PHP_VERSION . ")
"; exit(1); }
  responderJson(['atualizado' => null, 'itens' => [], 'erro' => 'indisponivel'], 503);
}

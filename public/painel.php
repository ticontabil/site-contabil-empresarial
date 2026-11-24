<?php
/**
 * /painel — acessos do site (dados do próprio servidor, sem cookies de visitantes).
 * Senha: painel-config.php (sal + HMAC, gerado no envio). Se não existir, usa a mesma senha da apresentação.
 */
declare(strict_types=1);
require __DIR__ . '/api/_comum.php';

header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');

const COOKIE_PAINEL = 'ce_painel';
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

function configSenha(): array {
  foreach ([__DIR__ . '/painel-config.php', __DIR__ . '/apresentacao-portao-config.php'] as $a) {
    if (is_file($a)) { $c = include $a; if (is_array($c) && strlen((string) ($c['sal'] ?? '')) >= 16 && preg_match('/^[a-f0-9]{64}$/', (string) ($c['hash'] ?? ''))) return $c; }
  }
  return [];
}
function assinar(int $exp, array $c): string { return hash_hmac('sha256', 'painel|' . $exp, salServidor() . $c['hash']); }
function logado(array $c): bool {
  if (!$c || !preg_match('/^(\d{10})\.([a-f0-9]{64})$/', (string) ($_COOKIE[COOKIE_PAINEL] ?? ''), $m)) return false;
  return (int) $m[1] > time() && hash_equals(assinar((int) $m[1], $c), $m[2]);
}
function tentativas(): array {
  $a = @json_decode((string) @file_get_contents(pastaDados() . '/painel-tentativas-' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . salServidor()) . '.json'), true);
  return array_values(array_filter(is_array($a) ? $a : [], fn($t) => is_int($t) && $t > time() - 900));
}
function erro(): int {
  $a = tentativas(); $a[] = time();
  @file_put_contents(pastaDados() . '/painel-tentativas-' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . salServidor()) . '.json', json_encode($a));
  return 5 - count($a);
}
$h = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');

$cfg = configSenha();
$msg = $cfg ? '' : 'Senha do painel ainda não configurada.';
if (isset($_GET['sair'])) { setcookie(COOKIE_PAINEL, '', ['expires' => time() - 3600, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']); header('Location: /painel', true, 303); exit; }
if ($cfg && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['pin'])) {
  if (count(tentativas()) >= 5) $msg = 'Muitas tentativas. Tente de novo em 15 minutos.';
  elseif (hash_equals($cfg['hash'], hash_hmac('sha256', preg_replace('/\D/', '', (string) $_POST['pin']), $cfg['sal']))) {
    $exp = time() + 30 * 86400;
    setcookie(COOKIE_PAINEL, $exp . '.' . assinar($exp, $cfg), ['expires' => $exp, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
    header('Location: /painel', true, 303); exit;
  } else { usleep(400000); $r = erro(); $msg = $r > 0 ? "Senha incorreta. Restam {$r} tentativa(s)." : 'Muitas tentativas. Tente de novo em 15 minutos.'; }
}

if (!logado($cfg)) {
  http_response_code(401);
  ?><!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Painel · Contábil Empresarial</title><link rel="icon" href="/favicon.ico">
<style>*{box-sizing:border-box;margin:0}body{min-height:100vh;display:grid;place-items:center;background:#0f0f10;color:#f4f4f5;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px}
main{width:min(380px,100%);display:flex;flex-direction:column;gap:22px;text-align:center}img{width:190px;margin:0 auto}h1{font-size:14px;letter-spacing:.24em;text-transform:uppercase;color:#a1a1aa;font-weight:600}
input{width:100%;font:600 28px inherit;letter-spacing:.4em;text-align:center;padding:16px;border-radius:14px;background:#18181b;border:1.5px solid #3f3f46;color:#fff;outline:none}input:focus{border-color:#e85d00}
button{width:100%;padding:16px;border-radius:999px;border:0;background:#e85d00;color:#fff;font:700 16px inherit;cursor:pointer}.erro{color:#fca5a5;font-size:14px}</style></head>
<body><main><img src="/logo-negative.png" alt="Contábil Empresarial"><h1>Painel de acessos</h1><?php if ($msg) echo '<p class="erro" role="alert">' . $h($msg) . '</p>'; ?>
<form method="post" autocomplete="off"><input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" aria-label="Senha" autofocus required><br><br><button>Entrar</button></form></main></body></html><?php
  exit;
}

// ---------------- dados ----------------
$dias = in_array((int) ($_GET['dias'] ?? 30), [7, 30, 90, 365], true) ? (int) ($_GET['dias'] ?? 30) : 30;
$fim = agoraBrasilia();
$ini = (clone $fim)->modify('-' . ($dias - 1) . ' days')->format('Y-m-d');
$iniAnt = (clone $fim)->modify('-' . (2 * $dias - 1) . ' days')->format('Y-m-d');
$db = banco();
$um = function (string $sql, array $p = []) use ($db) { $q = $db->prepare($sql); $q->execute($p); return $q->fetchColumn(); };
$lista = function (string $sql, array $p = []) use ($db) { $q = $db->prepare($sql); $q->execute($p); return $q->fetchAll(PDO::FETCH_ASSOC); };

$kpi = function (string $de, string $ate) use ($um) {
  return [
    'visitas' => (int) $um("SELECT COUNT(*) FROM eventos WHERE tipo='visita' AND dia BETWEEN ? AND ?", [$de, $ate]),
    'visitantes' => (int) $um("SELECT COUNT(*) FROM (SELECT DISTINCT dia, visitante FROM eventos WHERE tipo='visita' AND dia BETWEEN ? AND ?)", [$de, $ate]),
    'whatsapp' => (int) $um("SELECT COUNT(*) FROM eventos WHERE tipo='whatsapp' AND dia BETWEEN ? AND ?", [$de, $ate]),
    'candidaturas' => (int) $um("SELECT COUNT(*) FROM eventos WHERE tipo='candidatura' AND dia BETWEEN ? AND ?", [$de, $ate]),
  ];
};
$hojeStr = $fim->format('Y-m-d');
$fimAnt = (clone $fim)->modify("-{$dias} days")->format('Y-m-d');
$k = $kpi($ini, $hojeStr);
$kAnt = $kpi($iniAnt, $fimAnt);
$hoje = $kpi($hojeStr, $hojeStr);
$taxa = $k['visitantes'] ? round(100 * $k['whatsapp'] / $k['visitantes'], 1) : 0;

// série diária (dias sem dado = 0)
$porDia = [];
foreach ($lista("SELECT dia, SUM(tipo='visita') v, SUM(tipo='whatsapp') w FROM eventos WHERE dia BETWEEN ? AND ? GROUP BY dia", [$ini, $hojeStr]) as $r) $porDia[$r['dia']] = $r;
$serie = [];
for ($d = new DateTime($ini); $d->format('Y-m-d') <= $hojeStr; $d->modify('+1 day')) {
  $x = $d->format('Y-m-d');
  $serie[] = ['dia' => $x, 'v' => (int) ($porDia[$x]['v'] ?? 0), 'w' => (int) ($porDia[$x]['w'] ?? 0)];
}
$p = [$ini, $hojeStr];
$paginas = $lista("SELECT pagina n, COUNT(*) c FROM eventos WHERE tipo='visita' AND dia BETWEEN ? AND ? GROUP BY pagina ORDER BY c DESC LIMIT 10", $p);
$origens = $lista("SELECT CASE WHEN anuncio='google' THEN 'Google Ads' WHEN anuncio='meta' THEN 'Meta Ads' WHEN origem LIKE '%google.%' THEN 'Google (busca)' WHEN origem LIKE '%instagram%' THEN 'Instagram' WHEN origem LIKE '%facebook%' THEN 'Facebook' WHEN origem='direto' THEN 'Direto / WhatsApp / favoritos' ELSE origem END n, COUNT(*) c FROM eventos WHERE tipo='visita' AND dia BETWEEN ? AND ? GROUP BY n ORDER BY c DESC LIMIT 10", $p);
$campanhas = $lista("SELECT utm_source || ' / ' || utm_campaign n, COUNT(*) c FROM eventos WHERE tipo='visita' AND utm_source <> '' AND dia BETWEEN ? AND ? GROUP BY n ORDER BY c DESC LIMIT 10", $p);
$aparelhos = $lista("SELECT aparelho n, COUNT(*) c FROM eventos WHERE tipo='visita' AND dia BETWEEN ? AND ? GROUP BY aparelho ORDER BY c DESC", $p);
$botoes = $lista("SELECT CASE WHEN rotulo='' THEN '(sem texto)' ELSE rotulo END n, COUNT(*) c FROM eventos WHERE tipo='whatsapp' AND dia BETWEEN ? AND ? GROUP BY n ORDER BY c DESC LIMIT 10", $p);
$whatsPag = $lista("SELECT pagina n, COUNT(*) c FROM eventos WHERE tipo='whatsapp' AND dia BETWEEN ? AND ? GROUP BY pagina ORDER BY c DESC LIMIT 6", $p);
$cookies = $lista("SELECT tipo n, COUNT(*) c FROM eventos WHERE tipo IN ('cookies-aceitos','cookies-recusados') AND dia BETWEEN ? AND ? GROUP BY tipo", $p);

$fmt = fn($n) => number_format((float) $n, 0, ',', '.');
$var = function ($a, $b) { if (!$b) return $a ? ['novo', 'sobe'] : ['—', '']; $v = round(100 * ($a - $b) / $b); return [($v > 0 ? '+' : '') . $v . '%', $v >= 0 ? 'sobe' : 'desce']; };
$nomePagina = function (string $p) {
  $m = ['/' => 'Página inicial', '/trabalheconosco' => 'Trabalhe Conosco', '/noticias' => 'Notícias', '/privacidade' => 'Política de Privacidade'];
  if (isset($m[$p])) return $m[$p];
  if (strpos($p, '/noticia?') === 0 || $p === '/noticia') return 'Notícia aberta no site';
  return $p;
};
function barras(array $linhas, ?callable $nome = null): string {
  if (!$linhas) return '<p class="vazio">Sem dados no período.</p>';
  $max = max(array_column($linhas, 'c')) ?: 1;
  $o = '<ul class="barras">';
  foreach ($linhas as $l) {
    $n = htmlspecialchars($nome ? $nome($l['n']) : (string) $l['n'], ENT_QUOTES, 'UTF-8');
    $pct = round(100 * $l['c'] / $max, 1);
    $o .= "<li><div class=\"rot\"><span>{$n}</span><b>" . number_format((float) $l['c'], 0, ',', '.') . "</b></div><div class=\"trilho\"><i style=\"width:{$pct}%\"></i></div></li>";
  }
  return $o . '</ul>';
}
$titulosDias = [7 => '7 dias', 30 => '30 dias', 90 => '90 dias', 365 => '12 meses'];
?><!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Painel de acessos · Contábil Empresarial</title><link rel="icon" href="/favicon.ico">
<style>
:root{--fundo:#0f0f10;--cartao:#18181b;--borda:#27272a;--texto:#f4f4f5;--texto2:#a1a1aa;--texto3:#71717a;--laranja:#e85d00;--azul:#3b82f6;--verde:#4ade80;--vermelho:#f87171}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--fundo);color:var(--texto);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:15px;line-height:1.45}
header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:18px max(16px,calc((100vw - 1200px)/2));border-bottom:1px solid var(--borda);position:sticky;top:0;background:rgba(15,15,16,.92);backdrop-filter:blur(10px);z-index:5}
header img{height:38px}header nav{display:flex;gap:6px;flex-wrap:wrap}header nav a{color:var(--texto2);text-decoration:none;padding:8px 14px;border-radius:999px;border:1px solid var(--borda);font-size:14px;font-weight:600}
header nav a.on{background:var(--laranja);border-color:var(--laranja);color:#fff}.sair{color:var(--texto3);font-size:13px}
main{max-width:1200px;margin:0 auto;padding:24px 16px 60px;display:grid;gap:18px}
h1{font-size:22px;font-weight:700}.sub{color:var(--texto2);font-size:14px;margin-top:4px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
.kpi{background:var(--cartao);border:1px solid var(--borda);border-radius:16px;padding:18px}.kpi .l{color:var(--texto2);font-size:13px;font-weight:600}
.kpi .v{font-size:34px;font-weight:700;letter-spacing:-.02em;margin-top:6px;font-variant-numeric:tabular-nums}.kpi .c{font-size:13px;color:var(--texto3);margin-top:4px}
.sobe{color:var(--verde)}.desce{color:var(--vermelho)}
.grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:18px}
.cartao{background:var(--cartao);border:1px solid var(--borda);border-radius:16px;padding:20px}.cartao h2{font-size:15px;font-weight:700}.cartao .d{color:var(--texto3);font-size:13px;margin-top:2px}
.grafico{position:relative;margin-top:14px}.grafico svg{width:100%;height:220px;display:block;overflow:visible}
.dica{position:absolute;pointer-events:none;background:#09090b;border:1px solid var(--borda);border-radius:10px;padding:8px 10px;font-size:13px;white-space:nowrap;transform:translate(-50%,-110%);display:none}
.barras{list-style:none;margin-top:14px;display:grid;gap:12px}.barras .rot{display:flex;justify-content:space-between;gap:12px;font-size:14px}.barras .rot span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--texto2)}
.barras b{font-variant-numeric:tabular-nums}.trilho{height:8px;background:#232326;border-radius:999px;margin-top:6px;overflow:hidden}.trilho i{display:block;height:100%;background:var(--laranja);border-radius:999px}
.vazio{color:var(--texto3);margin-top:14px;font-size:14px}.links{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.links a{color:var(--texto);text-decoration:none;border:1px solid var(--borda);border-radius:10px;padding:10px 14px;font-size:14px;font-weight:600}
.nota{color:var(--texto3);font-size:13px}
table.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
</style>
</head>
<body>
<header>
  <img src="/logo-negative.png" alt="Contábil Empresarial">
  <nav aria-label="Período"><?php foreach ($titulosDias as $n => $t) echo '<a href="?dias=' . $n . '" class="' . ($n === $dias ? 'on' : '') . '">' . $t . '</a>'; ?></nav>
  <a class="sair" href="?sair=1">Sair</a>
</header>
<main>
  <div><h1>Acessos do site</h1><p class="sub">Últimos <?= $titulosDias[$dias] ?> (<?= $h(date('d/m', strtotime($ini))) ?> a <?= $h($fim->format('d/m/Y')) ?>) · comparado com os <?= $titulosDias[$dias] ?> anteriores · hoje: <?= $fmt($hoje['visitas']) ?> visitas</p></div>

  <section class="kpis" aria-label="Resumo">
    <?php foreach ([['Visitas', 'visitas', 'páginas abertas'], ['Visitantes', 'visitantes', 'pessoas diferentes por dia'], ['Cliques no WhatsApp', 'whatsapp', "{$taxa}% dos visitantes"], ['Candidaturas', 'candidaturas', 'Trabalhe Conosco']] as [$l, $c, $d]) { [$vtxt, $vcls] = $var($k[$c], $kAnt[$c]); ?>
      <div class="kpi"><div class="l"><?= $l ?></div><div class="v"><?= $fmt($k[$c]) ?></div><div class="c"><span class="<?= $vcls ?>"><?= $vtxt ?></span> · <?= $h($d) ?></div></div>
    <?php } ?>
  </section>

  <section class="cartao">
    <h2>Visitas por dia</h2><p class="d">Passe o mouse ou o dedo sobre o gráfico para ver cada dia.</p>
    <div class="grafico" data-serie="v" data-cor="var(--laranja)" data-tipo="linha"><svg role="img" aria-label="Visitas por dia"></svg><div class="dica"></div></div>
  </section>
  <section class="cartao">
    <h2>Cliques no WhatsApp por dia</h2><p class="d">Cada clique em "Falar com especialista", "Abra sua empresa" e demais botões.</p>
    <div class="grafico" data-serie="w" data-cor="var(--azul)" data-tipo="barra"><svg role="img" aria-label="Cliques no WhatsApp por dia"></svg><div class="dica"></div></div>
  </section>

  <div class="grade">
    <section class="cartao"><h2>De onde vêm as visitas</h2><p class="d">Busca, redes sociais, anúncios ou acesso direto</p><?= barras($origens) ?></section>
    <section class="cartao"><h2>Páginas mais vistas</h2><?= barras($paginas, $nomePagina) ?></section>
    <section class="cartao"><h2>Botões de WhatsApp mais clicados</h2><?= barras($botoes) ?></section>
    <section class="cartao"><h2>Páginas que mais geraram WhatsApp</h2><?= barras($whatsPag, $nomePagina) ?></section>
    <section class="cartao"><h2>Aparelhos</h2><?= barras(array_map(fn($a) => ['n' => ucfirst($a['n']), 'c' => $a['c']], $aparelhos)) ?></section>
    <section class="cartao"><h2>Campanhas (links com utm)</h2><p class="d">Origem / campanha dos links que vocês usam nos anúncios</p><?= barras($campanhas) ?></section>
  </div>

  <section class="cartao">
    <h2>Google e Meta</h2>
    <p class="d">Estes números contam todas as visitas, sem cookies. O Google Analytics e o Pixel da Meta só contam quem aceitou os cookies, por isso mostram números menores.
    <?php $ac = 0; $rc = 0; foreach ($cookies as $c) { if ($c['n'] === 'cookies-aceitos') $ac = (int) $c['c']; else $rc = (int) $c['c']; } if ($ac + $rc) echo ' No período, ' . round(100 * $ac / ($ac + $rc)) . '% aceitaram os cookies.'; ?></p>
    <div class="links">
      <a href="https://analytics.google.com/" target="_blank" rel="noopener">Abrir Google Analytics ↗</a>
      <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener">Abrir Gerenciador de Eventos da Meta ↗</a>
      <a href="https://ads.google.com/" target="_blank" rel="noopener">Abrir Google Ads ↗</a>
    </div>
  </section>
  <p class="nota">Sem IP e sem cookies: cada visitante vira um código que muda todo dia. Os dados ficam no servidor do site por 13 meses.</p>
</main>
<table class="sr"><caption>Visitas e cliques no WhatsApp por dia</caption><thead><tr><th>Dia</th><th>Visitas</th><th>WhatsApp</th></tr></thead><tbody>
<?php foreach ($serie as $s) echo '<tr><td>' . $h($s['dia']) . '</td><td>' . $s['v'] . '</td><td>' . $s['w'] . '</td></tr>'; ?></tbody></table>
<script type="application/json" id="serie"><?= json_encode($serie) ?></script>
<script>
(function () {
  const serie = JSON.parse(document.getElementById("serie").textContent);
  const ns = "http://www.w3.org/2000/svg";
  const fmtDia = (d) => { const [a, m, dd] = d.split("-"); return dd + "/" + m; };
  document.querySelectorAll(".grafico").forEach((g) => {
    const chave = g.dataset.serie, cor = g.dataset.cor, tipo = g.dataset.tipo;
    const svg = g.querySelector("svg"), dica = g.querySelector(".dica");
    const desenhar = () => {
      svg.innerHTML = "";
      const W = svg.clientWidth || 600, H = 220, E = 36, B = 26, T = 10;
      const vals = serie.map((s) => s[chave]);
      const max = Math.max(4, ...vals);
      const passo = Math.pow(10, Math.floor(Math.log10(max))); const topo = Math.ceil(max / passo) * passo;
      const x = (i) => E + (serie.length === 1 ? (W - E) / 2 : (i * (W - E - 6)) / (serie.length - 1));
      const y = (v) => T + (H - T - B) * (1 - v / topo);
      const el = (n, a) => { const e = document.createElementNS(ns, n); for (const k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; };
      // grade recessiva + eixo
      for (let i = 0; i <= 4; i++) {
        const v = (topo * i) / 4, yy = y(v);
        el("line", { x1: E, x2: W, y1: yy, y2: yy, stroke: "#27272a", "stroke-width": 1 });
        const t = el("text", { x: E - 8, y: yy + 4, "text-anchor": "end", fill: "#71717a", "font-size": 11 }); t.textContent = Math.round(v).toLocaleString("pt-BR");
      }
      const marcas = Math.min(serie.length, W < 500 ? 5 : 8);
      for (let j = 0; j < marcas; j++) {
        const i = Math.round((j * (serie.length - 1)) / Math.max(1, marcas - 1));
        const t = el("text", { x: x(i), y: H - 6, "text-anchor": "middle", fill: "#71717a", "font-size": 11 }); t.textContent = fmtDia(serie[i].dia);
      }
      if (tipo === "barra") {
        const larg = Math.max(2, Math.min(18, (W - E) / serie.length - 2));
        serie.forEach((s, i) => { if (!s[chave]) return; const yy = y(s[chave]); el("rect", { x: x(i) - larg / 2, y: yy, width: larg, height: y(0) - yy, rx: Math.min(4, larg / 2), fill: cor }); });
      } else {
        const pts = serie.map((s, i) => x(i) + "," + y(s[chave])).join(" ");
        el("polygon", { points: x(0) + "," + y(0) + " " + pts + " " + x(serie.length - 1) + "," + y(0), fill: cor, opacity: 0.12 });
        el("polyline", { points: pts, fill: "none", stroke: cor, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" });
      }
      const mira = el("line", { y1: T, y2: y(0), stroke: "#a1a1aa", "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0 });
      const ponto = el("circle", { r: 5, fill: cor, stroke: "#18181b", "stroke-width": 2, opacity: 0 });
      const alvo = el("rect", { x: E, y: 0, width: W - E, height: H, fill: "transparent" });
      const mover = (cx) => {
        const r = svg.getBoundingClientRect(); const px = ((cx - r.left) / r.width) * W;
        const i = Math.max(0, Math.min(serie.length - 1, Math.round(((px - E) / (W - E - 6)) * (serie.length - 1))));
        const s = serie[i];
        mira.setAttribute("x1", x(i)); mira.setAttribute("x2", x(i)); mira.setAttribute("opacity", 1);
        ponto.setAttribute("cx", x(i)); ponto.setAttribute("cy", y(s[chave])); ponto.setAttribute("opacity", 1);
        dica.style.display = "block"; dica.style.left = (x(i) / W) * 100 + "%"; dica.style.top = (y(s[chave]) / H) * 220 + "px";
        dica.innerHTML = "<b>" + fmtDia(s.dia) + "</b> · " + s[chave].toLocaleString("pt-BR") + (chave === "v" ? " visitas" : " cliques");
      };
      const sair = () => { mira.setAttribute("opacity", 0); ponto.setAttribute("opacity", 0); dica.style.display = "none"; };
      alvo.addEventListener("pointermove", (e) => mover(e.clientX));
      alvo.addEventListener("pointerdown", (e) => mover(e.clientX));
      alvo.addEventListener("pointerleave", sair);
    };
    desenhar();
    addEventListener("resize", desenhar);
  });
})();
</script>
</body>
</html>

<?php
/**
 * Recebe os eventos do site (visita, clique no WhatsApp, candidatura) para o painel /painel.
 * Sem cookies e sem guardar IP: o "visitante" é um código que muda todo dia
 * (HMAC de IP + navegador + dia com um sal secreto do servidor), só para contar pessoas diferentes.
 */
declare(strict_types=1);
require __DIR__ . '/_comum.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { responderJson(['ok' => false], 405); exit; }

$ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
// robôs e visualizações automáticas não contam
if ($ua === '' || preg_match('/bot|crawl|spider|slurp|headless|lighthouse|pingdom|preview|facebookexternalhit|whatsapp|monitor|curl|wget|python|httpclient/i', $ua)) {
  responderJson(['ok' => true, 'ignorado' => 'robo']); exit;
}

$corpo = (string) file_get_contents('php://input', false, null, 0, 4096);
$d = json_decode($corpo, true);
if (!is_array($d)) { responderJson(['ok' => false], 400); exit; }

$tipos = ['visita', 'whatsapp', 'candidatura', 'cookies-aceitos', 'cookies-recusados'];
$tipo = (string) ($d['t'] ?? '');
if (!in_array($tipo, $tipos, true)) { responderJson(['ok' => false], 400); exit; }

$limpa = fn($v, int $max) => mb_substr(trim(preg_replace('/[\x00-\x1F\x7F]/u', '', (string) $v)), 0, $max);
$pagina = $limpa($d['p'] ?? '/', 200);
if ($pagina === '' || $pagina[0] !== '/') $pagina = '/';

// origem = só o domínio (sem caminho nem parâmetros)
$origem = 'direto';
$ref = (string) ($d['r'] ?? '');
if ($ref !== '') {
  $host = strtolower((string) parse_url($ref, PHP_URL_HOST));
  $host = preg_replace('/^(www|m|l|lm|out)\./', '', $host);
  $meuHost = preg_replace('/^www\./', '', strtolower((string) ($_SERVER['HTTP_HOST'] ?? '')));
  if ($host !== '' && $host !== $meuHost) $origem = mb_substr($host, 0, 80);
}

$larg = (int) ($d['w'] ?? 0);
$aparelho = $larg > 0 && $larg < 768 ? 'celular' : ($larg >= 768 && $larg < 1100 ? 'tablet' : 'computador');
$anuncio = !empty($d['g']) ? 'google' : (!empty($d['f']) ? 'meta' : '');

$agora = agoraBrasilia();
$dia = $agora->format('Y-m-d');
$ip = (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '');
$ip = trim(explode(',', $ip)[0]);
$visitante = substr(hash_hmac('sha256', $ip . '|' . $ua . '|' . $dia, salServidor()), 0, 16);

try {
  $db = banco();
  // limite simples: no máximo 120 eventos por visitante por dia
  $q = $db->prepare('SELECT COUNT(*) FROM eventos WHERE dia = ? AND visitante = ?');
  $q->execute([$dia, $visitante]);
  if ((int) $q->fetchColumn() >= 120) { responderJson(['ok' => true, 'ignorado' => 'limite']); exit; }

  $ins = $db->prepare('INSERT INTO eventos (ts, dia, tipo, pagina, origem, utm_source, utm_medium, utm_campaign, anuncio, aparelho, rotulo, visitante)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  $ins->execute([time(), $dia, $tipo, $pagina, $origem, $limpa($d['us'] ?? '', 60), $limpa($d['um'] ?? '', 60), $limpa($d['uc'] ?? '', 80),
    $anuncio, $aparelho, $limpa($d['l'] ?? '', 80), $visitante]);

  // guarda só 13 meses (limpeza de vez em quando)
  if (random_int(1, 200) === 1) $db->exec("DELETE FROM eventos WHERE ts < " . (time() - 400 * 86400));
  responderJson(['ok' => true]);
} catch (Throwable $e) {
  responderJson(['ok' => false], 500);
}

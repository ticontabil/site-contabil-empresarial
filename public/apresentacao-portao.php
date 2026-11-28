<?php
/**
 * Portão da apresentação (Hostgator / Apache + PHP).
 * O .htaccess manda TODO pedido que começa com /apresentacao para este arquivo. Sem a senha, nada da
 * apresentação sai do servidor: nem a página, nem os vídeos, nem o modo apresentador ou a configuração.
 * Com a senha certa, o aparelho recebe um cookie assinado que vale 30 dias (e a apresentação continua
 * funcionando sem internet pelo cache do próprio aparelho).
 *
 * A senha NÃO fica no código: o envio pelo GitHub (deploy-hostgator-ftp.yml) lê o secret APRESENTACAO_PIN
 * e grava apresentacao-portao-config.php no servidor só com o sal e o HMAC-SHA256 da senha.
 * Sem esse arquivo, ninguém entra (o portão fica fechado). Trocar a senha = trocar o secret e enviar de novo;
 * isso também derruba os acessos já liberados.
 */
declare(strict_types=1);

$config = is_file(__DIR__ . '/apresentacao-portao-config.php') ? include __DIR__ . '/apresentacao-portao-config.php' : null;
define('PIN_SAL', is_array($config) ? (string) ($config['sal'] ?? '') : '');
define('PIN_HASH', is_array($config) ? (string) ($config['hash'] ?? '') : '');
const COOKIE = 'ce_apresentacao';
const VALIDADE = 2592000;      // 30 dias
const TENTATIVAS = 5;          // erros permitidos...
const JANELA = 900;            // ...a cada 15 minutos, por endereço IP

$raiz = __DIR__;
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

function cabecalhosBase(): void {
  header('X-Robots-Tag: noindex, nofollow, noarchive');
  header('X-Content-Type-Options: nosniff');
  header('Referrer-Policy: same-origin');
  header('X-Frame-Options: SAMEORIGIN');
}

/** Chave secreta do servidor para assinar o cookie: criada na primeira vez, fica fora do alcance do navegador. */
function chave(): string {
  $arq = __DIR__ . '/.portao-chave.php';
  if (is_file($arq)) {
    $k = include $arq;
    if (is_string($k) && strlen($k) >= 32) return $k;
  }
  $k = bin2hex(random_bytes(32));
  if (@file_put_contents($arq, "<?php return '" . $k . "';\n", LOCK_EX) === false) {
    // sem permissão de escrita: deriva uma chave estável do próprio servidor
    $k = hash('sha256', PIN_HASH . __DIR__ . php_uname() . (string) @filemtime(__FILE__));
  }
  return $k;
}

function assinatura(int $expira): string {
  return hash_hmac('sha256', (string) $expira, chave() . PIN_HASH);
}

function liberado(): bool {
  if (strlen(PIN_SAL) < 16 || !preg_match('/^[a-f0-9]{64}$/', PIN_HASH)) return false;
  $c = $_COOKIE[COOKIE] ?? '';
  if (!preg_match('/^(\d{10})\.([a-f0-9]{64})$/', $c, $m)) return false;
  $expira = (int) $m[1];
  return $expira > time() && hash_equals(assinatura($expira), $m[2]);
}

function gravarCookie(string $valor, int $expira, bool $https): void {
  setcookie(COOKIE, $valor, ['expires' => $expira, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
}

// ---------- tentativas (contra quem tenta adivinhar a senha) ----------
function arquivoTentativas(): string {
  $ip = $_SERVER['REMOTE_ADDR'] ?? '0';
  return sys_get_temp_dir() . '/ce-portao-' . hash('sha256', $ip . PIN_SAL) . '.json';
}
function tentativasRecentes(): array {
  $a = @json_decode((string) @file_get_contents(arquivoTentativas()), true);
  $agora = time();
  return array_values(array_filter(is_array($a) ? $a : [], fn($t) => is_int($t) && $t > $agora - JANELA));
}
function registrarErro(): array {
  $a = tentativasRecentes();
  $a[] = time();
  @file_put_contents(arquivoTentativas(), json_encode($a), LOCK_EX);
  return $a;
}
function limparTentativas(): void { @unlink(arquivoTentativas()); }

// ---------- pedido ----------
$pedido = (string) ($_GET['arquivo'] ?? 'apresentacao');
$pedido = trim(str_replace('\\', '/', $pedido), '/');
// /novo = versão nova do site em construção (mesma senha da apresentação até virar a página principal)
if ($pedido === '' || strpos($pedido, '..') !== false || !preg_match('#^(apresentacao|novo)[A-Za-z0-9/_.\-]*$#', $pedido)) {
  http_response_code(404);
  exit;
}

// sair (bloquear este aparelho)
if (isset($_GET['sair'])) {
  gravarCookie('', time() - 3600, $https);
  header('Location: ' . (strpos($pedido, 'novo') === 0 ? '/novo' : '/apresentacao'), true, 303);
  exit;
}

$erro = '';
$semSenha = strlen(PIN_SAL) < 16 || !preg_match('/^[a-f0-9]{64}$/', PIN_HASH);
if ($semSenha) $erro = 'Acesso ainda não configurado.';
if (!$semSenha && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' && isset($_POST['pin'])) {
  $recentes = tentativasRecentes();
  if (count($recentes) >= TENTATIVAS) {
    $espera = (int) ceil(($recentes[0] + JANELA - time()) / 60);
    $erro = "Muitas tentativas. Tente de novo em {$espera} min.";
  } elseif (hash_equals(PIN_HASH, hash_hmac('sha256', preg_replace('/\D/', '', (string) $_POST['pin']), PIN_SAL))) {
    limparTentativas();
    $expira = time() + VALIDADE;
    gravarCookie($expira . '.' . assinatura($expira), $expira, $https);
    $volta = (string) ($_SERVER['REQUEST_URI'] ?? '/apresentacao');
    if (strpos($volta, '/apresentacao') !== 0 && strpos($volta, '/novo') !== 0) $volta = '/apresentacao';
    header('Location: ' . $volta, true, 303);
    exit;
  } else {
    usleep(400000);
    $restam = TENTATIVAS - count(registrarErro());
    $erro = $restam > 0 ? "Senha incorreta. Restam {$restam} tentativa(s)." : 'Muitas tentativas. Tente de novo em 15 min.';
  }
}

if (!liberado()) {
  cabecalhosBase();
  header('Cache-Control: no-store');
  $ehPagina = strpos((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'text/html') !== false || preg_match('#^(apresentacao(/configurar|/apresentador)?|novo)(\.html)?$#', $pedido);
  if (!$ehPagina) { http_response_code(401); exit; }
  http_response_code(401);
  mostrarPortao($erro);
  exit;
}

// ---------- liberado: entrega o arquivo pedido ----------
$candidatos = [$pedido, $pedido . '.html'];
$arquivo = null;
foreach ($candidatos as $c) {
  $real = realpath($raiz . '/' . $c);
  if ($real && is_file($real) && strpos($real, realpath($raiz) . DIRECTORY_SEPARATOR) === 0 && strpos(basename($real), '.') !== 0) { $arquivo = $real; break; }
}
if (!$arquivo || substr($arquivo, -4) === '.php') { http_response_code(404); cabecalhosBase(); exit; }

$tipos = [
  'html' => 'text/html; charset=utf-8', 'js' => 'text/javascript; charset=utf-8', 'css' => 'text/css; charset=utf-8',
  'json' => 'application/json', 'svg' => 'image/svg+xml', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
  'webp' => 'image/webp', 'avif' => 'image/avif', 'mp4' => 'video/mp4', 'webm' => 'video/webm', 'woff2' => 'font/woff2',
];
$ext = strtolower(pathinfo($arquivo, PATHINFO_EXTENSION));
cabecalhosBase();
header('Content-Type: ' . ($tipos[$ext] ?? 'application/octet-stream'));
header('Cache-Control: ' . ($ext === 'html' || $ext === 'js' ? 'private, no-cache' : 'private, max-age=86400'));
if (basename($arquivo) === 'apresentacao-sw.js') header('Service-Worker-Allowed: /apresentacao');
header('Accept-Ranges: bytes');

$tamanho = filesize($arquivo);
$inicio = 0;
$fim = $tamanho - 1;
// pedaços do arquivo (o Safari do iPad pede o vídeo assim)
if (isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $r)) {
  if ($r[1] === '' && $r[2] !== '') { $inicio = max(0, $tamanho - (int) $r[2]); }
  else { $inicio = (int) $r[1]; if ($r[2] !== '') $fim = min((int) $r[2], $tamanho - 1); }
  if ($inicio > $fim || $inicio >= $tamanho) {
    http_response_code(416);
    header("Content-Range: bytes */{$tamanho}");
    exit;
  }
  http_response_code(206);
  header("Content-Range: bytes {$inicio}-{$fim}/{$tamanho}");
}
header('Content-Length: ' . ($fim - $inicio + 1));
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD') exit;

$f = fopen($arquivo, 'rb');
fseek($f, $inicio);
$falta = $fim - $inicio + 1;
while ($falta > 0 && !feof($f)) {
  $bloco = fread($f, (int) min(65536, $falta));
  echo $bloco;
  $falta -= strlen($bloco);
  if (connection_aborted()) break;
}
fclose($f);
exit;

// ---------- página da senha ----------
function mostrarPortao(string $erro): void {
  $erroHtml = $erro !== '' ? '<p class="erro" role="alert">' . htmlspecialchars($erro, ENT_QUOTES, 'UTF-8') . '</p>' : '';
  echo <<<HTML
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#000000">
<title>Acesso restrito · Contábil Empresarial</title>
<link rel="icon" href="/favicon.ico">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;background:#000;color:#fff;font-family:Montserrat,system-ui,-apple-system,"Segoe UI",sans-serif}
  body{display:grid;place-items:center;overflow:hidden;padding:24px}
  .luz{position:fixed;left:50%;top:50%;width:120vmax;height:120vmax;margin:-60vmax 0 0 -60vmax;border-radius:50%;
    background:radial-gradient(closest-side,rgba(251,93,2,.18),rgba(143,53,1,.06) 45%,transparent 70%);pointer-events:none}
  main{position:relative;width:min(420px,100%);display:flex;flex-direction:column;align-items:center;gap:26px;text-align:center}
  img{width:220px;height:auto}
  h1{font-size:15px;font-weight:700;letter-spacing:.28em;color:#9a9a9a;text-transform:uppercase}
  form{width:100%;display:flex;flex-direction:column;gap:16px}
  input{width:100%;font:700 34px/1 inherit;letter-spacing:.5em;text-align:center;padding:18px 10px 18px 26px;border-radius:18px;
    background:#141414;color:#fff;border:1.5px solid #2c2c2c;outline:none}
  input:focus{border-color:#fb5d02}
  button{font:700 17px inherit;padding:18px;border-radius:999px;border:0;background:#fb5d02;color:#fff;cursor:pointer}
  .erro{color:#ff6b5a;font-size:15px;font-weight:600}
  small{color:#6a6a6a;font-size:13px;line-height:1.5}
</style>
</head>
<body>
<div class="luz"></div>
<main>
  <img src="/logo-negative.png" alt="Contábil Empresarial" width="568" height="229">
  <h1>Acesso restrito</h1>
  {$erroHtml}
  <form method="post" autocomplete="off">
    <input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="12" placeholder="•••••" aria-label="Senha" autofocus required>
    <button type="submit">Entrar</button>
  </form>
  <small>Uso interno da Contábil Empresarial.</small>
</main>
</body>
</html>
HTML;
}

<?php
/**
 * Funções comuns da parte de servidor do site (Hostgator: Apache + PHP 7.4+).
 * Os dados (visitas e cache de notícias) ficam FORA da pasta pública quando possível
 * (/home/<usuario>/dados-site); se não der, numa pasta protegida dentro do site.
 */
declare(strict_types=1);

if (!defined('SITE_COMUM')) {
  define('SITE_COMUM', 1);

  function pastaDados(): string {
    static $pasta = null;
    if ($pasta !== null) return $pasta;
    $raiz = rtrim((string) ($_SERVER['DOCUMENT_ROOT'] ?? dirname(__DIR__)), '/\\');
    $candidatas = [dirname($raiz) . '/dados-site', $raiz . '/api/_dados'];
    foreach ($candidatas as $c) {
      if (!is_dir($c)) @mkdir($c, 0750, true);
      if (is_dir($c) && is_writable($c)) {
        // dentro do site: bloqueia acesso pelo navegador
        if (strpos($c, $raiz) === 0 && !is_file($c . '/.htaccess')) @file_put_contents($c . '/.htaccess', "Require all denied\nDeny from all\n");
        return $pasta = $c;
      }
    }
    throw new RuntimeException('Sem pasta de dados gravável.');
  }

  function banco(): PDO {
    static $db = null;
    if ($db) return $db;
    $db = new PDO('sqlite:' . pastaDados() . '/medicao.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
    $db->exec('CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,           -- unix, horário do servidor
      dia TEXT NOT NULL,             -- AAAA-MM-DD (horário de Brasília)
      tipo TEXT NOT NULL,            -- visita | whatsapp | candidatura | cookies-aceitos | cookies-recusados
      pagina TEXT NOT NULL,
      origem TEXT NOT NULL,          -- domínio de onde veio (google.com, instagram.com…) ou "direto"
      utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
      anuncio TEXT,                  -- google | meta | "" (gclid/fbclid no link)
      aparelho TEXT NOT NULL,        -- celular | tablet | computador
      rotulo TEXT,                   -- texto do botão clicado
      visitante TEXT NOT NULL        -- código diário anônimo (não identifica a pessoa)
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_eventos_dia ON eventos(dia, tipo)');
    return $db;
  }

  /** Sal secreto do servidor (criado na 1ª vez, guardado fora do alcance do navegador). */
  function salServidor(): string {
    $arq = pastaDados() . '/sal.txt';
    $s = is_file($arq) ? trim((string) file_get_contents($arq)) : '';
    if (strlen($s) < 32) { $s = bin2hex(random_bytes(32)); @file_put_contents($arq, $s, LOCK_EX); }
    return $s;
  }

  function responderJson($dados, int $status = 200, int $cacheSeg = 0): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Robots-Tag: noindex');
    header($cacheSeg > 0 ? "Cache-Control: public, max-age={$cacheSeg}" : 'Cache-Control: no-store');
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  }

  function agoraBrasilia(): DateTime { return new DateTime('now', new DateTimeZone('America/Sao_Paulo')); }
}

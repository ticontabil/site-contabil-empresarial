# Abre a apresentação neste computador, sem instalar nada e sem internet.
# Serve a pasta "site" em http://localhost:4400 e abre o navegador. Feche esta janela para encerrar.
$ErrorActionPreference = "Stop"
$raiz = Join-Path $PSScriptRoot "site"
$porta = 4400
$tipos = @{
  ".html" = "text/html; charset=utf-8"; ".js" = "text/javascript; charset=utf-8"; ".css" = "text/css; charset=utf-8"
  ".json" = "application/json"; ".svg" = "image/svg+xml"; ".png" = "image/png"; ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"
  ".webp" = "image/webp"; ".avif" = "image/avif"; ".ico" = "image/x-icon"; ".woff2" = "font/woff2"; ".woff" = "font/woff"
  ".mp4" = "video/mp4"; ".webm" = "video/webm"; ".xml" = "application/xml"
}
$ouvinte = New-Object System.Net.HttpListener
$ouvinte.Prefixes.Add("http://localhost:$porta/")
try { $ouvinte.Start() } catch {
  Write-Host "A porta $porta já está em uso. Se a apresentação já estiver aberta, use o navegador." -ForegroundColor Yellow
  Start-Process "http://localhost:$porta/apresentacao"; Read-Host "Enter para sair"; exit
}
Write-Host ""
Write-Host "  Apresentação Contábil Empresarial" -ForegroundColor DarkYellow
Write-Host "  Aberta em http://localhost:$porta/apresentacao"
Write-Host "  Modo apresentador: tecla N  |  Tela cheia: tecla F"
Write-Host "  Para encerrar, feche esta janela."
Write-Host ""
Start-Process "http://localhost:$porta/apresentacao"
while ($ouvinte.IsListening) {
  $ctx = $ouvinte.GetContext()
  $res = $ctx.Response
  try {
    $caminho = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
    if ($caminho -eq "") { $caminho = "apresentacao" }
    $arquivo = Join-Path $raiz $caminho
    if (-not (Test-Path $arquivo -PathType Leaf)) { $arquivo = "$arquivo.html" }
    $cheio = [IO.Path]::GetFullPath($arquivo)
    if (-not $cheio.StartsWith([IO.Path]::GetFullPath($raiz)) -or -not (Test-Path $cheio -PathType Leaf)) {
      $res.StatusCode = 404; $b = [Text.Encoding]::UTF8.GetBytes("Não encontrado"); $res.OutputStream.Write($b, 0, $b.Length)
    } else {
      $ext = [IO.Path]::GetExtension($cheio).ToLower()
      $res.ContentType = if ($tipos.ContainsKey($ext)) { $tipos[$ext] } else { "application/octet-stream" }
      if ($caminho -eq "apresentacao-sw.js") { $res.AddHeader("Service-Worker-Allowed", "/apresentacao") }
      $bytes = [IO.File]::ReadAllBytes($cheio)
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    }
  } catch { } finally { try { $res.Close() } catch { } }
}

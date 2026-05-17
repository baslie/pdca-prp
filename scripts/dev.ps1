#requires -Version 5.1
<#
.SYNOPSIS
  Единая точка входа для локального dev-сервера проекта PDCA / ПРП.

.DESCRIPTION
  - Глушит все висячие процессы live-server и tailwindcss --watch (даже на других портах).
  - Ждёт, пока целевой порт освободится (если он держался убитым процессом).
  - Если порт занят чем-то посторонним — падает с понятным сообщением.
  - Стартует фоновый Tailwind CSS watcher (src/input.css → assets/css/tailwind.css).
  - Запускает один свежий live-server в текущей консоли (foreground).
  - По Ctrl+C — гасит фоновый Tailwind watcher через try/finally.

  Скрипт идемпотентен: запуск из чистого состояния и запуск поверх существующих
  серверов дают одинаковый результат — один работающий live-server + один Tailwind
  watcher на нужном порту.

.PARAMETER Port
  Порт для live-server. По умолчанию 8765 (см. CLAUDE.md).

.EXAMPLE
  pwsh scripts/dev.ps1
  pwsh scripts/dev.ps1 -Port 8766
#>
[CmdletBinding()]
param(
  [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

# 1. Убиваем все процессы node, у которых в командной строке присутствует 'live-server' или 'tailwindcss'.
$stale = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'live-server' -or $_.CommandLine -match 'tailwindcss' }

if ($stale) {
  Write-Host "[dev] Гашу $($stale.Count) висячих dev-процесс(а/ов) (live-server / tailwindcss --watch)..."
  $stale | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 500
}

# 2. Ждём освобождения порта до 10 секунд.
$waited = 0
while ((Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) -and ($waited -lt 10)) {
  Start-Sleep -Seconds 1
  $waited++
}

# 3. Если порт всё ещё занят — это не наш live-server, выходим с ошибкой.
$busy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($busy) {
  $owner = Get-Process -Id $busy[0].OwningProcess -ErrorAction SilentlyContinue
  Write-Error "Порт $Port занят посторонним процессом (PID=$($busy[0].OwningProcess), $($owner.ProcessName)). Освободи его или укажи другой -Port."
  exit 1
}

# 4. Стартуем Tailwind watcher в фоне (пересобирает assets/css/tailwind.css при изменениях).
#    Использует локально установленный npx tailwindcss (из node_modules/.bin/), без обращения в реестр.
$tailwindBin = Join-Path $ProjectRoot 'node_modules\.bin\tailwindcss.cmd'
if (-not (Test-Path $tailwindBin)) {
  Write-Error "Не найден $tailwindBin. Выполни `npm install` в корне проекта."
  exit 1
}

Write-Host "[dev] Запускаю Tailwind watcher (src/input.css → assets/css/tailwind.css)..."
$tailwindProc = Start-Process -FilePath $tailwindBin `
    -ArgumentList @('-i', './src/input.css', '-o', './assets/css/tailwind.css', '--watch') `
    -WorkingDirectory $ProjectRoot `
    -NoNewWindow `
    -PassThru

# 5. Поднимаем один свежий live-server из корня проекта.
Push-Location $ProjectRoot
try {
  Write-Host "[dev] http://127.0.0.1:$Port/index.html"
  Write-Host "[dev] Ctrl+C — остановить (Tailwind watcher тоже погасится)."
  npx --yes live-server --port=$Port --host=127.0.0.1 --no-browser --quiet
}
finally {
  Pop-Location
  if ($tailwindProc -and -not $tailwindProc.HasExited) {
    Write-Host "[dev] Гашу Tailwind watcher (PID=$($tailwindProc.Id))..."
    Stop-Process -Id $tailwindProc.Id -Force -ErrorAction SilentlyContinue
  }
}

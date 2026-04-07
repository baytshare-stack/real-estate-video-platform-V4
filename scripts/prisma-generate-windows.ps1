# Prisma generate on Windows — stops Node processes that lock query_engine-windows.dll.node, then retries.
param(
  [switch]$SkipStopNode
)

$ErrorActionPreference = "Stop"
if (-not $PSScriptRoot) {
  Write-Host "[prisma] Run with: powershell -File ./scripts/prisma-generate-windows.ps1" -ForegroundColor Red
  exit 1
}
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $ProjectRoot

$OutDir = Join-Path $ProjectRoot "src\generated\prisma"
$Retries = 5
$DelaySec = 2

function Stop-NodeProcessesUsingProject {
  param([string]$Root)
  $norm = $Root.TrimEnd('\', '/').ToLowerInvariant()
  Write-Host "[prisma] Looking for node.exe processes whose command line references this project..." -ForegroundColor Cyan
  try {
    $list = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
    $stopped = 0
    foreach ($p in $list) {
      $cl = [string]$p.CommandLine
      if ([string]::IsNullOrWhiteSpace($cl)) { continue }
      if ($cl.ToLowerInvariant().Contains($norm)) {
        Write-Host "[prisma] Stopping PID $($p.ProcessId) (Next/dev server or tool using this repo)" -ForegroundColor Yellow
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        $stopped++
      }
    }
    if ($stopped -eq 0) {
      Write-Host "[prisma] No matching node.exe found. If EPERM persists: close Cursor terminals running 'npm run dev', Task Manager -> end Node, or reboot." -ForegroundColor DarkYellow
    } else {
      Write-Host "[prisma] Stopped $stopped process(es). Waiting for file handles to release..." -ForegroundColor Green
    }
  } catch {
    Write-Host "[prisma] Could not enumerate processes: $_" -ForegroundColor Yellow
  }
  Start-Sleep -Seconds 3
}

if (-not $SkipStopNode) {
  Stop-NodeProcessesUsingProject -Root $ProjectRoot
}

for ($i = 0; $i -lt $Retries; $i++) {
  if (Test-Path $OutDir) {
    try {
      Remove-Item -Recurse -Force $OutDir -ErrorAction Stop
    } catch {
      Write-Host "[prisma] Still cannot remove $OutDir — run again after dev server is stopped." -ForegroundColor Yellow
      if (-not $SkipStopNode -and $i -eq 0) {
        Stop-NodeProcessesUsingProject -Root $ProjectRoot
      }
    }
  }

  & npx prisma generate
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[prisma] generate OK" -ForegroundColor Green
    Write-Host "[prisma] You can start the app again: npm run dev" -ForegroundColor Cyan
    exit 0
  }

  Write-Host "[prisma] attempt $($i + 1)/$Retries failed; waiting ${DelaySec}s..." -ForegroundColor Yellow
  if (-not $SkipStopNode) {
    Stop-NodeProcessesUsingProject -Root $ProjectRoot
  }
  Start-Sleep -Seconds $DelaySec
}

Write-Host "[prisma] Failed. Try: close all terminals, end 'Node.js' in Task Manager, add project folder to Defender exclusions, or reboot." -ForegroundColor Red
Write-Host "[prisma] To skip auto-stop of Node (not recommended): powershell -File ./scripts/prisma-generate-windows.ps1 -SkipStopNode" -ForegroundColor DarkGray
exit 1

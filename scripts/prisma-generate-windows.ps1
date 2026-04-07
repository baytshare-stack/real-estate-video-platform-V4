# Prisma generate on Windows — unlock query_engine-windows.dll.node (AV / Next / Cursor / orphan node).
param(
  [switch]$SkipStopNode,
  # Stops every node.exe on the PC (closes all Node apps). Use when targeted stop is not enough.
  [switch]$KillAllNode
)

$ErrorActionPreference = "Stop"
if (-not $PSScriptRoot) {
  Write-Host "[prisma] Run with: powershell -File ./scripts/prisma-generate-windows.ps1" -ForegroundColor Red
  exit 1
}
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $ProjectRoot

$OutDir = Join-Path $ProjectRoot "src\generated\prisma"
$Retries = 6
$DelaySec = 4
$WaitAfterStopSec = 5

function Stop-NodeProcessesUsingProject {
  param([string]$Root)
  $norm = $Root.TrimEnd('\', '/').ToLowerInvariant()
  $leaf = (Split-Path $Root -Leaf).ToLowerInvariant()
  Write-Host "[prisma] Looking for node.exe processes tied to this repo (path or folder '$leaf')..." -ForegroundColor Cyan
  try {
    $list = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
    $stopped = 0
    foreach ($p in $list) {
      $cl = [string]$p.CommandLine
      if ([string]::IsNullOrWhiteSpace($cl)) { continue }
      $cln = $cl.ToLowerInvariant()
      if ($cln.Contains($norm) -or ($leaf.Length -ge 3 -and $cln.Contains($leaf))) {
        Write-Host "[prisma] Stopping PID $($p.ProcessId)" -ForegroundColor Yellow
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        $stopped++
      }
    }
    if ($stopped -eq 0) {
      Write-Host "[prisma] No node.exe matched this project path. Another app may still hold the DLL." -ForegroundColor DarkYellow
    } else {
      Write-Host "[prisma] Stopped $stopped process(es)." -ForegroundColor Green
    }
  } catch {
    Write-Host "[prisma] Could not enumerate processes: $_" -ForegroundColor Yellow
  }
  Start-Sleep -Seconds $WaitAfterStopSec
}

function Stop-AllNode {
  Write-Host "[prisma] KILL ALL NODE: stopping every node.exe on this machine in 2 seconds (Ctrl+C to cancel)..." -ForegroundColor Red
  Start-Sleep -Seconds 2
  Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "[prisma] Stop-Process node PID $($_.Id)" -ForegroundColor Yellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds $WaitAfterStopSec
}

function Clear-OutputDir {
  param([string]$Dir)
  if (-not (Test-Path $Dir)) { return $true }
  try {
    Remove-Item -Recurse -Force $Dir -ErrorAction Stop
    return $true
  } catch {
    Write-Host "[prisma] Remove-Item failed, trying rename-aside..." -ForegroundColor Yellow
    try {
      $bak = "${Dir}_old_$(Get-Date -Format 'yyyyMMddHHmmss')"
      Rename-Item -LiteralPath $Dir -NewName (Split-Path $bak -Leaf) -ErrorAction Stop
      return $true
    } catch {
      Write-Host "[prisma] Rename-aside failed: $_" -ForegroundColor Red
      return $false
    }
  }
}

if ($KillAllNode) {
  Stop-AllNode
} elseif (-not $SkipStopNode) {
  Stop-NodeProcessesUsingProject -Root $ProjectRoot
}

for ($i = 0; $i -lt $Retries; $i++) {
  if (-not (Clear-OutputDir -Dir $OutDir)) {
    Write-Host "[prisma] Cannot clear $OutDir — retry after closing Cursor/VS Code terminals and Task Manager -> Node.js" -ForegroundColor Yellow
  }

  & node (Join-Path $ProjectRoot "scripts\prisma-cli.cjs") generate
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[prisma] generate OK" -ForegroundColor Green
    Write-Host "[prisma] You can start the app again: npm run dev" -ForegroundColor Cyan
    exit 0
  }

  Write-Host "[prisma] attempt $($i + 1)/$Retries failed; waiting ${DelaySec}s..." -ForegroundColor Yellow
  if ($KillAllNode) {
    Stop-AllNode
  } elseif (-not $SkipStopNode) {
    Stop-NodeProcessesUsingProject -Root $ProjectRoot
  }
  Start-Sleep -Seconds $DelaySec
}

Write-Host "[prisma] Failed." -ForegroundColor Red
Write-Host "  1) Close ALL terminals (including Cursor), Task Manager -> end every 'Node.js JavaScript Runtime'." -ForegroundColor White
Write-Host "  2) Or run (stops every Node app on PC): npm run prisma:generate:win:killall" -ForegroundColor White
Write-Host "  3) Windows Security -> Virus & threat protection -> exclusions -> add this project folder." -ForegroundColor White
Write-Host "  4) Reboot if the DLL is still locked." -ForegroundColor White
Write-Host "[prisma] Skip auto-stop (not recommended): powershell -File ./scripts/prisma-generate-windows.ps1 -SkipStopNode" -ForegroundColor DarkGray
exit 1

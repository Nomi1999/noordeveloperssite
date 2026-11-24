# How a Colab render is going: running drivers, the last log lines, how long since the log last moved, and the
# images on disk against the walkthrough.
#
#   powershell -NoProfile -File .claude/skills/house-walkthrough/scripts/status-render.ps1 -Design 2-kanal [-Depth]
#
# STALLED (no log line for 8 minutes while a driver runs) means: stop-render.ps1 that session, then start it again.
param([Parameter(Mandatory = $true)][string]$Design, [switch]$Depth, [string]$Quality = "mid")
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$log = Join-Path $root "render\out\$Design\colab.log"
$procs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -match "panoramas\.mjs" -and $_.CommandLine -match "--design $Design" }
Write-Output "drivers running: $(@($procs).Count)"
foreach ($p in $procs) { Write-Output "  pid $($p.ProcessId): $($p.CommandLine -replace '^.*panoramas\.mjs', 'panoramas.mjs')" }
if (Test-Path $log) {
  $age = [int]((Get-Date) - (Get-Item $log).LastWriteTime).TotalMinutes
  Write-Output "colab.log last written $age min ago"
  if ($procs -and $age -ge 8) { Write-Output "STALLED: no progress for $age minutes. Stop that session and start it again." }
  Write-Output "--- last lines:"
  Get-Content $log -Tail 12
}
$tour = Get-Content (Join-Path $root "src\designs\walkthroughs\$Design.json") -Raw | ConvertFrom-Json
$ids = $tour.viewpoints | ForEach-Object { $_.id }
$dir = if ($Depth) { "depth" } else { "panoramas" }
$missing = $ids | Where-Object {
  $f = if ($Depth) { "$_-depth.png" } else { "$_-cycles-$Quality.png" }
  -not (Test-Path (Join-Path $root "render\out\$Design\$dir\$f"))
}
Write-Output "--- $dir ($(if ($Depth) { 'depth' } else { $Quality })): $($ids.Count - @($missing).Count) of $($ids.Count) on disk"
if ($missing) { Write-Output "missing: $($missing -join ',')" }

# Stops a Colab driver started by start-render.ps1 and the Colab session it was using, so no compute units run on.
#
#   powershell -NoProfile -File .claude/skills/house-walkthrough/scripts/stop-render.ps1 -Session kanA
#   powershell -NoProfile -File .claude/skills/house-walkthrough/scripts/stop-render.ps1 -All     (every driver, every session)
#
# Finished views are kept on disk: running the same start command again carries on where it stopped.
param([string]$Session = "", [switch]$All)
if (-not $Session -and -not $All) { Write-Output "give -Session <name> or -All"; exit 1 }
$distro = if ($env:COLAB_WSL_DISTRO) { $env:COLAB_WSL_DISTRO } else { "Ubuntu-24.04" }
$procs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object {
  $_.CommandLine -match "panoramas\.mjs" -and ($All -or $_.CommandLine -match "--session $Session(\s|$)")
}
foreach ($p in $procs) {
  try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop; Write-Output "killed driver pid $($p.ProcessId)" } catch {}
}
if ($All) {
  $list = wsl -d $distro --exec bash -lc "colab sessions" | Out-String
  Write-Output $list
  $names = [regex]::Matches($list, "(?m)^\s*(noor[\w-]*|kan[\w-]*)") | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
  foreach ($n in $names) { wsl -d $distro --exec bash -lc "colab stop -s $n"; Write-Output "stopped session $n" }
} else {
  wsl -d $distro --exec bash -lc "colab stop -s $Session"
  Write-Output "stopped session $Session"
}
Write-Output "--- sessions still listed (should be none of yours):"
wsl -d $distro --exec bash -lc "colab sessions"

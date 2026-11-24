# Starts the Colab panorama driver detached, so a render that takes hours survives the shell tool's time limit.
#
#   powershell -NoProfile -File .claude/skills/house-walkthrough/scripts/start-render.ps1 -Session kanA -Design 2-kanal -DriverArgs "--views all --quality mid"
#   ... -DriverArgs "--views gate,drawing --quality preview" -Extra "--width 1280"
#
# Output goes to render/out/<design>/<session>.out (and .err). The driver's own progress log is
# render/out/<design>/colab.log (shared by every session of that design). Check on it with status-render.ps1.
param(
  [Parameter(Mandatory = $true)][string]$Session,
  [Parameter(Mandatory = $true)][string]$Design,
  [string]$DriverArgs = "--views all --quality mid",
  # more run.py panorama arguments, passed to the driver's --extra as one value, e.g. -Extra "--width 1280"
  [string]$Extra = ""
)
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$out = Join-Path $root "render\out\$Design"
New-Item -ItemType Directory -Force $out | Out-Null
$running = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -match "panoramas\.mjs" -and $_.CommandLine -match "--session $Session(\s|$)" }
if ($running) { Write-Output "session $Session already has a driver running (pid $($running.ProcessId)); stop it first with stop-render.ps1"; exit 1 }
$argList = @("scripts/colab/panoramas.mjs", "--design", $Design, "--session", $Session) + ($DriverArgs -split "\s+" | Where-Object { $_ })
# Start-Process joins the list with spaces and does not quote, so a value with spaces is quoted here
if ($Extra) { $argList += @("--extra", "`"$Extra`"") }
$p = Start-Process -FilePath node -ArgumentList $argList -WorkingDirectory $root -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $out "$Session.out") -RedirectStandardError (Join-Path $out "$Session.err")
Write-Output "started driver pid $($p.Id): node $($argList -join ' ')"
Write-Output "watch: render/out/$Design/$Session.out and render/out/$Design/colab.log"

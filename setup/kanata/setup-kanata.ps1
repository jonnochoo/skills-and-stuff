# Copies this repo's kanata.kbd to ~/.config/kanata/kanata.kbd, one of kanata's default config
# locations, so `kanata` finds it without --cfg.
# Safe to re-run: always overwrites with the repo's copy, which is the source of truth.

$configDir = "$HOME\.config\kanata"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

Copy-Item -Path "$PSScriptRoot\kanata.kbd" -Destination "$configDir\kanata.kbd" -Force
Write-Host "Installed $configDir\kanata.kbd"

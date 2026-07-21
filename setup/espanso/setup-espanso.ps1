# Copies this repo's emoji match file into espanso's match folder as its own file, so it loads
# alongside espanso's default base.yml without touching it.
# Safe to re-run: always overwrites with the repo's copy, which is the source of truth.

$matchDir = "$env:APPDATA\espanso\match"
if (-not (Test-Path $matchDir)) {
    New-Item -ItemType Directory -Path $matchDir -Force | Out-Null
}

Copy-Item -Path "$PSScriptRoot\emojis.yml" -Destination "$matchDir\emojis.yml" -Force
Write-Host "Installed $matchDir\emojis.yml"

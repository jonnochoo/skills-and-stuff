# Points your global WezTerm config at this repo's wezterm.lua by writing a small stub to
# ~/.wezterm.lua that dofiles the repo copy (WezTerm has no native [include], so this is the
# equivalent of setup/git's .gitconfig include).
# Safe to re-run: skips if the stub is already in place. If a *different* ~/.wezterm.lua
# already exists, it's backed up (not overwritten) before the stub is written.

$repoConfig = (Resolve-Path "$PSScriptRoot\wezterm.lua").Path -replace '\\', '/'
$globalConfig = "$HOME\.wezterm.lua"
$stub = "-- Managed by setup/wezterm/setup-wezterm.ps1 - edit the real config there.`nreturn dofile(`"$repoConfig`")`n"

if ((Test-Path $globalConfig) -and (Select-String -Path $globalConfig -Pattern ([regex]::Escape($repoConfig)) -SimpleMatch -Quiet)) {
    Write-Host "Already pointed at: $repoConfig"
    return
}

if (Test-Path $globalConfig) {
    $backup = "$globalConfig.bak"
    Write-Host "Existing config found, backing up to $backup"
    Move-Item -Path $globalConfig -Destination $backup -Force
}

Set-Content -Path $globalConfig -Value $stub -Encoding utf8
Write-Host "Wrote stub $globalConfig -> $repoConfig"

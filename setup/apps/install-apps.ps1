# Installs a standard set of apps via winget, plus the posh-git PowerShell module.
# Self-contained: no other files needed, so it can be run directly on a fresh machine via
#   irm https://raw.githubusercontent.com/jonnochoo/skills-and-stuff/main/setup/apps/install-apps.ps1 | iex
#
# Safe to re-run: winget skips packages that are already installed.
#
# posh-git isn't distributed via winget (it's a PowerShell Gallery module), so it's
# installed separately with Install-Module.

$apps = @(
    "Git.Git",
    "Notepad++.Notepad++",
    "Microsoft.VisualStudioCode",
    "Google.Chrome",
    "Neovim.Neovim",
    "wez.wezterm",
    "Spotify.Spotify",
    "WinMerge.WinMerge",
    "dbeaver.dbeaver",
    "DuckDB.cli",
    "7zip.7zip",
    "Microsoft.PowerToys",
    "GitHub.cli",
    "OpenJS.NodeJS.LTS",
    "ajeetdsouza.zoxide",
    "Espanso.Espanso"
)

foreach ($id in $apps) {
    Write-Host "Installing $id..."
    winget install --id $id -e --silent --accept-package-agreements --accept-source-agreements
}

Write-Host "Installing posh-git PowerShell module..."
if (-not (Get-Module -ListAvailable -Name posh-git)) {
    Install-Module -Name posh-git -Scope CurrentUser -Force
} else {
    Write-Host "posh-git already installed."
}

Write-Host "Wiring up zoxide in your PowerShell profile..."
$zoxideInit = 'Invoke-Expression (& { (zoxide init powershell | Out-String) })'
if (-not (Test-Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force | Out-Null
}
if (Select-String -Path $PROFILE -Pattern ([regex]::Escape($zoxideInit)) -SimpleMatch -Quiet) {
    Write-Host "zoxide already wired into $PROFILE"
} else {
    Add-Content -Path $PROFILE -Value "`n$zoxideInit" -Encoding utf8
    Write-Host "Added zoxide init to $PROFILE"
}

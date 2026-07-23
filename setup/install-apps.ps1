# Installs a standard set of apps via winget, plus the posh-git PowerShell module.
# Self-contained: no other files needed, so it can be run directly on a fresh machine via
#   irm https://raw.githubusercontent.com/jonnochoo/skills-and-stuff/master/setup/install-apps.ps1 | iex
#
# Safe to re-run: winget skips packages that are already installed.
#
# posh-git isn't distributed via winget (it's a PowerShell Gallery module), so it's
# installed separately with Install-Module.

# ---------------------------------------------------------------------------
# Install Apps
# ---------------------------------------------------------------------------

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
    "Espanso.Espanso",
    "Tailscale.Tailscale",
    "Microsoft.WSL",
    "Canonical.Ubuntu.2404",
    "Gyan.FFmpeg",
    "Docker.DockerDesktop",
    "Foxit.FoxitReader",
    "sharkdp.bat",
    "junegunn.fzf",
    "Clement.bottom",
    "eza-community.eza",
    "BurntSushi.ripgrep.MSVC",
    "sharkdp.fd",
    "YS-L.csvlens"
)

foreach ($id in $apps) {
    Write-Host "Installing $id..."
    winget install --id $id -e --silent --accept-package-agreements --accept-source-agreements
}

# ---------------------------------------------------------------------------
# Install GitHub CLI Extensions
# ---------------------------------------------------------------------------

Write-Host "Installing gh-dash GitHub CLI extension..."
gh extension install dlvhdr/gh-dash

# ---------------------------------------------------------------------------
# Install PowerShell Modules
# ---------------------------------------------------------------------------

Write-Host "Installing posh-git PowerShell module..."
if (-not (Get-Module -ListAvailable -Name posh-git)) {
    Install-Module -Name posh-git -Scope CurrentUser -Force
} else {
    Write-Host "posh-git already installed."
}

# ---------------------------------------------------------------------------
# Setup PowerShell Aliases
# ---------------------------------------------------------------------------

# Appends $Content to $PROFILE unless $Pattern (a regex) already matches something in it.
function Add-ToProfileOnce {
    param(
        [string]$Description,
        [string]$Pattern,
        [string]$Content
    )
    Write-Host "Wiring up $Description in your PowerShell profile..." -ForegroundColor Cyan
    if (Select-String -Path $PROFILE -Pattern $Pattern -Quiet) {
        Write-Host "$Description already wired into $PROFILE" -ForegroundColor DarkGray
    } else {
        Add-Content -Path $PROFILE -Value "`n$Content" -Encoding utf8
        Write-Host "Added $Description to $PROFILE" -ForegroundColor Green
    }
}

if (-not (Test-Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force | Out-Null
}

# --cmd cd makes zoxide take over `cd` directly (with `cdi` for the interactive picker),
# instead of only exposing the default `z` / `zi` commands.
$zoxideInit = 'Invoke-Expression (& { (zoxide init powershell --cmd cd | Out-String) })'
Add-ToProfileOnce -Description "zoxide" -Pattern ([regex]::Escape($zoxideInit)) -Content $zoxideInit

# -Force is required: `cat` is already a built-in AllScope alias for Get-Content, and
# Set-Alias won't override an existing alias of the same name without it.
$catAlias = "Set-Alias -Name cat -Value bat -Option AllScope -Force"
Add-ToProfileOnce -Description "cat -> bat alias" -Pattern ([regex]::Escape($catAlias)) -Content $catAlias

$whichAlias = "Set-Alias -Name which -Value Get-Command"
Add-ToProfileOnce -Description "which -> Get-Command alias" -Pattern ([regex]::Escape($whichAlias)) -Content $whichAlias

$historyAlias = "Set-Alias -Name history -Value Get-History"
Add-ToProfileOnce -Description "history -> Get-History alias" -Pattern ([regex]::Escape($historyAlias)) -Content $historyAlias

$touchFunction = @'
function touch { param($file) if (!(Test-Path $file)) { New-Item $file } else { (Get-Item $file).LastWriteTime = Get-Date } }
'@
Add-ToProfileOnce -Description "touch function" -Pattern "^function touch " -Content $touchFunction

Add-ToProfileOnce -Description "remove built-in ls alias" -Pattern "^Remove-Item Alias:ls" -Content "Remove-Item Alias:ls -Force -ErrorAction SilentlyContinue"

$ezaFunctions = @'
function ls  { eza --icons --group-directories-first @args }
function ll  { eza -l --icons --git --group-directories-first @args }
function la  { eza -la --icons --git --group-directories-first @args }
function lt  { eza -T -L 2 --icons @args }
'@
Add-ToProfileOnce -Description "eza ls/ll/la/lt functions" -Pattern "^function ls " -Content $ezaFunctions
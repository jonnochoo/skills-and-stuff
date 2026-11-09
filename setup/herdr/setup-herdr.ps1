# Links this repo's Herdr config into ~/.config/herdr-app (Windows).
# Mods are linked as junctions (no admin needed); files as symlinks, which need Developer Mode
# or an elevated shell - if a symlink can't be made the file is copied instead (re-run to refresh).
# Safe to re-run: correct links are skipped; anything else already there is moved to ~/.config/herdr-app-backup/<timestamp>.

$home_ = if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { "$HOME\.config\herdr-app" }
New-Item -ItemType Directory -Force "$home_\layouts", "$home_\mods" | Out-Null

# Backups go outside mods/ and layouts/ so Herdr never loads them as live config.
$backupRoot = "$HOME\.config\herdr-app-backup\$(Get-Date -Format yyyyMMdd-HHmmss)"
function Backup($path) {
    if (Test-Path $path) {
        New-Item -ItemType Directory -Force $backupRoot | Out-Null
        Move-Item $path (Join-Path $backupRoot (Split-Path $path -Leaf)) -Force
        Write-Host "Backed up $path -> $backupRoot"
    }
}

function Link-Dir($src, $dest) {
    $item = Get-Item $dest -ErrorAction SilentlyContinue
    if ($item -and $item.LinkType -and ($item.Target -contains $src)) { Write-Host "OK   $dest"; return }
    Backup $dest
    New-Item -ItemType Junction -Path $dest -Target $src | Out-Null
    Write-Host "Link $dest -> $src"
}

function Link-File($src, $dest) {
    $item = Get-Item $dest -ErrorAction SilentlyContinue
    if ($item -and $item.LinkType -and ($item.Target -contains $src)) { Write-Host "OK   $dest"; return }
    if ($item -and -not $item.LinkType -and ((Get-FileHash $src).Hash -eq (Get-FileHash $dest).Hash)) { Write-Host "OK   $dest (copy)"; return }
    Backup $dest
    try {
        New-Item -ItemType SymbolicLink -Path $dest -Target $src -ErrorAction Stop | Out-Null
        Write-Host "Link $dest -> $src"
    } catch {
        Copy-Item $src $dest
        Write-Warning "Symlink not allowed (enable Developer Mode); copied $dest instead"
    }
}

foreach ($mod in Get-ChildItem "$PSScriptRoot\mods" -Directory) { Link-Dir $mod.FullName "$home_\mods\$($mod.Name)" }
foreach ($l in Get-ChildItem "$PSScriptRoot\layouts" -File)     { Link-File $l.FullName "$home_\layouts\$($l.Name)" }
foreach ($f in 'keys.json', 'settings.json')                    { Link-File "$PSScriptRoot\$f" "$home_\$f" }

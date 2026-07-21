# Interactively pick which installed packages to upgrade via winget.
# Parses `winget upgrade`'s table output, shows it in a multi-select grid
# (Out-GridView), then upgrades only the packages you pick.

$header = $null
$rows = @()

foreach ($line in (winget upgrade)) {
    if ($line -notmatch '\S') { continue }
    if ($line -match '^Name\s+Id\s+Version') { $header = $line; continue }
    if (-not $header) { continue }
    if ($line -match '^-+\s+-+') { continue }
    if ($line -match '^\d+ upgrades? available') { continue }

    $fields = ($line -split '\s{2,}') | ForEach-Object { $_.Trim() }
    if ($fields.Count -lt 3) { continue }

    $rows += [pscustomobject]@{
        Name      = $fields[0]
        Id        = $fields[1]
        Version   = $fields[2]
        Available = if ($fields.Count -gt 3) { $fields[3] } else { '' }
    }
}

if (-not $rows) {
    Write-Host "No packages with available upgrades."
    exit
}

$selected = $rows | Out-GridView -Title "Select packages to upgrade" -PassThru

if (-not $selected) {
    Write-Host "Nothing selected."
    exit
}

foreach ($pkg in $selected) {
    Write-Host "Upgrading $($pkg.Id)..."
    winget upgrade --id $pkg.Id -e
}

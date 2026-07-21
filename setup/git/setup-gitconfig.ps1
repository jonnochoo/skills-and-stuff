# Links this repo's .gitconfig into your global ~/.gitconfig via an [include] directive.
# Safe to re-run: skips if the include is already present.

$repoGitConfig = (Resolve-Path "$PSScriptRoot\.gitconfig").Path -replace '\\', '/'
$globalGitConfig = "$HOME\.gitconfig"

if (-not (Test-Path $globalGitConfig)) {
    New-Item -ItemType File -Path $globalGitConfig | Out-Null
}

$alreadyIncluded = Select-String -Path $globalGitConfig -Pattern $repoGitConfig -SimpleMatch -Quiet

if ($alreadyIncluded) {
    Write-Host "Already included: $repoGitConfig"
} else {
    Add-Content -Path $globalGitConfig -Value "`n[include]`n`tpath = $repoGitConfig" -Encoding utf8
    Write-Host "Added include for $repoGitConfig to $globalGitConfig"
}

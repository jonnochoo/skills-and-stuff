# Apps

Installs a standard set of apps via [winget](https://learn.microsoft.com/windows/package-manager/winget/),
plus the `posh-git` PowerShell module (not distributed via winget).

Everything lives in a single script, [install-apps.ps1](install-apps.ps1), so it can be run
directly on a fresh machine without cloning the repo first.

## Usage

On a new Windows machine, open PowerShell and run:

```powershell
irm https://raw.githubusercontent.com/jonnochoo/skills-and-stuff/main/setup/apps/install-apps.ps1 | iex
```

Or, if you already have the repo checked out:

```powershell
.\install-apps.ps1
```

Safe to re-run — winget skips packages that are already installed, and the script skips
`posh-git` if it's already present.

## Editing the app list

Edit the `$apps` array at the top of [install-apps.ps1](install-apps.ps1). Each entry is a
winget package ID — find one with:

```powershell
winget search <name>
```

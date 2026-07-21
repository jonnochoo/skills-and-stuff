# Apps

Installs a standard set of apps via [winget](https://learn.microsoft.com/windows/package-manager/winget/),
plus the `posh-git` PowerShell module (not distributed via winget).

Everything lives in a single script, [install-apps.ps1](install-apps.ps1), so it can be run
directly on a fresh machine without cloning the repo first.

## Usage

On a new Windows machine, open PowerShell and run:

```powershell
irm https://raw.githubusercontent.com/jonnochoo/skills-and-stuff/master/setup/install-apps.ps1 | iex
```

Or, if you already have the repo checked out:

```powershell
.\install-apps.ps1
```

Safe to re-run — winget skips packages that are already installed, and the script skips
`posh-git` if it's already present.

## Apps installed

- Git.Git
- Notepad++.Notepad++
- Microsoft.VisualStudioCode
- Google.Chrome
- Neovim.Neovim
- wez.wezterm
- Spotify.Spotify
- WinMerge.WinMerge
- dbeaver.dbeaver
- DuckDB.cli
- 7zip.7zip
- Microsoft.PowerToys
- GitHub.cli
- OpenJS.NodeJS.LTS
- ajeetdsouza.zoxide
- Espanso.Espanso
- Tailscale.Tailscale
- Microsoft.WSL
- Canonical.Ubuntu.2404
- Gyan.FFmpeg
- Docker.DockerDesktop
- Foxit.FoxitReader
- sharkdp.bat
- junegunn.fzf
- posh-git (PowerShell module, not winget)

Plus five shell tweaks the script wires into `$PROFILE`:

- **`cat` is replaced by `bat`** — `Set-Alias -Name cat -Value bat -Option AllScope -Force` is
  appended to your profile, so `cat` gets bat's syntax highlighting and paging instead of the
  built-in `Get-Content` alias.
- **`cd` is powered by zoxide** — `zoxide init powershell --cmd cd` makes `cd` itself the
  frecency-aware jump command (`cd foo` can jump to any matching directory you've visited,
  not just a child of the current one), with `cdi` as the interactive picker.
- **`which` is added as an alias for `Get-Command`** — `Set-Alias -Name which -Value Get-Command`
  is appended to your profile, giving you the familiar Unix `which <cmd>` to find out what a
  command resolves to.
- **`touch` is added as a function** — creates the file if it doesn't exist, otherwise updates
  its `LastWriteTime` to now, matching Unix `touch`.
- **`history` is added as an alias for `Get-History`** — `Set-Alias -Name history -Value Get-History`
  is appended to your profile, giving you the familiar Unix `history` to list past commands.

## Editing the app list

Edit the `$apps` array at the top of [install-apps.ps1](install-apps.ps1). Each entry is a
winget package ID — find one with:

```powershell
winget search <name>
```

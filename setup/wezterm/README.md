# WezTerm

WezTerm is a GPU-accelerated cross-platform terminal emulator, configured here with a Lua
config ([wezterm.lua](wezterm.lua)) covering shell detection, fonts, tab/status bar, and keybinds.

Run [setup-wezterm.ps1](setup-wezterm.ps1) to point your global `~/.wezterm.lua` at this repo's
config. WezTerm itself is installed by [setup](../README.md).

## Project workspaces

`Ctrl+a f` opens a fuzzy picker over the `projects` table near the top of `wezterm.lua`. Picking
a project creates a workspace named after it (or switches to it if already open), with three
tabs — `lazygit`, `claude`, `nvim` — all cwd'd into the project's folder. `Ctrl+1`/`Ctrl+2`/`Ctrl+3`
jump directly between those tabs.

To add another project, add a line to the `projects` table:

```lua
local projects = {
  { id = "skills", label = "skills (dotfiles)", path = "C:/Users/jonno/Dev/skills" },
  { id = "my-app", label = "my-app", path = "C:/Users/jonno/Dev/my-app" },
}
```

Other workspace binds:

- `Ctrl+a s` — fuzzy-switch between already-open workspaces.
- `Ctrl+a Shift+W` — prompt for a name and create a blank ad-hoc workspace (no preset tabs).

## Useful commands

Rename the current tab from a shell inside WezTerm:

```powershell
wezterm cli set-tab-title "Your New Tab Name"
```

# WezTerm

WezTerm is a GPU-accelerated cross-platform terminal emulator, configured here with a Lua
config ([wezterm.lua](wezterm.lua)) covering shell detection, fonts, tab/status bar, and keybinds.

Run [setup-wezterm.ps1](setup-wezterm.ps1) to point your global `~/.wezterm.lua` at this repo's
config. WezTerm itself is installed by [setup](../README.md).

## Useful commands

Rename the current tab from a shell inside WezTerm:

```powershell
wezterm cli set-tab-title "Your New Tab Name"
```

# Skills & Stuff

My personal repo: an easy way to set up a new PC, my configs, tips/tricks, and a few
[Claude Code](https://claude.com/claude-code) skills.

## PC setup

On a fresh Windows machine, open PowerShell and run:

```powershell
irm https://raw.githubusercontent.com/jonnochoo/skills-and-stuff/main/setup/apps/install-apps.ps1 | iex
```

Installs my standard app list via winget (see [setup/apps](setup/apps/README.md) to edit it).

## Configs

- [setup/git](setup/git/setup-gitconfig.ps1) — links this repo's `.gitconfig` into the machine's
  global `~/.gitconfig`. Run after cloning the repo: `.\setup\git\setup-gitconfig.ps1`
- [setup/wezterm](setup/wezterm/wezterm.lua) — points `~/.wezterm.lua` at this repo's config.
  Run: `.\setup\wezterm\setup-wezterm.ps1`
- [setup/nvim](setup/nvim/README.md) — LazyVim starter setup steps + the one real customization
  (config itself isn't vendored, it's stock LazyVim).
- [setup/espanso](setup/espanso/README.md) — emoji text-expansion matches (`:world` → 🌍,
  `:shopping` → 🛒). Run: `.\setup\espanso\setup-espanso.ps1`

## Tips & tricks

_(WIP — notes to self go here.)_

## AI skills

Claude Code skills, one directory per skill with a `SKILL.md`. Copy the ones you want into
`~/.claude/skills/` (or a project's `.claude/skills/`) and Claude picks them up automatically.

- [create-pull-request](create-pull-request/SKILL.md) — drafts terse, structured PR
  titles/descriptions (conventional-commit title, fixed sections, stacking support).
- [brain-dump-to-issues](brain-dump-to-issues/SKILL.md) — turns a freeform paste of todos into
  tagged, grouped GitHub issues.

# gh-dash

[gh-dash](https://github.com/dlvhdr/gh-dash) is a terminal UI for GitHub — a dashboard of your
PRs and issues across repos, with actions (merge, approve, checkout, comment, etc.) built in.

It's installed as a `gh` CLI extension by [setup](../README.md):

```powershell
gh extension install dlvhdr/gh-dash
```

## Usage

```powershell
gh dash
```

## Common keyboard shortcuts

### Global

| Key   | Action                             |
| ----- | ----------------------------------- |
| `?`   | Toggle help menu                    |
| `/`   | Focus search (edit section's query) |
| `r`   | Refresh current section             |
| `R`   | Refresh all sections                |
| `s`   | Switch between PRs and Issues views |
| `q`   | Quit                                |

### Navigation

| Key       | Action                          |
| ---------- | -------------------------------- |
| `↑` / `k`  | Move up                          |
| `↓` / `j`  | Move down                        |
| `←` / `h`  | Previous section                 |
| `→` / `l`  | Next section                     |
| `g` / `Home` | First item                     |
| `G` / `End`  | Last item                     |

### Selected item (PRs and issues)

| Key   | Action                          |
| ----- | -------------------------------- |
| `o`   | Open in GitHub (browser)         |
| `y`   | Copy item number                 |
| `Y`   | Copy item URL                    |

### Selected PR

| Key   | Action                                  |
| ----- | ----------------------------------------- |
| `a`   | Assign users                              |
| `A`   | Unassign users                            |
| `c`   | Comment                                   |
| `C`   | Checkout PR locally (needs `repoPaths` configured) |
| `d`   | View diff                                 |
| `e`   | Expand full description                  |
| `m`   | Merge                                     |
| `u`   | Update branch from base                  |
| `v`   | Approve                                   |
| `w`   | Watch checks (notify on success/failure)  |
| `W`   | Mark ready for review                     |
| `x`   | Close                                     |
| `X`   | Reopen                                    |

### Selected issue

| Key   | Action                                             |
| ----- | ---------------------------------------------------- |
| `a`   | Assign users                                          |
| `A`   | Unassign users                                        |
| `c`   | Comment                                               |
| `C`   | Checkout a new branch for the issue (needs `repoPaths` configured) |
| `x`   | Close                                                 |
| `X`   | Reopen                                                |

Keybindings are fully customizable via `~/.config/gh-dash/config.yml` — see the
[keybindings docs](https://dlvhdr.github.io/gh-dash/configuration/keybindings/) for details.

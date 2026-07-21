# bottom

bottom (`btm`) is a cross-platform, terminal-based graphical process/system monitor — CPU, memory,
network, disk, and process usage, all in one TUI.

bottom itself is installed by [setup](../README.md).

## Usage

```powershell
btm
```

## Common keyboard shortcuts

| Key                | Action                                  |
| ------------------- | ---------------------------------------- |
| `q` / `Ctrl+c`      | Quit                                     |
| `?`                 | Show help / keybinds                     |
| `Tab`               | Cycle between widgets                    |
| Arrow keys / `hjkl` | Navigate within a widget                 |
| `dd`                | Kill the selected process                |
| `/`                 | Search/filter processes                  |
| `Ctrl+f`            | Search by full command instead of name   |
| `%`                 | Toggle percentage vs. absolute values    |
| `Esc`               | Close search/expanded widget             |
| `e`                 | Expand the currently selected widget     |
| `+` / `-`           | Zoom in/out on a graph's time range      |
| `f`                 | Freeze/unfreeze the display              |
| `t`                 | Toggle tree mode in the process widget   |
| `p` / `c` / `n`     | Sort processes by PID / CPU / name       |

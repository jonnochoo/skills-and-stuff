# bottom

bottom (`btm`) is a cross-platform, terminal-based graphical process/system monitor — CPU, memory,
network, disk, and process usage, all in one TUI.

bottom itself is installed by [setup](../README.md).

## Usage

```powershell
btm
```

## Common keyboard shortcuts

### Process management

| Key        | Action                                  |
| ---------- | ---------------------------------------- |
| `dd`       | Kill the selected process                |
| `/`        | Search/filter processes by name          |
| `Ctrl+f`   | Also opens search                        |
| `f`        | Freeze/unfreeze the current data (pause updates) |

### Sorting (in the process widget)

| Key                  | Action                          |
| --------------------- | -------------------------------- |
| `c`                   | Sort by CPU usage                |
| `m`                   | Sort by memory usage             |
| `p`                   | Sort by PID                      |
| `n`                   | Sort by process name             |
| `,` / `.` or clicking column headers | Cycle sort columns |

### Display

| Key             | Action                                       |
| ---------------- | --------------------------------------------- |
| `+` / `-` or scroll wheel | Zoom in/out on graphs (time range) |
| `t`              | Toggle tree mode (show process hierarchy)     |
| `e`              | Expand/collapse a widget to fullscreen        |
| `?`              | Open the help menu showing all keybindings    |
| `q` or `Ctrl+c`  | Quit                                          |

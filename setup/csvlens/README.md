# csvlens

[csvlens](https://github.com/YS-L/csvlens) is a terminal CSV viewer — like `less`, but built for
tabular data, with scrolling, search, filtering, sorting, and column freezing.

csvlens itself is installed by [setup](../README.md).

## Usage

```powershell
csvlens data.csv
```

It also reads from stdin:

```powershell
some-command-producing-csv | csvlens
```

Useful flags:

| Flag | Effect |
| ---- | ------ |
| `-d <char>` | Set the delimiter (`-d auto` to auto-detect) |
| `-t`, `--tab-separated` | Use tab as the delimiter |
| `-i`, `--ignore-case` | Case-insensitive search |
| `--no-headers` | Don't treat the first row as headers |
| `--filter <regex>` | Pre-filter rows on open |
| `--find <regex>` | Pre-highlight matches on open |
| `--color-columns` | Color each column differently |

## Common keyboard shortcuts

### Navigation

| Key | Action |
| --- | ------ |
| `hjkl` / arrow keys | Move one row/column |
| `Ctrl+f` / `Page Down` | Scroll one window down |
| `Ctrl+b` / `Page Up` | Scroll one window up |
| `Ctrl+d` / `d` | Scroll half a window down |
| `Ctrl+u` / `u` | Scroll half a window up |
| `Ctrl+h` / `Ctrl+l` | Scroll one window left/right |
| `Ctrl+←` / `Ctrl+→` | Jump to first/last column |
| `g` / `Home` | Go to top |
| `G` / `End` | Go to bottom |
| `<n>G` | Go to line `n` |

### Search and filter

| Key | Action |
| --- | ------ |
| `/<regex>` | Find and highlight matches |
| `n` / `N` | Jump to next/previous match |
| `&<regex>` | Filter visible rows by regex |
| `*<regex>` | Filter visible columns by regex |

### Selection and marking

| Key | Action |
| --- | ------ |
| `Tab` | Cycle row/column/cell selection mode |
| `m` | Mark/unmark the current row |
| `M` | Clear all marks |
| `Ctrl+e` | Export marked rows to stdout and exit |

### Columns

| Key | Action |
| --- | ------ |
| `>` / `<` | Increase/decrease column width |
| `J` / `Shift+↓` | Sort by the selected column |
| `Ctrl+j` | Sort using natural ordering |
| `f<n>` | Freeze `n` columns from the left |

### Cells

| Key | Action |
| --- | ------ |
| `#` | Find rows matching the selected cell |
| `@` | Filter rows matching the selected cell |
| `Enter` | Print the selected cell to stdout and exit |
| `y` | Copy the selected row/cell to the clipboard |

### Other

| Key | Action |
| --- | ------ |
| `H` / `?` | Show help |
| `r` | Reset to the default view |
| `q` | Quit |

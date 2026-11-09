# Kanata

Keyboard remapping config for [kanata](https://github.com/jtroo/kanata). Turns Caps Lock into a
"fn" layer so navigation, editing and media keys live on the home row.

## Setup on a new machine

Kanata isn't vendored here. Download the Windows binaries from the
[releases page](https://github.com/jtroo/kanata/releases) (`windows-binaries-x64.zip`) and use
`kanata_windows_tty_winIOv2_x64.exe` (or the `gui` variant for a tray icon). Then sync the config:

```powershell
.\setup\kanata\setup-kanata.ps1
kanata_windows_tty_winIOv2_x64.exe --cfg "$HOME\.config\kanata\kanata.kbd"
```

Edit [kanata.kbd](kanata.kbd) and re-run the setup script to sync. Kanata can hot-reload with
`--watch` or by restarting it.

## Behaviour

- **Caps Lock** never toggles casing. Tap does nothing; hold activates the `fn` layer.
- **Left Alt** acts as **Ctrl** (everything else is unchanged).
- While Caps is held, only the keys below do anything. Shift, Ctrl, Alt and Win still work.

| Caps + | Action                                                        |
| ------ | ------------------------------------------------------------- |
| `W` / `B` | Word forward / back (add `S` to select)                    |
| `H` / `L` | Home / End                                                 |
| `J` / `K` | Down / Up                                                  |
| `U` / `D` | Page Up / Page Down                                        |
| `S`    | Shift (for selecting)                                         |
| `Z` `X` `C` `V` | Undo / cut / copy / paste                            |
| `'`    | Alt+Tab. Tap again to cycle, add `S` to go back, release Caps to switch |
| `←` / `→` | Move window to the other monitor (Win+Shift+Arrow)         |
| `,` / `.` | Volume down / up                                           |
| `M` / `N` | Mute / play-pause                                          |
| `Enter` | Next song                                                    |

## Notes

- Kanata needs to be running for the remaps to apply; add it to Startup (`shell:startup`) to run
  at login.
- The `*_cmd_allowed` binaries enable shell commands in configs. This config doesn't use them, so
  prefer the plain ones.
- `wintercept` variants need the Interception driver; `winIOv2` doesn't.

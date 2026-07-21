# Espanso

Text-expander config for [espanso](https://espanso.org/) — turns short triggers into emoji as you type.

## Setup on a new machine

Espanso itself is installed by [setup](../README.md). Once it's installed, sync the
match file:

```powershell
.\setup\espanso\setup-espanso.ps1
espanso restart
```

## Matches

| Trigger      | Expands to |
| ------------ | ---------- |
| `:world`     | 🌍         |
| `:shopping`  | 🛒         |

Edit [emojis.yml](emojis.yml) to add more, then re-run the setup script to sync.

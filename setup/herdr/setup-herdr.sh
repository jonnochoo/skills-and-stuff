#!/usr/bin/env bash
# Links this repo's Herdr config into ~/.config/herdr-app (macOS / Linux).
# Safe to re-run: correct links are skipped; anything else already there is moved to ~/.config/herdr-app-backup/<timestamp>.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dest="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
mkdir -p "$dest/layouts" "$dest/mods"
# Backups go outside mods/ and layouts/ so Herdr never loads them as live config.
backup="$HOME/.config/herdr-app-backup/$(date +%Y%m%d-%H%M%S)"

link() { # link <src> <target>
  if [ -L "$2" ] && [ "$(readlink "$2")" = "$1" ]; then echo "OK   $2"; return; fi
  if [ -e "$2" ] || [ -L "$2" ]; then mkdir -p "$backup"; mv "$2" "$backup/"; echo "Backed up $2 -> $backup"; fi
  ln -s "$1" "$2"; echo "Link $2 -> $1"
}

for m in "$here"/mods/*/;    do link "${m%/}" "$dest/mods/$(basename "$m")"; done
for l in "$here"/layouts/*;  do link "$l" "$dest/layouts/$(basename "$l")"; done
for f in keys.json settings.json; do link "$here/$f" "$dest/$f"; done

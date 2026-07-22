# Neovim

Editor setup is [LazyVim](https://www.lazyvim.org/) via its starter template — no config vendored
in this repo, since it's almost entirely stock. Just the one real customization documented below.

## Setup on a new machine

```powershell
git clone https://github.com/LazyVim/starter $env:LOCALAPPDATA\nvim
Remove-Item -Recurse -Force $env:LOCALAPPDATA\nvim\.git
```

(Removing `.git` is [LazyVim's documented step](https://www.lazyvim.org/installation) so the
starter becomes your own config instead of a clone of their repo.)

## Requirements

LazyVim's Telescope pickers shell out to these tools, so they need to be on `PATH`:

```powershell
winget install BurntSushi.ripgrep.MSVC
winget install sharkdp.fd
```

| Tool           | Searches by    | Telescope keymap | Analogous to |
| -------------- | -------------- | ----------------- | ------------ |
| fd             | filename       | `<space>ff`        | `find`       |
| ripgrep (`rg`) | file contents  | `<space>/`         | `grep`       |

## Customizations

Set the treesitter installer to use `zig` instead of a C compiler — add this file:

`lua/plugins/treesitter.lua`

```lua
return {
  {
    "nvim-treesitter/nvim-treesitter",
    init = function()
      require("nvim-treesitter.install").compilers = { "zig" }
    end,
  },
}
```

It must live under `lua/plugins/` — LazyVim only autoloads plugin specs from that path, not from
a `plugins/` folder at the config root.

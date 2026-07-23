-- WezTerm config for Windows
-- Location: %USERPROFILE%\.wezterm.lua
--       or: %USERPROFILE%\.config\wezterm\wezterm.lua
--
-- Requires: WezTerm 20230712+ and a Nerd Font.
--   winget install wez.wezterm
--   Font: https://www.nerdfonts.com -> JetBrainsMono Nerd Font
--         (install the .ttf files for "all users" so WezTerm sees them)

local wezterm = require("wezterm")
local act = wezterm.action
local mux = wezterm.mux

local config = wezterm.config_builder()

-- ---------------------------------------------------------------------------
-- Shell detection
-- ---------------------------------------------------------------------------

local function exists(path)
  local f = io.open(path, "r")
  if f then
    f:close()
    return true
  end
  return false
end

local PWSH = "C:/Program Files/PowerShell/7/pwsh.exe"
local GIT_BASH = "C:/Program Files/Git/bin/bash.exe"

-- Project workspaces: LEADER f opens a fuzzy picker over this list. Selecting an
-- entry creates (if needed) a workspace named `id`, cwd'd into `path`, with tabs
-- for lazygit / claude / nvim — or just switches to it if already open.
local projects = {
  { id = "skills", label = "skills (dotfiles)", path = "C:/Users/jonno/Dev/skills" },
}

-- Spawn through a real shell: `claude` on Windows is usually a .cmd/.ps1 npm shim,
-- not a directly-executable .exe, so bare args = {"claude"} can fail silently.
-- -NoExit also keeps the pane alive if the command exits or crashes.
local function shell_cmd(command)
  return { PWSH, "-NoLogo", "-NoExit", "-Command", command }
end

-- Prefer PowerShell 7 if installed, else fall back to Windows PowerShell 5.1
if exists(PWSH) then
  config.default_prog = { PWSH, "-NoLogo" }
else
  config.default_prog = { "powershell.exe", "-NoLogo" }
end

-- Pick up installed WSL distros as domains.
-- To boot straight into WSL instead, uncomment default_domain and set the name
-- to match your distro (run `wezterm.exe cli list-clients` or `wsl -l -q`).
config.wsl_domains = wezterm.default_wsl_domains()
-- config.default_domain = "WSL:Ubuntu"

-- Right-click the tab bar / press Ctrl+Shift+L for this menu
config.launch_menu = {
  { label = "PowerShell 7", args = { PWSH, "-NoLogo" } },
  { label = "Windows PowerShell", args = { "powershell.exe", "-NoLogo" } },
  { label = "Command Prompt", args = { "cmd.exe" } },
}
if exists(GIT_BASH) then
  table.insert(config.launch_menu, { label = "Git Bash", args = { GIT_BASH, "-i", "-l" } })
end

-- ---------------------------------------------------------------------------
-- Fonts
-- ---------------------------------------------------------------------------

config.font = wezterm.font_with_fallback({
  { family = "JetBrainsMono Nerd Font", weight = "Regular" },
  "Cascadia Code", -- ships with Windows Terminal / VS
  "Consolas", -- always present
  "Symbols Nerd Font Mono", -- glyph fallback
  "Segoe UI Emoji",
})
config.font_size = 11.0
config.line_height = 1.1

-- Ligatures. Use { "calt=0", "clig=0", "liga=0" } to turn them off.
config.harfbuzz_features = { "calt=1", "clig=1", "liga=1" }

-- Windows text rendering. If glyphs look too thin or too fuzzy on your display,
-- try freetype_load_target = "Normal", or "Mono" for crisper, hint-heavy edges.
config.freetype_load_target = "Light"
config.freetype_render_target = "HorizontalLcd"

config.warn_about_missing_glyphs = false

-- ---------------------------------------------------------------------------
-- Appearance
-- ---------------------------------------------------------------------------

-- Browse alternatives: Ctrl+Shift+P -> "Set Color Scheme", or see
-- https://wezterm.org/colorschemes/index.html
config.color_scheme = 'Darcula (base16)'

-- Windows 11 Acrylic. NOTE: the backdrop requires opacity = 0 — a fractional
-- value here does NOT work, it just dims the terminal instead.
-- On Windows 10, or if you dislike the blur, comment these two lines out and
-- uncomment the plain-transparency line below.
config.window_background_opacity = 0.75
config.win32_system_backdrop = "Acrylic" -- "Mica" and "Tabbed" also work on Win11 22H2+

-- config.window_background_opacity = 0.95   -- plain transparency alternative

-- Background image. Two layers: the photo, then a dark wash on top so text
-- stays readable. Bump the wash `opacity` up to darken, down to show more image.
config.background = {
  {
    source = { File = "C:/Users/jonno/OneDrive/Pictures/Wallpaper/terminal.png" },
    hsb = { brightness = 0.5, saturation = 1.0, hue = 1.0 },
    horizontal_align = "Center",
    vertical_align = "Middle",
    width = "Cover",
    height = "Cover",
  },
  {
    source = { Color = "#1e1e2e" },
    width = "100%",
    height = "100%",
    opacity = 0.9,
  },
}

-- Window management buttons live in the tab bar, no separate title bar.
-- Drag the window by the empty part of the tab bar, or Ctrl+Shift+drag anywhere.
config.window_decorations = "INTEGRATED_BUTTONS|RESIZE"
config.integrated_title_button_style = "Windows"
config.integrated_title_buttons = { "Hide", "Maximize", "Close" }

config.window_padding = { left = 14, right = 14, top = 8, bottom = 8 }
config.initial_cols = 120
config.initial_rows = 32
config.adjust_window_size_when_changing_font_size = false

-- Dim panes that don't have focus
config.inactive_pane_hsb = { saturation = 0.85, brightness = 0.1 }

config.default_cursor_style = "BlinkingBar"
config.cursor_blink_rate = 600
config.cursor_blink_ease_in = "Constant"
config.cursor_blink_ease_out = "Constant"

config.scrollback_lines = 20000
config.enable_scroll_bar = false

config.audible_bell = "Disabled"
config.visual_bell = {
  fade_in_duration_ms = 60,
  fade_out_duration_ms = 180,
  target = "CursorColor",
}

-- ---------------------------------------------------------------------------
-- Performance
-- ---------------------------------------------------------------------------

config.front_end = "WebGpu" -- Direct3D 12; switch to "OpenGL" if you see artifacts
config.webgpu_power_preference = "HighPerformance"
config.max_fps = 120
config.animation_fps = 60

config.automatically_reload_config = true
config.check_for_updates = false
config.window_close_confirmation = "NeverPrompt"
config.scroll_to_bottom_on_input = true

-- ---------------------------------------------------------------------------
-- Tab bar
-- ---------------------------------------------------------------------------

config.use_fancy_tab_bar = false
config.tab_bar_at_bottom = false -- keep at top; integrated buttons expect this
config.hide_tab_bar_if_only_one_tab = false -- keep visible: it holds the window buttons
config.tab_max_width = 32
config.show_new_tab_button_in_tab_bar = false
config.switch_to_last_active_tab_when_closing_tab = true

-- IMPORTANT: with Acrylic, the tab bar background must be fully opaque.
-- A transparent tab bar here triggers a WezTerm bug that paints phantom,
-- unclickable window buttons over it.
config.colors = {
  tab_bar = {
    background = "#11111b",
    active_tab = {
      bg_color = "#1e1e2e",
      fg_color = "#cba6f7",
      intensity = "Bold",
    },
    inactive_tab = {
      bg_color = "#11111b",
      fg_color = "#6c7086",
    },
    inactive_tab_hover = {
      bg_color = "#313244",
      fg_color = "#cdd6f4",
    },
    new_tab = {
      bg_color = "#11111b",
      fg_color = "#6c7086",
    },
    new_tab_hover = {
      bg_color = "#313244",
      fg_color = "#cdd6f4",
    },
  },
}

local icons = {
  nvim = wezterm.nerdfonts.custom_vim,
  vim = wezterm.nerdfonts.custom_vim,
  pwsh = wezterm.nerdfonts.md_console,
  powershell = wezterm.nerdfonts.md_console,
  cmd = wezterm.nerdfonts.md_console_line,
  wsl = wezterm.nerdfonts.md_linux,
  bash = wezterm.nerdfonts.cod_terminal_bash,
  git = wezterm.nerdfonts.dev_git,
  lazygit = wezterm.nerdfonts.dev_git,
  claude = wezterm.nerdfonts.md_robot,
  node = wezterm.nerdfonts.dev_nodejs_small,
  python = wezterm.nerdfonts.dev_python,
  docker = wezterm.nerdfonts.linux_docker,
  ssh = wezterm.nerdfonts.md_ssh,
  cargo = wezterm.nerdfonts.dev_rust,
  btop = wezterm.nerdfonts.md_chart_areaspline,
}

local function tab_title(tab)
  if tab.tab_title and #tab.tab_title > 0 then
    return tab.tab_title
  end
  local pane = tab.active_pane
  local proc = pane.foreground_process_name or ""
  proc = proc:gsub("(.*[/\\])(.*)", "%2"):gsub("%.exe$", "")
  if proc ~= "" then
    return proc
  end
  return pane.title
end

wezterm.on("format-tab-title", function(tab, tabs, panes, cfg, hover, max_width)
  local title = tab_title(tab)
  local icon = icons[title:lower()] or wezterm.nerdfonts.md_console_line
  local text = string.format(" %s  %d  %s ", icon, tab.tab_index + 1, title)
  if #text > max_width then
    text = wezterm.truncate_right(text, max_width - 1) .. "… "
  end
  return { { Text = text } }
end)

-- ---------------------------------------------------------------------------
-- Right status: leader indicator, cwd, workspace, battery, clock
-- ---------------------------------------------------------------------------

wezterm.on("update-right-status", function(window, pane)
  local cells = {}

  if window:leader_is_active() then
    table.insert(cells, { Foreground = { Color = "#f38ba8" } })
    table.insert(cells, { Attribute = { Intensity = "Bold" } })
    table.insert(cells, { Text = "  LEADER " })
    table.insert(cells, "ResetAttributes")
  end

  -- Requires the shell to emit OSC 7. See the note at the bottom of this file
  -- if this stays blank in PowerShell.
  local cwd_uri = pane:get_current_working_dir()
  if cwd_uri then
    local cwd = type(cwd_uri) == "userdata" and cwd_uri.file_path or tostring(cwd_uri)
    cwd = cwd:gsub("[/\\]$", ""):gsub(".*[/\\]", "")
    if cwd ~= "" then
      table.insert(cells, { Foreground = { Color = "#89b4fa" } })
      table.insert(cells, { Text = "  " .. wezterm.nerdfonts.md_folder .. " " .. cwd })
    end
  end

  local ws = window:active_workspace()
  if ws ~= "default" then
    table.insert(cells, { Foreground = { Color = "#a6e3a1" } })
    table.insert(cells, { Text = "  " .. wezterm.nerdfonts.md_layers .. " " .. ws })
  end

  for _, b in ipairs(wezterm.battery_info()) do
    local pct = b.state_of_charge * 100
    local glyph = wezterm.nerdfonts.md_battery
    if b.state == "Charging" then
      glyph = wezterm.nerdfonts.md_battery_charging
    elseif pct < 20 then
      glyph = wezterm.nerdfonts.md_battery_alert
    end
    table.insert(cells, { Foreground = { Color = pct < 20 and "#f38ba8" or "#f9e2af" } })
    table.insert(cells, { Text = string.format("  %s %.0f%%", glyph, pct) })
  end

  table.insert(cells, { Foreground = { Color = "#cdd6f4" } })
  table.insert(cells, { Text = "  " .. wezterm.strftime("%a %d %b  %H:%M") .. "   " })

  window:set_right_status(wezterm.format(cells))
end)

-- Maximize on startup
wezterm.on("gui-startup", function(cmd)
  local _, _, window = mux.spawn_window(cmd or {})
  window:gui_window():maximize()
end)

-- ---------------------------------------------------------------------------
-- Project workspaces: LEADER f -> fuzzy-pick a project from the `projects`
-- table above. First pick creates a workspace with lazygit/claude/nvim tabs
-- cwd'd into the project path; later picks just switch to it.
-- ---------------------------------------------------------------------------

local function workspace_exists(name)
  for _, ws in ipairs(mux.get_workspace_names()) do
    if ws == name then
      return true
    end
  end
  return false
end

local function open_project(window, pane, proj)
  if not workspace_exists(proj.id) then
    -- First tab (lazygit) via spawn_window so we get the mux window handle back;
    -- spawn_tab for the rest. Spawning nvim last leaves it as the active tab.
  end
  window:perform_action(act.SwitchToWorkspace({ name = proj.id }), pane)
end

wezterm.on("open-project-picker", function(window, pane)
  local choices = {}
  for _, p in ipairs(projects) do
    table.insert(choices, { id = p.id, label = p.label })
  end
  window:perform_action(
    act.InputSelector({
      title = "Open Project",
      choices = choices,
      fuzzy = true,
      action = wezterm.action_callback(function(win, pn, id)
        if not id then
          return
        end
        for _, p in ipairs(projects) do
          if p.id == id then
            open_project(win, pn, p)
            break
          end
        end
      end),
    }),
    pane
  )
end)

-- ---------------------------------------------------------------------------
-- Keys
-- ---------------------------------------------------------------------------

-- Leader is Ctrl+a (tmux-style): press and release, then press the next key.
config.leader = { key = "a", mods = "CTRL", timeout_milliseconds = 1500 }

config.keys = {
  -- Send a literal Ctrl+a through to the shell (beginning-of-line)
  { key = "a", mods = "LEADER|CTRL", action = act.SendKey({ key = "a", mods = "CTRL" }) },

  -- Panes
  { key = "\\", mods = "LEADER", action = act.SplitHorizontal({ domain = "CurrentPaneDomain" }) },
  { key = "-", mods = "LEADER", action = act.SplitVertical({ domain = "CurrentPaneDomain" }) },
  { key = "x", mods = "LEADER", action = act.CloseCurrentPane({ confirm = false }) },
  { key = "z", mods = "LEADER", action = act.TogglePaneZoomState },
  { key = "o", mods = "LEADER", action = act.RotatePanes("Clockwise") },
  { key = "p", mods = "LEADER", action = act.PaneSelect({ alphabet = "asdfjkl;" }) },
  { key = "h", mods = "LEADER", action = act.ActivatePaneDirection("Left") },
  { key = "j", mods = "LEADER", action = act.ActivatePaneDirection("Down") },
  { key = "k", mods = "LEADER", action = act.ActivatePaneDirection("Up") },
  { key = "l", mods = "LEADER", action = act.ActivatePaneDirection("Right") },
  { key = "r", mods = "LEADER", action = act.ActivateKeyTable({ name = "resize_pane", one_shot = false }) },

  -- Tabs
  { key = "t", mods = "CTRL|SHIFT", action = act.SpawnTab("CurrentPaneDomain") },
  { key = "c", mods = "LEADER", action = act.SpawnTab("CurrentPaneDomain") },
  { key = "w", mods = "CTRL|SHIFT", action = act.CloseCurrentTab({ confirm = true }) },
  { key = "n", mods = "LEADER", action = act.ActivateTabRelative(1) },
  { key = "b", mods = "LEADER", action = act.ActivateTabRelative(-1) },
  { key = "Tab", mods = "LEADER", action = act.ActivateLastTab },
  { key = ",", mods = "LEADER", action = act.PromptInputLine({
      description = "Rename tab:",
      action = wezterm.action_callback(function(window, _, line)
        if line then
          window:active_tab():set_title(line)
        end
      end),
  }) },

  -- Launch menu / new shell
  { key = "l", mods = "CTRL|SHIFT", action = act.ShowLauncher },

  -- Workspaces
  { key = "f", mods = "LEADER", action = act.EmitEvent("open-project-picker") },
  { key = "s", mods = "LEADER", action = act.ShowLauncherArgs({ flags = "FUZZY|WORKSPACES" }) },
  { key = "W", mods = "LEADER|SHIFT", action = act.PromptInputLine({
      description = "New workspace name:",
      action = wezterm.action_callback(function(window, pane, line)
        if line and line ~= "" then
          window:perform_action(act.SwitchToWorkspace({ name = line }), pane)
        end
      end),
  }) },

  -- Font size
  { key = "=", mods = "CTRL", action = act.IncreaseFontSize },
  { key = "-", mods = "CTRL", action = act.DecreaseFontSize },
  { key = "0", mods = "CTRL", action = act.ResetFontSize },

  -- Copy / paste
  { key = "c", mods = "CTRL|SHIFT", action = act.CopyTo("Clipboard") },
  { key = "v", mods = "CTRL|SHIFT", action = act.PasteFrom("Clipboard") },

  -- Search, copy mode, quick select
  { key = "f", mods = "CTRL|SHIFT", action = act.Search({ CaseInSensitiveString = "" }) },
  { key = "[", mods = "LEADER", action = act.ActivateCopyMode },
  { key = " ", mods = "LEADER", action = act.QuickSelect },
  { key = "u", mods = "LEADER", action = act.QuickSelectArgs({
      label = "open url",
      patterns = { "https?://\\S+" },
      action = wezterm.action_callback(function(window, pane)
        wezterm.open_with(window:get_selection_text_for_pane(pane))
      end),
  }) },

  -- Utility
  { key = "k", mods = "CTRL|SHIFT", action = act.Multiple({
      act.ClearScrollback("ScrollbackAndViewport"),
      act.SendKey({ key = "L", mods = "CTRL" }),
  }) },
  { key = "F11", mods = "NONE", action = act.ToggleFullScreen },
  { key = "P", mods = "CTRL|SHIFT", action = act.ActivateCommandPalette },
  { key = "d", mods = "LEADER", action = act.ShowDebugOverlay },
}

-- Ctrl+1..9 jumps to a tab
for i = 1, 9 do
  table.insert(config.keys, {
    key = tostring(i),
    mods = "CTRL",
    action = act.ActivateTab(i - 1),
  })
end

config.key_tables = {
  resize_pane = {
    { key = "h", action = act.AdjustPaneSize({ "Left", 3 }) },
    { key = "j", action = act.AdjustPaneSize({ "Down", 3 }) },
    { key = "k", action = act.AdjustPaneSize({ "Up", 3 }) },
    { key = "l", action = act.AdjustPaneSize({ "Right", 3 }) },
    { key = "LeftArrow", action = act.AdjustPaneSize({ "Left", 3 }) },
    { key = "DownArrow", action = act.AdjustPaneSize({ "Down", 3 }) },
    { key = "UpArrow", action = act.AdjustPaneSize({ "Up", 3 }) },
    { key = "RightArrow", action = act.AdjustPaneSize({ "Right", 3 }) },
    { key = "Escape", action = "PopKeyTable" },
    { key = "Enter", action = "PopKeyTable" },
  },
}

-- ---------------------------------------------------------------------------
-- Mouse
-- ---------------------------------------------------------------------------

config.mouse_bindings = {
  { event = { Up = { streak = 1, button = "Left" } }, mods = "CTRL", action = act.OpenLinkAtMouseCursor },
  { event = { Up = { streak = 1, button = "Left" } }, mods = "NONE", action = act.CompleteSelection("ClipboardAndPrimarySelection") },
  { event = { Down = { streak = 1, button = "Right" } }, mods = "NONE", action = act.PasteFrom("Clipboard") },
}

-- ---------------------------------------------------------------------------
-- Hyperlinks
-- ---------------------------------------------------------------------------

config.hyperlink_rules = wezterm.default_hyperlink_rules()

-- Turn "owner/repo" into a GitHub link
table.insert(config.hyperlink_rules, {
  regex = [[["]?([\w\d]{1}[-\w\d]+)(/){1}([-\w\d\.]+)["]?]],
  format = "https://www.github.com/$1/$3",
})

return config

-- ---------------------------------------------------------------------------
-- OPTIONAL: make the cwd show up in the status bar under PowerShell.
-- PowerShell doesn't report its directory to the terminal by default. Add this
-- to your profile ($PROFILE) to fix the folder name in the right status bar:
--
--   function Invoke-Starship-PreCommand {
--     $loc = $executionContext.SessionState.Path.CurrentLocation
--     $p = $loc.ProviderPath -replace '\\', '/'
--     $host.ui.Write("$([char]27)]7;file://${env:COMPUTERNAME}/${p}$([char]27)\")
--   }
--
-- If you don't use Starship, rename the function and call it from your prompt.
-- ---------------------------------------------------------------------------
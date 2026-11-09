import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, Scrollbar, v_virtual_list } from "gpui-base";
import { spaces, panes, focused, exec, readTextFile, watchFolder, theme, settings, run, nextCommand, setShared } from "herdr";

// Staging and committing, after lazygit's files panel (click the panel to focus it, or pane.go):
//   j/k or down/up move · space stage / unstage the file · a stage all (or unstage all when nothing is left)
//   c commit (type the message, enter) · A amend the last commit with what's staged
//   d discard the file's changes (asks first) · P push · p pull --ff-only · esc leave the panel
// The two marks before a name are lazygit's: green = staged, red = unstaged ("?" = untracked).

function location() {
  const space = spaces().find((s) => s.active), f = focused();
  const pane = f?.pane ? panes().find(p => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on };
}
const key = () => JSON.stringify(location());
// Reads write nothing under .git (no index refresh or lock, no fsmonitor cookie):
// the folder watch would see it, and every refresh would start the next one.
const READ = ["--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "diff.autoRefreshIndex=false"];
const countLines = (text) => text ? text.split("\n").length - Number(text.endsWith("\n")) : 0;

// Numbers each diff line once, so a frame only draws the rows on screen.
function diffRows(lines) {
  let old = 0, next = 0;
  return lines.map((line) => {
    const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(line);
    if (match) { old = +match[1]; next = +match[2]; return { kind: "@", text: line }; }
    const kind = line[0];
    if (kind === "-") return { kind, number: old++, text: line.slice(1) || " " };
    if (kind === "+") return { kind, number: next++, text: line.slice(1) || " " };
    if (kind === " ") { old++; return { kind, number: next++, text: line.slice(1) || " " }; }
    return { kind: "", text: line };
  });
}

export default class Changes extends View {
  init(_props, cx) {
    this.files = []; this.rows = []; this.diffWidth = 0; this.message = ""; this.handle = cx.focus_handle();
    this.mode = null; this.note = null;
    this.input = InputState.new({ placeholder: "Commit message (c)" });
    this.input.on("change", (_e, cx) => {
      const hadMessage = Boolean(this.message.trim());
      this.message = this.input.value();
      if (hadMessage !== Boolean(this.message.trim())) cx.notify();
    });
    this.input.on("submit", (_e, cx) => this.commit(cx));
    this.input.on("focus", (_e, cx) => { this.typing = true; cx.notify(); });
    this.input.on("blur", (_e, cx) => { this.typing = false; cx.notify(); });
    this.refresh(cx);
    cx.timer.every(10000, (cx) => this.refresh(cx));
    cx.spawn(async (cx) => {
      for (;;) { const c = await nextCommand(); if (c === "focus") { this.handle.focus(); cx.notify(); } }
    });
  }

  watch(root, cx) {
    if (this.on || this.watched === root) return;
    this.watched = root;
    cx.spawn(async (cx) => {
      try {
        while (this.watched === root) {
          await watchFolder(root);
          if (this.watched === root) this.refresh(cx);
        }
      } catch { this.watched = null; }
    });
  }

  refresh(cx) {
    // A change that lands mid-refresh must not be lost: run once more when this one ends.
    if (this.loading) { this.again = true; return; }
    if (this.busy) return;
    const { cwd, on } = location(), context = key();
    if (context !== this.context) {
      this.context = context; this.root = null; this.files = []; this.open = null;
      this.setLines([]); this.message = ""; this.input.set_value(""); this.error = null; this.note = null; this.mode = null; this.watched = null; this.limited = false;
    }
    if (!cwd) return;
    this.loading = true;
    cx.spawn(async (cx) => {
      try {
        const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on });
        if (key() !== context) return;
        if (top.code !== 0) { this.root = null; this.files = []; this.setLines([]); this.open = null; this.error = "Not a git repository"; return; }
        const root = top.stdout.trim(), git = (args) => exec("git", [...READ, ...args], { cwd: root, on });
        const status = await git(["status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"]);
        if (status.code !== 0) throw new Error(status.stderr);
        const head = await git(["rev-parse", "--verify", "HEAD"]);
        const stats = {};
        const results = head.code === 0 ? [await git(["diff", "HEAD", "--numstat", "-z", "--no-renames"])] : [await git(["diff", "--cached", "--numstat", "-z", "--no-renames"]), await git(["diff", "--numstat", "-z", "--no-renames"])];
        for (const result of results) {
          if (result.code !== 0) throw new Error(result.stderr);
          for (const entry of result.stdout.split("\0")) {
            const [a, d, ...parts] = entry.split("\t");
            if (!parts.length) continue;
            const path = parts.join("\t"), old = stats[path] ?? { add: 0, del: 0 };
            stats[path] = { add: old.add + (Number(a) || 0), del: old.del + (Number(d) || 0), binary: a === "-" };
          }
        }
        const files = [];
        const entries = status.stdout.split("\0").filter(Boolean);
        for (const entry of entries.slice(0, 1000)) {
          const x = entry[0], y = entry[1], path = entry.slice(3), fresh = x === "?";
          const conflict = x === "U" || y === "U" || (x === "A" && y === "A") || (x === "D" && y === "D");
          const staged = !fresh && !conflict && x !== " ";
          const unstaged = fresh || conflict || y !== " ";
          files.push({ path, x, y, fresh, conflict, staged, unstaged, ...(stats[path] ?? { add: 0, del: 0 }) });
        }
        if (key() !== context) return;
        const oldIndex = this.files.findIndex((f) => f.path === this.open);
        this.root = root; this.on = on; this.hasHead = head.code === 0; this.files = files; this.limited = entries.length > 1000; this.error = null;
        this.watch(root, cx);
        // Staging keeps the cursor on its row; a file that left the list hands it to the one now in its place.
        if (this.open && !files.some((f) => f.path === this.open)) { this.open = files.length ? files[Math.min(Math.max(oldIndex, 0), files.length - 1)].path : null; this.setLines([]); }
        if (!this.open && files.length) this.open = files[0].path;
        if (this.open) {
          try { await this.load(this.open, context); }
          catch { if (key() === context) this.setLines(["Cannot preview this diff (too large or unreadable)"]); }
        }
      } catch (e) { if (key() === context) this.error = String(e); }
      finally {
        this.loading = false; cx.notify();
        if (this.again) { this.again = false; this.refresh(cx); }
      }
    });
  }

  async load(path, context) {
    const file = this.files.find((f) => f.path === path), root = this.root, on = this.on;
    if (!file) return;
    let lines;
    if (file.fresh) {
      const text = await readTextFile(`${root}/${path}`, { on }).catch(() => null);
      if (text === null) lines = ["Cannot preview this file (binary, too large, or unreadable)"];
      else if (text.includes("\0")) lines = ["Binary file · no text diff"];
      else {
        file.add = countLines(text);
        lines = [`@@ -0,0 +1,${file.add} @@`, ...text.slice(0, 400000).replace(/\n$/, "").split("\n").slice(0, 1500).map(l => `+${l}`)];
      }
    } else {
      const section = async (args, title) => {
        const r = await exec("git", [...READ, "diff", ...args, "--no-ext-diff", "--no-textconv", "--no-color", "--", path], { cwd: root, on });
        if (r.code !== 0) throw new Error(r.stderr);
        const all = r.stdout.replace(/\n$/, "").split("\n"), first = all.findIndex((l) => l.startsWith("@@"));
        return first < 0 ? [] : [title, ...all.slice(first)];
      };
      const staged = file.staged ? await section(["--cached"], "── staged ──") : [];
      const unstaged = file.unstaged ? await section([], "── unstaged ──") : [];
      lines = [...staged, ...unstaged];
      // The section titles only help when a file has both.
      if (!(staged.length && unstaged.length)) lines = lines.filter((l) => !l.startsWith("── "));
      if (!lines.length) lines = [file.binary ? "Binary file changed" : "No text diff available"];
    }
    if (key() === context && this.open === path) this.setLines(lines.slice(0, 1500).map(line => line.length > 4000 ? line.slice(0, 4000) + "… (line truncated)" : line));
  }

  setLines(lines) {
    this.rows = diffRows(lines);
    this.diffWidth = Math.max(300, ...lines.map(line => line.length * 7 + 50));
  }

  select(path, cx) {
    this.open = path; this.setLines([]);
    const context = this.context;
    cx.spawn(async (cx) => {
      try { await this.load(path, context); }
      catch (e) { if (key() === context && this.open === path) this.setLines([`Cannot preview this diff (too large or unreadable): ${e}`]); }
      cx.notify();
    });
    cx.notify();
  }

  move(to, cx) {
    if (!this.files.length) return;
    this.select(this.files[Math.max(0, Math.min(this.files.length - 1, to))].path, cx);
  }

  // Runs one git command in the repo and shows git's own words if it fails.
  act(label, args, cx, after) {
    if (this.busy || !this.root) return;
    const root = this.root, on = this.on, context = this.context;
    this.busy = true; this.note = { text: `${label}…`, bad: false };
    cx.spawn(async (cx) => {
      try {
        const r = await exec("git", args, { cwd: root, on, timeout: 120000 });
        if (this.context === context) {
          const out = (r.stderr || r.stdout).trim().split("\n").filter(Boolean).slice(-2).join(" · ");
          this.note = r.code === 0 ? { text: `${label} ✓`, bad: false } : { text: out || `${label} failed`, bad: true };
          if (r.code === 0 && after) after();
        }
      } catch (e) { this.note = { text: String(e), bad: true }; }
      finally { this.busy = false; this.refresh(cx); cx.notify(); }
    });
    cx.notify();
  }

  confirm(text, label, args, cx) {
    this.mode = { text, go: (cx) => this.act(label, args, cx) };
    cx.notify();
  }

  toggle(f, cx) {
    if (f.unstaged) this.act(`Stage ${f.path}`, ["add", "--", f.path], cx);
    else this.act(`Unstage ${f.path}`, ["reset", "-q", "--", f.path], cx);
  }

  stageAll(cx) {
    if (this.files.some((f) => f.unstaged)) this.act("Stage all", ["add", "-A"], cx);
    else this.act("Unstage all", ["reset", "-q"], cx);
  }

  discard(f, cx) {
    if (f.fresh) this.confirm(`Delete untracked ${f.path}? (y/n)`, `Delete ${f.path}`, ["clean", "-fd", "--", f.path], cx);
    else if (this.hasHead) this.confirm(`Discard ALL changes to ${f.path}? (y/n)`, `Discard ${f.path}`, ["restore", "--source=HEAD", "--staged", "--worktree", "--", f.path], cx);
    else this.confirm(`Remove ${f.path}? (y/n)`, `Remove ${f.path}`, ["rm", "-f", "--", f.path], cx);
  }

  commit(cx) {
    const message = this.message.trim();
    if (!message || !this.root || this.busy || this.loading || this.context !== key()) return;
    if (!this.files.some((f) => f.staged)) { this.note = { text: "Nothing staged: space stages a file, a stages all", bad: true }; cx.notify(); return; }
    this.act("Commit", ["commit", "-m", message], cx, () => { this.message = ""; this.input.set_value(""); });
    this.typing = false; this.handle.focus();
  }

  onKey(e, cx) {
    if (this.typing) {
      if (e.key === "escape") { this.typing = false; this.handle.focus(); cx.stop_propagation(); cx.notify(); }
      return;
    }
    // y or enter confirms; any other key cancels.
    if (this.mode) {
      const m = this.mode; this.mode = null;
      cx.stop_propagation();
      if (e.key === "y" || e.key === "enter") m.go(cx);
      cx.notify();
      return;
    }
    if (e.modifiers.control || e.modifiers.alt || e.modifiers.platform) return;
    const k = e.modifiers.shift && e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const known = ["j", "k", "down", "up", "space", "a", "c", "A", "d", "P", "p", "escape"];
    if (!known.includes(k)) return;
    cx.stop_propagation();
    const i = this.files.findIndex((f) => f.path === this.open), f = this.files[i];
    switch (k) {
      case "j": case "down": this.move(i + 1, cx); break;
      case "k": case "up": this.move(i - 1, cx); break;
      case "space": if (f) this.toggle(f, cx); break;
      case "a": this.stageAll(cx); break;
      case "d": if (f) this.discard(f, cx); break;
      case "c": this.input.focus(); break;
      case "A": this.confirm("Amend the last commit with the staged changes? (y/n)", "Amend", ["commit", "--amend", "--no-edit"], cx); break;
      case "P": this.confirm("Push the current branch? (y/n)", "Push", ["push"], cx); break;
      case "p": this.act("Pull", ["pull", "--ff-only"], cx); break;
      case "escape": this.note = null; run("pane.go", { direction: "left" }); break;
    }
    cx.notify();
  }

  diffRow({ kind, number, text }, t) {
    if (kind === "@") return div().w_full().px(12).h(20).flex_none().truncate().bg(t.raised).text_color(t.dim).child(text);
    return h_flex().w_full().h(20).flex_none().gap(10).when(kind === "+", (e) => e.bg(t.ansi2 + "18")).when(kind === "-", (e) => e.bg(t.ansi1 + "18"))
      .child(div().w(30).flex_none().text_right().text_color(t.dim).child(number === undefined ? "" : String(number)))
      .child(div().flex_1().min_w(0).truncate().child(text));
  }

  render(cx) {
    if (key() !== this.context) this.refresh(cx);
    const t = theme(), has = this.handle.is_focused(), m = this.mode;
    // Tells the Ctrl+Tab cycler (pane-cycle) which panel holds the keyboard.
    if (has !== this.was) { this.was = has; setShared("panel.changes", has); }
    const add = this.files.reduce((n, f) => n + f.add, 0), del = this.files.reduce((n, f) => n + f.del, 0), staged = this.files.filter((f) => f.staged).length;
    const enabled = Boolean(this.message.trim() && this.root && !this.busy && !this.loading && staged > 0);
    return v_flex().id("changes").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(has || this.typing ? t.accent : t.border).text_color(t.foreground).text_size(13).track_focus(this.handle)
      .on_key_down((e, cx) => this.onKey(e, cx))
      .child(h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
        .child(div().font_semibold().child("Changes"))
        .child(div().px(5).py(1).rounded(4).border_1().border_color(t.border).text_size(10).text_color(t.muted).child(`${this.files.length} files · ${staged} staged`))
        .child(div().flex_1().min_w(0).truncate().text_size(10).text_color(t.dim).text_right().child(has ? "space stage · a all · c commit · d discard · P push" : "click to focus"))
        .child(div().text_size(11).text_color(t.ansi2).child(`+${add}`)).child(div().text_size(11).text_color(t.ansi1).child(`−${del}`)))
      // overflow_y_scrollbar() wraps the list, so its flex sizing never reached the panel's layout.
      .child(div().flex_1().min_h(44).max_h(this.files.length * 28 + 12).relative().border_b(1).border_color(t.border)
        .child(v_flex().id("changes-list").absolute().inset_0().overflow_y_scroll().p(6).children(this.files.map((f) => {
        const parts = f.path.split("/"), name = parts.pop();
        return h_flex().id(`change-${f.path}`).h(28).flex_none().px(8).gap(8).items_center().rounded(7).cursor_pointer().when(this.open === f.path, (e) => e.bg(has ? t.selected : t.hover)).hover((s) => s.bg(t.hover))
          .on_click((_e, cx) => { this.handle.focus(); this.select(f.path, cx); })
          // The two marks are lazygit's: staged in green, unstaged in red. Clicking them stages or unstages.
          .child(h_flex().id(`mark-${f.path}`).flex_none().gap(2).px(2).rounded(4).hover((s) => s.bg(t.raised)).on_click((_e, cx) => { cx.stop_propagation(); this.handle.focus(); this.open = f.path; this.toggle(f, cx); })
            .child(div().w(10).text_size(11).text_color(t.ansi2).child(f.staged ? f.x : " "))
            .child(div().w(10).text_size(11).text_color(f.conflict ? t.blocked : t.ansi1).child(f.conflict ? "U" : f.unstaged ? (f.fresh ? "?" : f.y) : " ")))
          .child(h_flex().flex_1().min_w(0).child(div().text_color(t.dim).truncate().child(parts.length ? parts.join("/") + "/" : "")).child(div().max_w(260).min_w(0).truncate().child(name)))
          .when(f.add > 0, (e) => e.child(div().text_size(11).text_color(t.ansi2).child(`+${f.add}`))).when(f.del > 0, (e) => e.child(div().text_size(11).text_color(t.ansi1).child(`−${f.del}`)));
      })).when(!this.files.length, (e) => e.child(div().p(8).text_color(t.dim).child(this.error || (this.loading ? "Loading changes…" : this.root ? "No uncommitted changes" : "No folder")))))
        .child(Scrollbar.vertical("changes-list").absolute().inset_0()))
      .when(this.limited, el => el.child(div().px(12).py(4).text_size(11).text_color(t.dim).child("Showing the first 1,000 changed files")))
      .child(div().flex_1().min_h(0).relative().font_family(settings().font_family ?? "JetBrains Mono").text_size(11)
        .child(div().id("changes-diff-x").size_full().overflow_x_scrollbar()
          .child(div().w_full().min_w(this.diffWidth).h_full().child(v_virtual_list("changes-diff", this.rows.length, 20, (i) => String(i),
            (range) => this.rows.slice(range.start, range.end).map((row) => this.diffRow(row, t))).size_full())))
        .child(Scrollbar.vertical("changes-diff").viewport_from_layout().absolute().inset_0())
        .when(!this.open && this.files.length > 0, (e) => e.child(div().absolute().top(6).px(12).text_color(t.dim).child("Select a file to view its changes"))))
      .when(Boolean(m), (e) => e.child(div().flex_none().px(14).py(8).border_t(1).border_color(t.border).bg(t.raised).text_color(t.blocked).text_size(12).child(m.text)))
      .when(Boolean(this.note) && !m, (e) => e.child(div().flex_none().px(14).py(6).border_t(1).border_color(t.border).truncate().text_size(11).text_color(this.note.bad ? t.ansi1 : t.dim).child(this.note.text)))
      .child(h_flex().flex_none().p(10).gap(8).border_t(1).border_color(t.border)
        .child(div().id("commit-message").flex_1().min_w(0).h(32).px(10).flex().items_center().rounded(8).border_1().border_color(this.typing ? t.accent : t.border).cursor_text().on_mouse_down("left", (_e, cx) => cx.stop_propagation()).child(Input.new(this.input).h_full().text_size(12).text_color(t.foreground)))
        .child(div().id("commit").h(32).px(14).flex().items_center().rounded(8).bg(enabled ? t.solid : t.raised).text_color(enabled ? t.solid_foreground : t.dim).text_size(12).when(enabled, (e) => e.cursor_pointer()).on_click((_e, cx) => this.commit(cx)).child(this.busy ? "Working…" : "Commit")));
  }
}

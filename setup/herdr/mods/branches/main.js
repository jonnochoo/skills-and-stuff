import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { spaces, panes, focused, exec, run, nextCommand, setShared, theme, window } from "herdr";

// Keys, after lazygit's branches panel (click the panel to focus it, or pane.go):
//   j/k or down/up move · g/G top/bottom · space or enter checkout · n new branch from selected
//   d delete (local; a remote branch asks before deleting on the server) · D force delete
//   M merge selected into current · R rename · f fast-forward from upstream
//   r rebase current onto selected · u set upstream to origin/<name> · o open PR on GitHub
//   F fetch --all --prune · y copy name · esc leave the panel
const ROW = 46, SEP = "\x1f";

function location() {
  const space = spaces().find((s) => s.active), f = focused();
  const pane = f?.pane ? panes().find((p) => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on };
}
const key = () => JSON.stringify(location());
const ago = (ts) => {
  const s = Math.max(0, Date.now() / 1000 - ts);
  return s < 3600 ? `${Math.max(1, Math.round(s / 60))}m` : s < 86400 ? `${Math.round(s / 3600)}h` : `${Math.round(s / 86400)}d`;
};

// Cross-platform clipboard: pbcopy on macOS, PowerShell on Windows, wl-copy/xclip on Linux.
async function copyText(text) {
  const q = "'" + text.replace(/'/g, "'\''") + "'";
  const p = window().platform;
  if (p === "windows") return exec("powershell", ["-NoProfile", "-Command", `Set-Clipboard -Value '${text.replace(/'/g, "''")}'`]);
  if (p === "macos") return exec("sh", ["-c", `printf %s ${q} | pbcopy`]);
  return exec("sh", ["-c", `printf %s ${q} | (wl-copy || xclip -selection clipboard)`]);
}

export default class Branches extends View {
  init(_props, cx) {
    this.branches = []; this.error = null; this.context = null; this.sel = 0; this.selName = null;
    this.mode = null; this.note = null; this.handle = cx.focus_handle(); this.top = 0; this.height = 400;
    this.input = InputState.new({ placeholder: "" });
    this.input.on("submit", (_e, cx) => this.submitInput(cx));
    this.refresh(cx);
    cx.timer.every(10000, (cx) => this.refresh(cx));
    cx.spawn(async (cx) => {
      for (;;) { const c = await nextCommand(); if (c === "focus") { this.handle.focus(); cx.notify(); } }
    });
  }

  get current() { return this.branches[this.sel]; }

  refresh(cx) {
    if (this.loading) return;
    const { cwd, on } = location(), context = key();
    if (context !== this.context) {
      this.context = context; this.branches = []; this.error = null; this.mode = null; this.note = null; this.sel = 0; this.selName = null;
    }
    if (!cwd) return;
    this.loading = true;
    cx.spawn(async (cx) => {
      try {
        // Each branch is compared with main (else master): commits ahead/behind and the size of its diff.
        const g = (args) => exec("git", ["--no-optional-locks", ...args], { cwd, on });
        const has = async (name) => (await g(["rev-parse", "--verify", "--quiet", `refs/heads/${name}`])).code === 0;
        const base = (await has("main")) ? "main" : (await has("master")) ? "master" : null;
        const fmt = ["%(HEAD)", "%(refname:short)", "%(refname)", "%(committerdate:unix)", "%(subject)", "%(upstream:track)", ...(base ? [`%(ahead-behind:${base})`] : [])].join(SEP);
        const r = await exec("git", ["--no-optional-locks", "for-each-ref", "--sort=-committerdate", `--format=${fmt}`, "refs/heads"], { cwd, on });
        if (key() !== context) return;
        if (r.code !== 0) { this.branches = []; this.error = "Not a git repository"; return; }
        const seen = new Set(), list = [];
        for (const line of r.stdout.split("\n").filter(Boolean)) {
          const [head, name, ref, ts, subject, track, divergence] = line.split(SEP);
          if (ref.endsWith("/HEAD")) continue;
          const remote = ref.startsWith("refs/remotes/");
          // A remote branch that already has a local one is noise.
          if (remote) { if (seen.has(name.replace(/^[^/]+\//, ""))) continue; }
          else seen.add(name);
          const [ahead, behind] = (divergence ?? "").split(" ").map(Number);
          list.push({ current: head === "*", name, remote, ts: Number(ts), subject, track, base: name === base, ahead: ahead || 0, behind: behind || 0, stat: null });
        }
        // Lines and files changed since the branch left main, for the ones that have commits of their own.
        await Promise.all(list.filter((b) => base && !b.base && b.ahead > 0).slice(0, 25).map(async (b) => {
          const d = await g(["diff", "--numstat", `${base}...${b.name}`]);
          if (d.code !== 0) return;
          let add = 0, del = 0, files = 0;
          for (const l of d.stdout.split("\n").filter(Boolean)) { const [a, x] = l.split("\t"); files++; add += Number(a) || 0; del += Number(x) || 0; }
          b.stat = { add, del, files };
        }));
        // A linked PR is one whose head is this branch. Best effort: without gh or a GitHub remote there is simply no badge.
        try {
          const p = await exec("gh", ["pr", "list", "--state", "all", "--limit", "100", "--json", "number,headRefName,state"], { cwd, on, timeout: 20000 });
          if (p.code === 0) {
            const byBranch = new Map();
            // Newest first, so a branch keeps its latest PR.
            for (const pr of JSON.parse(p.stdout)) if (!byBranch.has(pr.headRefName)) byBranch.set(pr.headRefName, pr);
            for (const b of list) b.pr = byBranch.get(b.name) ?? null;
          }
        } catch { /* no PR info */ }
        if (key() !== context) return;
        this.base = base; this.branches = list; this.error = null;
        // The selection follows the branch, not the row, so a reorder doesn't move it.
        const at = list.findIndex((b) => b.name === this.selName);
        this.sel = at >= 0 ? at : Math.min(this.sel, Math.max(0, list.length - 1));
        this.selName = list[this.sel]?.name ?? null;
      } catch (e) { if (key() === context) this.error = String(e); }
      finally { this.loading = false; cx.notify(); }
    });
  }

  move(to) {
    if (!this.branches.length) return;
    this.sel = Math.max(0, Math.min(this.branches.length - 1, to));
    this.selName = this.branches[this.sel].name;
    // Only the rows that fit are drawn, so keep the selection inside that window.
    const n = this.rowsShown();
    if (this.sel < this.top) this.top = this.sel;
    else if (this.sel >= this.top + n) this.top = this.sel - n + 1;
  }

  rowsShown() { return Math.max(1, Math.floor(this.height / ROW)); }

  // Runs one git command and shows git's own words if it fails.
  act(label, args, cx, after) {
    if (this.busy) return;
    const { cwd, on } = location(), context = this.context;
    this.busy = true; this.note = { text: `${label}…`, bad: false };
    cx.spawn(async (cx) => {
      try {
        const r = await exec("git", args, { cwd, on, timeout: 120000 });
        if (this.context === context) {
          const out = (r.stderr || r.stdout).trim().split("\n").filter(Boolean).slice(-2).join(" · ");
          this.note = r.code === 0 ? { text: `${label} ✓`, bad: false } : { text: out || `${label} failed`, bad: true };
          if (r.code === 0 && after) after();
        }
      } catch (e) { this.note = { text: String(e), bad: true }; }
      finally { this.busy = false; this.loading = false; this.refresh(cx); cx.notify(); }
    });
    cx.notify();
  }

  askInput(op, label, value, cx) {
    this.mode = { kind: "input", op, label, from: this.current?.name };
    this.input.set_value(value);
    this.input.focus();
    cx.notify();
  }

  submitInput(cx) {
    const m = this.mode, b = this.current, v = this.input.value().trim();
    this.mode = null; this.handle.focus();
    if (m?.kind === "input" && v) {
      if (m.op === "new") this.act(`Create ${v}`, ["switch", "-c", v, ...(b ? [b.name] : [])], cx, () => { this.selName = v; });
      if (m.op === "rename") this.act(`Rename to ${v}`, ["branch", "-m", m.from, v], cx, () => { this.selName = v; });
    }
    cx.notify();
  }

  checkout(b, cx) {
    if (b.current) return;
    if (b.remote) {
      const local = b.name.replace(/^[^/]+\//, "");
      this.act(`Checkout ${local}`, ["switch", "--track", b.name], cx, () => { this.selName = local; });
    } else this.act(`Checkout ${b.name}`, ["switch", b.name], cx);
  }

  confirm(text, label, args, cx) {
    this.mode = { kind: "confirm", text, go: (cx) => this.act(label, args, cx) };
    cx.notify();
  }

  onKey(e, cx) {
    const m = this.mode;
    if (m?.kind === "input") {
      if (e.key === "escape") { this.mode = null; this.handle.focus(); cx.stop_propagation(); cx.notify(); }
      return;
    }
    // y or enter confirms; any other key cancels.
    if (m?.kind === "confirm") {
      cx.stop_propagation();
      this.mode = null;
      if (e.key === "y" || e.key === "enter") m.go(cx);
      cx.notify();
      return;
    }
    if (e.modifiers.control || e.modifiers.alt || e.modifiers.platform) return;
    const b = this.current, k = e.modifiers.shift && e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const known = "j k g G R n d D M r f u F o y".split(" ").concat(["down", "up", "home", "end", "space", "enter", "escape"]);
    if (!known.includes(k)) return;
    cx.stop_propagation();
    switch (k) {
      case "j": case "down": this.move(this.sel + 1); break;
      case "k": case "up": this.move(this.sel - 1); break;
      case "g": case "home": this.move(0); break;
      case "G": case "end": this.move(this.branches.length - 1); break;
      case "space": case "enter": if (b) this.checkout(b, cx); break;
      case "n": this.askInput("new", `New branch from ${b?.name ?? "HEAD"}`, "", cx); break;
      case "R": if (b && !b.remote) this.askInput("rename", `Rename ${b.name}`, b.name, cx); break;
      case "d": case "D": {
        if (!b) break;
        if (b.current) { this.note = { text: "Can't delete the checked-out branch", bad: true }; break; }
        if (b.remote) {
          const [remote, ...rest] = b.name.split("/");
          this.confirm(`Delete ${b.name} ON THE REMOTE? (y/n)`, `Delete ${b.name}`, ["push", remote, "--delete", rest.join("/")], cx);
        } else {
          const force = k === "D";
          this.confirm(`${force ? "Force delete" : "Delete"} local branch ${b.name}? (y/n)`, `Delete ${b.name}`, ["branch", force ? "-D" : "-d", b.name], cx);
        }
        break;
      }
      case "M": if (b && !b.current) this.confirm(`Merge ${b.name} into the current branch? (y/n)`, `Merge ${b.name}`, ["merge", b.name], cx); break;
      case "r": if (b && !b.current) this.confirm(`Rebase the current branch onto ${b.name}? (y/n)`, `Rebase onto ${b.name}`, ["rebase", b.name], cx); break;
      case "f":
        if (b?.current) this.act("Fast-forward", ["merge", "--ff-only", "@{upstream}"], cx);
        else if (b && !b.remote) this.act(`Fast-forward ${b.name}`, ["fetch", ".", `origin/${b.name}:${b.name}`], cx);
        break;
      case "u": if (b && !b.remote) this.act(`Track origin/${b.name}`, ["branch", `--set-upstream-to=origin/${b.name}`, b.name], cx); break;
      case "F": this.act("Fetch", ["fetch", "--all", "--prune"], cx); break;
      case "o": {
        if (!b) break;
        const { cwd, on } = location(), name = b.remote ? b.name.replace(/^[^/]+\//, "") : b.name;
        cx.spawn(async () => {
          const r = await exec("gh", ["pr", "view", name, "--web"], { cwd, on }).catch(() => null);
          if (!r || r.code !== 0) await exec("gh", ["pr", "create", "--web", "--head", name], { cwd, on }).catch(() => {});
        });
        break;
      }
      case "y":
        if (b) {
          cx.spawn(async () => { await copyText(b.name); });
          this.note = { text: `Copied ${b.name}`, bad: false };
        }
        break;
      case "escape": this.note = null; run("pane.go", { direction: "left" }); break;
    }
    cx.notify();
  }

  render(cx) {
    if (key() !== this.context) this.refresh(cx);
    const t = theme(), has = this.handle.is_focused(), m = this.mode;
    // Tells the Ctrl+Tab cycler (pane-cycle) which panel holds the keyboard.
    if (has !== this.was) { this.was = has; setShared("panel.branches", has); }
    return v_flex().id("branches").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(has ? t.accent : t.border).text_color(t.foreground).text_size(13)
      .track_focus(this.handle).on_key_down((e, cx) => this.onKey(e, cx))
      .child(h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
        .child(div().font_semibold().child("Branches"))
        .child(div().px(5).py(1).rounded(4).border_1().border_color(t.border).text_size(10).text_color(t.muted).child(String(this.branches.length)))
        .child(div().flex_1())
        .child(div().text_size(10).text_color(t.dim).truncate().child(has ? "space checkout · n new · d delete · M merge" : "click to focus")))
      .child(div().id("branches-body").flex_1().min_h(0).relative().overflow_hidden()
        .on_size_change((size, cx) => { if (size.height !== this.height) { this.height = size.height; cx.notify(); } })
        .on_scroll_wheel((e, cx) => {
          const max = Math.max(0, this.branches.length - this.rowsShown());
          const next = Math.max(0, Math.min(max, this.top + (e.delta.y < 0 ? 1 : e.delta.y > 0 ? -1 : 0)));
          if (next !== this.top) { this.top = next; cx.notify(); }
        })
        .child(v_flex().w_full().children(this.branches.slice(this.top, this.top + this.rowsShown() + 1).map((b, j) => {
            const i = this.top + j;
            return v_flex().id(`br-${i}`).w_full().h(ROW).flex_none().px(14).justify_center().gap(2).cursor_pointer()
              .when(i === this.sel, (e) => e.bg(has ? t.selected : t.hover)).hover((s) => s.bg(t.hover))
              .on_click((_e, cx) => { this.move(i); this.handle.focus(); cx.notify(); })
              .child(h_flex().gap(8).items_center()
                .child(div().w(10).flex_none().text_color(t.accent).child(b.current ? "●" : ""))
                .child(div().flex_1().min_w(0).truncate().child(b.name))
                .when(Boolean(b.pr), (e) => {
                  const c = b.pr.state === "OPEN" ? t.ansi2 : b.pr.state === "MERGED" ? t.ansi5 : t.ansi1;
                  return e.child(div().px(4).rounded(3).border_1().border_color(c).text_size(10).text_color(c).child(`PR #${b.pr.number}`));
                })
                .when(b.base, (e) => e.child(div().px(4).rounded(3).border_1().border_color(t.border).text_size(10).text_color(t.dim).child("base")))
                .when(Boolean(b.track), (e) => e.child(div().text_size(10).text_color(t.blocked).child(b.track.replace(/[\[\]]/g, ""))))
                // Against main: commits ahead (green) and behind (red), then a bar of added vs removed lines.
                .when(b.ahead > 0, (e) => e.child(div().text_size(10).text_color(t.ansi2).child(`↑${b.ahead}`)))
                .when(b.behind > 0, (e) => e.child(div().text_size(10).text_color(t.ansi1).child(`↓${b.behind}`)))
                .when(Boolean(b.stat) && b.stat.add + b.stat.del > 0, (e) => {
                  const total = b.stat.add + b.stat.del, width = Math.round(12 + 36 * Math.min(1, Math.log10(total + 1) / 3)), green = Math.max(2, Math.round(width * b.stat.add / total));
                  return e.child(h_flex().w(width).h(6).flex_none().rounded(3).overflow_hidden().child(div().w(green).h_full().bg(t.ansi2)).child(div().flex_1().h_full().bg(t.ansi1)));
                }))
              .child(div().pl(18).truncate().text_size(11).text_color(t.dim).child(`${b.stat ? `+${b.stat.add} −${b.stat.del} · ${b.stat.files} file${b.stat.files === 1 ? "" : "s"} · ` : b.base ? "" : b.ahead === 0 && b.behind === 0 && this.base ? "same as " + this.base + " · " : ""}${ago(b.ts)} · ${b.subject}`));
        })))
        .when(!this.branches.length, (e) => e.child(div().absolute().top(8).px(14).text_color(t.dim).child(this.error || (this.loading ? "Loading branches…" : "No branches")))))
      .when(m?.kind === "confirm", (e) => e.child(div().flex_none().px(14).py(8).border_t(1).border_color(t.border).bg(t.raised).text_color(t.blocked).text_size(12).child(m.text)))
      .when(m?.kind === "input", (e) => e.child(v_flex().flex_none().p(10).gap(4).border_t(1).border_color(t.border)
        .child(div().text_size(11).text_color(t.dim).child(m.label))
        .child(div().id("branch-input").h(30).px(10).flex().items_center().rounded(8).border_1().border_color(t.accent).on_mouse_down("left", (_e, cx) => cx.stop_propagation()).child(Input.new(this.input).h_full().text_size(12).text_color(t.foreground)))))
      .when(Boolean(this.note) && !m, (e) => e.child(div().flex_none().px(14).py(6).border_t(1).border_color(t.border).truncate().text_size(11).text_color(this.note.bad ? t.ansi1 : t.dim).child(this.note.text)));
  }
}

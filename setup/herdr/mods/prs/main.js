import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, panes, focused, exec, run, nextCommand, setShared, theme, window } from "herdr";

// Keys (panel focused): j/k or down/up move · enter open the PR in the browser · r refresh · esc leave.

function location() {
  const space = spaces().find((s) => s.active), f = focused();
  const pane = f?.pane ? panes().find((p) => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on };
}
const key = () => JSON.stringify(location());
const FIELDS = "number,title,author,isDraft,headRefName,url,reviewDecision,statusCheckRollup,updatedAt";

function checks(pr) {
  const rolls = pr.statusCheckRollup ?? [];
  if (!rolls.length) return "none";
  if (rolls.some((c) => ["FAILURE", "ERROR", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED"].includes(c.conclusion) || c.state === "FAILURE" || c.state === "ERROR")) return "fail";
  if (rolls.some((c) => (c.status && c.status !== "COMPLETED") || c.state === "PENDING")) return "pending";
  return "pass";
}
function ago(iso) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}


// The "?" overlay: this panel's keys. Any key closes it.
function helpCard(t, title, rows) {
  return v_flex().id("help-card").absolute().inset_0().bg(t.background).p(16).gap(6).overflow_hidden()
    .child(h_flex().items_center().child(div().flex_1().font_semibold().child(`${title} keys`)).child(div().text_size(11).text_color(t.dim).child("any key closes")))
    .children(rows.map(([k, d]) => h_flex().gap(12).text_size(12)
      .child(div().w(64).flex_none().text_color(t.accent).child(k))
      .child(div().flex_1().min_w(0).text_color(t.foreground).child(d))));
}
const isHelpKey = (e) => e.key === "?" || (e.key === "/" && e.modifiers.shift);
// Cross-platform clipboard: pbcopy on macOS, PowerShell on Windows, wl-copy/xclip on Linux.
async function copyText(text) {
  const q = "'" + text.replace(/'/g, "'\\''") + "'";
  const p = window().platform;
  if (p === "windows") return exec("powershell", ["-NoProfile", "-Command", `Set-Clipboard -Value '${text.replace(/'/g, "''")}'`]);
  if (p === "macos") return exec("sh", ["-c", `printf %s ${q} | pbcopy`]);
  return exec("sh", ["-c", `printf %s ${q} | (wl-copy || xclip -selection clipboard)`]);
}

const HELP = [
  ["j / k", "move down / up (also arrows)"],
  ["g / G", "jump to top / bottom"],
  ["enter / o", "open the PR in the browser"],
  ["c", "check out the PR's branch (gh pr checkout)"],
  ["y", "copy the PR's URL"],
  ["n", "open a new PR for the checked-out branch"],
  ["r", "refresh the list"],
  ["esc", "leave the panel"],
  ["?", "this help"],
];

export default class Prs extends View {
  init(_props, cx) {
    this.prs = []; this.repo = ""; this.error = null; this.context = null; this.sel = 0; this.branch = "";
    // Which branch is checked out, so its PR can be marked. Cheap, so it follows a checkout within seconds.
    cx.timer.every(4000, (cx) => this.refreshBranch(cx));
    this.handle = cx.focus_handle();
    this.refresh(cx);
    cx.timer.every(60000, (cx) => this.refresh(cx));
    cx.spawn(async (cx) => {
      for (;;) { const c = await nextCommand(); if (c === "focus") { this.handle.focus(); cx.notify(); } }
    });
  }

  onKey(e, cx) {
    if (this.help) { cx.stop_propagation(); this.help = false; cx.notify(); return; }
    if (e.modifiers.control || e.modifiers.alt || e.modifiers.platform) return;
    if (isHelpKey(e)) { cx.stop_propagation(); this.help = true; cx.notify(); return; }
    const k = e.modifiers.shift && e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const known = ["j", "k", "g", "G", "down", "up", "home", "end", "enter", "o", "c", "y", "n", "r", "escape"];
    if (!known.includes(k)) return;
    cx.stop_propagation();
    const pr = this.prs[this.sel];
    switch (k) {
      case "j": case "down": this.sel = Math.min(this.prs.length - 1, this.sel + 1); break;
      case "k": case "up": this.sel = Math.max(0, this.sel - 1); break;
      case "g": case "home": this.sel = 0; break;
      case "G": case "end": this.sel = Math.max(0, this.prs.length - 1); break;
      case "enter": case "o": if (pr) this.open(pr, cx); break;
      case "c": if (pr) this.checkout(pr, cx); break;
      case "y": if (pr) { cx.spawn(async () => { await copyText(pr.url); }); this.note = { text: `Copied ${pr.url}`, bad: false }; } break;
      case "n": this.newPr(cx); break;
      case "r": this.refresh(cx); break;
      case "escape": this.note = null; run("pane.go", { direction: "left" }); break;
    }
    cx.notify();
  }

  refreshBranch(cx) {
    const { cwd, on } = location(), context = key();
    if (!cwd) return;
    cx.spawn(async (cx) => {
      try {
        const r = await exec("git", ["--no-optional-locks", "branch", "--show-current"], { cwd, on });
        const name = r.code === 0 ? r.stdout.trim() : "";
        if (key() === context && name !== this.branch) { this.branch = name; cx.notify(); }
      } catch { /* leave the mark as it was */ }
    });
  }

  refresh(cx) {
    this.refreshBranch(cx);
    if (this.loading) return;
    const { cwd, on } = location(), context = key();
    if (context !== this.context) { this.context = context; this.prs = []; this.repo = ""; this.error = null; }
    if (!cwd) return;
    this.loading = true;
    cx.spawn(async (cx) => {
      try {
        const r = await exec("gh", ["pr", "list", "--state", "open", "--limit", "50", "--json", FIELDS], { cwd, on, timeout: 30000 });
        if (key() !== context) return;
        if (r.code !== 0) { this.prs = []; this.error = (r.stderr || r.stdout).trim().split("\n")[0] || "gh failed"; return; }
        this.prs = JSON.parse(r.stdout); this.error = null;
        const n = await exec("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], { cwd, on });
        if (key() === context && n.code === 0) this.repo = n.stdout.trim();
      } catch (e) { if (key() === context) this.error = String(e); }
      finally { this.loading = false; cx.notify(); }
    });
  }

  // Check out the PR's branch in this folder (gh handles forks and tracking).
  checkout(pr, cx) {
    if (this.busy) return;
    const { cwd, on } = location();
    this.busy = true; this.note = { text: `Checkout #${pr.number}…`, bad: false };
    cx.spawn(async (cx) => {
      try {
        const r = await exec("gh", ["pr", "checkout", String(pr.number)], { cwd, on, timeout: 60000 });
        const out = (r.stderr || r.stdout).trim().split("\n").filter(Boolean).slice(-1)[0];
        this.note = r.code === 0 ? { text: `Checked out ${pr.headRefName} ✓`, bad: false } : { text: out || "Checkout failed", bad: true };
      } catch (e) { this.note = { text: String(e), bad: true }; }
      finally { this.busy = false; this.refreshBranch(cx); cx.notify(); }
    });
    cx.notify();
  }

  // Open GitHub's new-PR page for the checked-out branch.
  newPr(cx) {
    const { cwd, on } = location();
    cx.spawn(async () => { await exec("gh", ["pr", "create", "--web"], { cwd, on }).catch(() => {}); });
  }

  open(pr, cx) {
    const { cwd, on } = location();
    cx.spawn(async () => { await exec("gh", ["pr", "view", String(pr.number), "--web"], { cwd, on }).catch(() => {}); });
  }

  render(cx) {
    if (key() !== this.context) this.refresh(cx);
    const t = theme(), has = this.handle.is_focused();
    // Tells the Ctrl+Tab cycler (pane-cycle) which panel holds the keyboard.
    if (has !== this.was) { this.was = has; setShared("panel.prs", has); }
    this.sel = Math.max(0, Math.min(this.sel, this.prs.length - 1));
    const color = { pass: t.ansi2, fail: t.ansi1, pending: t.blocked, none: t.dim };
    return v_flex().id("prs").size_full().min_h(0).relative().rounded(10).overflow_hidden().bg(t.background).border_1().border_color(has ? t.accent : t.border).text_color(t.foreground).text_size(13)
      .track_focus(this.handle).on_key_down((e, cx) => this.onKey(e, cx))
      .child(h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
        .child(div().font_semibold().child("Pull requests"))
        .child(div().px(5).py(1).rounded(4).border_1().border_color(t.border).text_size(10).text_color(t.muted).child(String(this.prs.length)))
        .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(t.dim).text_right().child(has ? "enter open · c checkout · y copy · ? keys" : this.repo))
        .child(div().id("prs-refresh").px(6).rounded(5).cursor_pointer().text_color(t.muted).hover((s) => s.bg(t.hover)).child(this.loading ? "…" : "↻").on_click((_e, cx) => { this.refresh(cx); })))
      .child(v_flex().id("prs-list").flex_1().min_h(0).overflow_y_scroll().p(6).gap(2)
        .children(this.prs.map((pr, i) => {
          const c = checks(pr), review = pr.reviewDecision, here = Boolean(this.branch) && pr.headRefName === this.branch;
          return v_flex().id(`pr-${pr.number}`).flex_none().px(8).py(6).gap(3).rounded(7).cursor_pointer()
            // The PR whose branch is checked out here: accent outline and a tint.
            .when(here, (e) => e.border_1().border_color(t.accent).bg(t.accent + "1a"))
            .when(i === this.sel && !here, (e) => e.bg(has ? t.selected : t.hover)).hover((s) => s.bg(t.hover))
            .on_click((_e, cx) => { this.sel = i; this.handle.focus(); this.open(pr, cx); cx.notify(); })
            .child(h_flex().gap(8).items_center()
              .when(here, (e) => e.child(div().text_size(11).text_color(t.accent).child("●")))
              .child(div().text_size(11).text_color(here ? t.accent : t.dim).child(`#${pr.number}`))
              .child(div().flex_1().min_w(0).truncate().when(pr.isDraft, (e) => e.text_color(t.muted)).child(pr.title))
              .child(div().text_size(10).text_color(color[c]).child(c === "pass" ? "● checks" : c === "fail" ? "● failing" : c === "pending" ? "● running" : "")))
            .child(h_flex().gap(8).items_center().text_size(11).text_color(t.dim)
              .child(div().flex_1().min_w(0).truncate().child(`${pr.headRefName} · ${pr.author?.login ?? ""} · ${ago(pr.updatedAt)}`))
              .when(here, (e) => e.child(div().text_color(t.accent).child("checked out")))
              .when(pr.isDraft, (e) => e.child(div().px(4).rounded(3).border_1().border_color(t.border).text_size(10).child("draft")))
              .when(review === "APPROVED", (e) => e.child(div().text_color(t.ansi2).child("approved")))
              .when(review === "CHANGES_REQUESTED", (e) => e.child(div().text_color(t.ansi1).child("changes requested")))
              .when(review === "REVIEW_REQUIRED", (e) => e.child(div().text_color(t.blocked).child("review needed"))));
        }))
        .when(!this.prs.length, (e) => e.child(div().p(8).text_color(t.dim).child(this.error || (this.loading ? "Loading pull requests…" : "No open pull requests")))))
      .when(Boolean(this.note), (e) => e.child(div().flex_none().px(14).py(6).border_t(1).border_color(t.border).truncate().text_size(11).text_color(this.note.bad ? t.ansi1 : t.dim).child(this.note.text)))
      .when(this.help, (e) => e.child(helpCard(t, "Pull requests", HELP)));
  }
}

import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, panes, focused, exec, run, nextCommand, setShared, theme } from "herdr";

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
    if (e.modifiers.control || e.modifiers.alt || e.modifiers.platform) return;
    const known = ["j", "k", "down", "up", "enter", "r", "escape"];
    if (!known.includes(e.key)) return;
    cx.stop_propagation();
    switch (e.key) {
      case "j": case "down": this.sel = Math.min(this.prs.length - 1, this.sel + 1); break;
      case "k": case "up": this.sel = Math.max(0, this.sel - 1); break;
      case "enter": if (this.prs[this.sel]) this.open(this.prs[this.sel], cx); break;
      case "r": this.refresh(cx); break;
      case "escape": run("pane.go", { direction: "left" }); break;
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
    return v_flex().id("prs").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(has ? t.accent : t.border).text_color(t.foreground).text_size(13)
      .track_focus(this.handle).on_key_down((e, cx) => this.onKey(e, cx))
      .child(h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
        .child(div().font_semibold().child("Pull requests"))
        .child(div().px(5).py(1).rounded(4).border_1().border_color(t.border).text_size(10).text_color(t.muted).child(String(this.prs.length)))
        .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(t.dim).text_right().child(this.repo))
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
        .when(!this.prs.length, (e) => e.child(div().p(8).text_color(t.dim).child(this.error || (this.loading ? "Loading pull requests…" : "No open pull requests")))));
  }
}

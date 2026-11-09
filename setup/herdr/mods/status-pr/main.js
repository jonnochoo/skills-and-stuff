import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, theme, run, window, keys, exec } from "herdr";

export default class WorkspaceStatus extends View {
  init(_props, cx) {
    this.pr = null;      // { number, url, state } for the active space's branch
    this.prKey = "";     // folder|branch the pr belongs to
    cx.timer.every(30000, (cx) => this.refreshPr(cx, true));
    this.refreshPr(cx, true);
  }

  // Ask gh which PR belongs to the active space's current branch.
  refreshPr(cx, force) {
    const space = spaces().find((s) => s.active);
    const key = space?.branch && space.folder ? `${space.machine ?? ""}|${space.folder}|${space.branch}` : "";
    if (!force && key === this.prKey) return;
    if (key !== this.prKey) { this.pr = null; this.prKey = key; }
    if (!key) { cx.notify(); return; }
    cx.spawn(async (cx) => {
      let pr = null;
      try {
        const r = await exec("gh", ["pr", "view", "--json", "number,url,state"], { cwd: space.folder, on: space.machine, timeout: 15000 });
        pr = JSON.parse(r.stdout);
      } catch (_e) { pr = null; } // no PR, no gh, or not a GitHub repo
      if (this.prKey === key) { this.pr = pr; cx.notify(); }
    });
  }

  // The palette key as actually bound, not a hardcoded one; without a
  // binding the hint stays useful ("commands") instead of lying.
  hint(t) {
    const mac = window()?.platform === "macos";
    const mod = { cmd: mac ? "⌘" : "Ctrl+", ctrl: mac ? "⌃" : "Ctrl+", shift: mac ? "⇧" : "Shift+", alt: mac ? "⌥" : "Alt+", option: mac ? "⌥" : "Alt+" };
    const b = keys().find((k) => k.section === "global" && k.action === "app.palette");
    const parts = b && b.keys.endsWith("--") ? [...b.keys.slice(0, -2).split("-"), "-"] : b?.keys.split("-");
    const key = parts && parts.map((p) => mod[p.toLowerCase()] ?? p.toUpperCase()).join("");
    return key ? `${key}  commands` : "commands";
  }

  render(cx) {
    const t = theme();
    const space = spaces().find(s => s.active);
    this.refreshPr(cx, false); // cheap no-op unless the folder or branch changed
    const list = agents();
    const needs = list.filter(a => a.status === "blocked").length;
    const label = (icon, text) => h_flex().gap(6).items_center().child(svg(`mods/workspace-chrome/${icon}.svg`).size(13)).child(text);
    return h_flex().size_full().px(14).gap(16).items_center().bg(t.chrome).border_t(1).border_color(t.border).text_size(11.8).text_color(t.muted)
      .child(label(space?.machine ? "server" : "monitor", space?.machine ?? "This computer"))
      .when(Boolean(space?.branch), el => el.child(label("branch", space.branch)))
      .when(Boolean(this.pr), el => {
        const c = this.pr.state === "MERGED" ? t.done : this.pr.state === "CLOSED" ? t.blocked : t.accent;
        return el.child(div().id("pr").text_color(c).hover(s => s.text_color(t.foreground))
          .on_click(() => exec("gh", ["pr", "view", "--web"], { cwd: space.folder, on: space.machine }))
          .child(`PR #${this.pr.number}` + (this.pr.state === "OPEN" ? "" : ` · ${this.pr.state.toLowerCase()}`)));
      })
      .child(h_flex().gap(6).items_center().child(div().size(6).rounded(3).bg(t.dim)).child(`${list.length} agents`)
        .when(needs > 0, el => el.child(div().text_color(t.blocked).child(`· ${needs} needs you`))))
      .child(div().flex_1())
      .child(div().id("palette").text_color(t.dim).on_click(() => run("app.palette")).child(this.hint(t)));
  }
}

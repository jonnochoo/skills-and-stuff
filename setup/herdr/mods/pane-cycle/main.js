import { View, div } from "gpui-kit";
import { panes, focused, nextCommand, run, shared, setShared } from "herdr";

// Keys reach this mod as "pane-cycle.next" / "pane-cycle.prev". It draws nothing;
// the layout floats it so the app counts it as shown and delivers the keys.
// The ring is the tab's terminal panes, then the right-hand panels (each sets
// shared "panel.<name>" while it holds the keyboard).
const PANELS = ["prs", "branches", "changes"];

export default class PaneCycle extends View {
  init(_props, cx) {
    cx.spawn(async () => {
      for (;;) {
        const c = await nextCommand();
        if (c === "next" || c === "prev") this.cycle(c === "prev" ? -1 : 1);
      }
    });
  }

  cycle(step) {
    const tab = focused()?.tab;
    const ring = [...panes().filter((p) => p.tab === tab).map((p) => ({ pane: p.pane, focused: p.focused })), ...PANELS.map((name) => ({ panel: name }))];
    const heldPanel = PANELS.find((name) => shared(`panel.${name}`));
    let at = heldPanel ? ring.findIndex((r) => r.panel === heldPanel) : ring.findIndex((r) => r.focused);
    if (at < 0) at = 0;
    const next = ring[(at + step + ring.length) % ring.length];
    // The panel being left may not report losing focus before we read it again.
    if (heldPanel) setShared(`panel.${heldPanel}`, false);
    if (next.pane) run("pane.focus", { pane: next.pane });
    else run(`${next.panel === "changes" ? "git-changes" : next.panel}.focus`);
  }

  render() { return div(); }
}

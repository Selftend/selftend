const fs = require("fs");
const p = "C:/Users/vasil/.claude/projects/C--Users-vasil-Projects-selftend/memory/MEMORY.md";
let m = fs.readFileSync(p, "utf8");
const lines = m.split("\n");
const i = lines.findIndex((l) => l.startsWith("- [Date picker map #1175]"));
if (i < 0) throw new Error("index line not found");
lines[i] =
  "- [Date picker map #1175](project_date_picker_map_1175.md) — ✅ **MAP COMPLETE**, all 8 closed, fog empty → next is `/to-spec` on #1175; ☠️ **the library's web time wheel has ZERO a11y** → we build an inline `HH:MM` control and **`TimeField` opens NO SHEET on web**; ☠️ **`formatHHmm` is a WIRE FORMAT**; ☠️ **jest NEVER resolves `.web.tsx`**; ☠️ **phone width MEASURED: the grid can never wrap — the real failures are VERTICAL (landscape + SE-with-toolbars clip the FOOTER) and the 12-hour control OVERLAPPING the Switch below ~324px**; ☠️ **`max-w-[340px]` only binds ≥388px — the `p-6` gutter sizes the card**; ☠️ **a11y MEASURED: RNW gives Escape+focus-trap+focus-return FREE, but the grid is 36 tab stops, NO arrow keys, bare-number labels, colour-only selection, and `components.Day` CANNOT fix it → patch-package**; ☠️ **`useRovingFocus` is 1-D and activates-on-move — not reusable**; ☠️ **we NEVER had an accessible `<input type=\"date\">`** (it is `aria-hidden`+`tabIndex -1`); rulings: **360dp floor · sheet SCROLLS · `p-3 sm:p-6` · patch+roving focus · focus opens on the selected day · backdrop leaves the focus path · composed time names, no auto-advance**; spun out #1235/#1248";
fs.writeFileSync(p, lines.join("\n"));
console.log("index updated");

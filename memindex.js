const fs = require("fs");
const p = "C:/Users/vasil/.claude/projects/C--Users-vasil-Projects-selftend/memory/MEMORY.md";
let m = fs.readFileSync(p, "utf8");
const lines = m.split("\n");
const i = lines.findIndex((l) => l.startsWith("- [Date picker map #1175]"));
if (i < 0) throw new Error("index line not found");
lines[i] =
  "- [Date picker map #1175](project_date_picker_map_1175.md) — SPEC (no browser widget on web, one shared themed picker sheet); #1183–#1187 + **#1191** + **#1231** ✅; ☠️ **the library's web time wheel has ZERO a11y** (no `tabIndex`/role/`aria-*` anywhere in its `time-picker/`) → we build an inline `HH:MM` control and **`TimeField` opens NO SHEET on web**; ☠️ **`formatHHmm` is a WIRE FORMAT** (lands in Postgres — never make it locale-aware); ☠️ **jest NEVER resolves `.web.tsx`**; ☠️ **phone width MEASURED: the grid can never wrap (`99.9/7 %`) — the real failures are VERTICAL (landscape + SE-with-toolbars clip the FOOTER; today's shipped picker already breaks) and the 12-hour control OVERLAPPING the Switch below ~324px**; ☠️ **`max-w-[340px]` only binds ≥388px — the `p-6` gutter sizes the card**, and 42.1×42.8 is a tap-target CEILING; ☠️ **`bg` is NOT the width stress case** (80.5 vs 79.3px); rulings: **360dp floor · sheet SCROLLS · `p-3 sm:p-6`**; spun out #1235/#1248; **fog EMPTY, frontier #1205 only → then `/to-spec`**";
fs.writeFileSync(p, lines.join("\n"));
console.log("index updated");

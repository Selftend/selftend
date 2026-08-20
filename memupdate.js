const fs = require("fs");
const p =
  "C:/Users/vasil/.claude/projects/C--Users-vasil-Projects-selftend/memory/project_date_picker_map_1175.md";
let m = fs.readFileSync(p, "utf8");

const lines = m.split("\n");
const fIdx = lines.findIndex((l) => l.startsWith("**Frontier (both unblocked, unclaimed):**"));
if (fIdx < 0) throw new Error("frontier line not found");
const oldFrontier = lines[fIdx];

const oldTail =
  "⚠️ **Phone width has never been looked at** — the prototype was desktop-only, Jest is 750px, e2e is Desktop Chrome. No automated check in this repo has ever rendered a picker at phone width.";

const newSection = `**[#1231](https://github.com/Selftend/selftend/issues/1231) CLOSED 2026-08-20 — phone width, MEASURED from a real \`expo export\` + Playwright (probe on branch \`worktree-wayfinder-1231-phone-width\`; don't rebuild it):**

- ☠️ **Width was NEVER the risk.** Day wrappers are \`99.9/7 %\` — a **percentage** — so the grid can only shrink, never wrap or clip: measured **7 per row and 0px overflow at every width down to 300px, both locales**. Cell height is a width-independent \`(300−25)/6 = 45.83\`.
- ☠️ **\`max-w-[340px]\` only binds at ≥388px viewport.** Below that the modal's **\`p-6\` gutter** sizes the card, so the sheet renders under its designed width on essentially every phone. Card/target by viewport: 320→272/**32.4**, 360→312/**38.1**, 375→327/**40.2**, 390+→340/**42.1**.
- ☠️ **The tap target is SMALLER than the cell you see** — the library insets its \`<button>\` ~3px inside each wrapper, leaving **3px dead gutters** between adjacent day targets. And **42.1 × 42.8 is a CEILING**: the 340 cap makes 44×44 unreachable at **any** viewport, desktop included (needs card ≥353). Clears WCAG 2.5.8 AA (24); misses Apple 44pt by ~2px — **accepted**.
- ☠️ **Bulgarian is NOT the width stress case** (the ticket said it was): "септември" **80.5** vs "September" **79.3**, in a 191px header slot. Nothing clipped in either locale at any width. The #1184 footer also fits with **≥81px spare at 320** — and the quiet \`Clear\` it wanted is the **existing \`ghost\` variant** (#1184's "the sheet has no low-emphasis style" is true of the sheet, false of \`buttonVariants\`).
- ☠️ **The real failure is VERTICAL, and it already ships.** Card heights are **width-invariant**: shipped 469, date-only 465, **proposed web \`datetime\` 521**. iPhone SE with Safari toolbars (~505 available) → the \`datetime\` sheet **misses by 16px**. **Landscape phone (327 available) → EVERY variant overflows, including today's shipped picker.** No scroll container + \`justify-center\` ⇒ overflow splits top *and* bottom, so the clipped part is the **footer** — i.e. \`Done\`, the only commit affordance under ruling 6.
- ☠️ **The compact 12-hour control collides with the \`Switch\`** below **~324px** (3.5px overlap at 320, visually confirmed). Its right edge is **pinned at x=250.5** regardless of viewport while the switch moves; it also overflows its own \`flex-1 min-w-0\` body from 338px down, eating the \`gap-[14px]\` before it looks broken.
- ⚠️ **The ticket's row framing was INVERTED**: at every phone width the reminders row is in its **stacked** branch (\`wide\` flips at exactly 640) — and stacked is the **roomy** face, control on its own line, never competing with the label. 24-hour is fine everywhere (77.8px); only \`en\` + AM/PM (175.5px) is tight.
- ☠️ **Sub-control tap targets:** \`HH\`/\`MM\` inputs render **22 × 19** (below the 24×24 AA floor — a composition artifact, the inputs don't stretch to the 36px container), AM/PM tabs **43.2 × 24** (exactly the floor, zero margin), and **\`SegmentedControl\` has NO \`hitSlop\`** while its neighbours use \`COMPACT_CONTROL_HIT_SLOP\`. ⚠️ \`hitSlop\` does **not** enlarge a hit area on web (RNW targets the DOM box) — must be real padding.
- ✅ **Checked, not assumed: the calendar has NO pan/swipe gesture** — \`PanResponder\` appears in exactly one library file (\`time-picker/wheel-web.js\`). So a scroll container is safe.

**Owner rulings on #1231 (2026-08-20):** **(1) supported floor is 360dp** — the collision then can't occur on a supported device, but ⚠️ **the spec MUST state 320 is unsupported**, or the failure is silent; **(2) \`PickerSheet\` gains a SCROLL CONTAINER** — fixes the SE case, landscape, *and* the already-shipped picker; **(3) modal gutter becomes \`p-3 sm:p-6\`, keeping the 340 cap** — measured to lift the day target **38.1 → 41.5 at the 360 floor** (\`p-4\` = 40.4/42.1, \`p-2\` = 42.1 but visually cramped).

**Spun out [#1248](https://github.com/Selftend/selftend/issues/1248):** the longest Bulgarian reminder label *"Дневник на благодарността"* needs **213px**, gets 198 at 360 and 158 at 320 → **ellipsizes inside the newly-supported range**; 375 clears it by 0.2px. Pre-existing, not caused by this map.

**Frontier (one, unblocked, unclaimed):** **#1205** (web keyboard + screen-reader contract — **amended twice**: by #1191 with the new control's three sub-control names, group semantics, tab cycle and the auto-advance-vs-assistive-tech call; and by #1231 with **target size** — the \`HH\`/\`MM\` inputs must fill the control's height and AM/PM needs real padding). **Fog is empty.** After #1205 the map is complete and it is \`/to-spec\` → \`/to-tickets\`.`;

if (!m.includes(oldFrontier)) throw new Error("frontier block not found");
m = m.replace(oldFrontier, newSection);

if (m.includes(oldTail)) m = m.replace(`\n\n${oldTail}`, "");

m = m.replace(
  /modified: .*/,
  "modified: 2026-08-20T21:10:00.000Z",
);
m = m.replace(
  'the #1185 two-layer sheet interface, and frontier"',
  'the #1185 two-layer sheet interface, #1231\'s measured phone-width findings, and frontier"',
);

fs.writeFileSync(p, m);
console.log("memory updated, bytes:", m.length);

const fs = require("fs");
const p =
  "C:/Users/vasil/.claude/projects/C--Users-vasil-Projects-selftend/memory/project_date_picker_map_1175.md";
let m = fs.readFileSync(p, "utf8");

const lines = m.split("\n");
const fIdx = lines.findIndex((l) => l.startsWith("**Frontier (one, unblocked, unclaimed):**"));
if (fIdx < 0) throw new Error("frontier line not found");

const replacement = `**[#1205](https://github.com/Selftend/selftend/issues/1205) CLOSED 2026-08-20 — the web keyboard/SR contract, MEASURED on a REAL modal (probe \`app/probe-1205.tsx\` + \`probe-1205-*.js\` on the same branch):**

- ✅ **RNW gives three things FREE — do NOT hand-roll them**: **Escape closes** (\`ModalContent\` attaches its own document \`keyup\`), **focus is trapped** (capture-phase listener + two \`FocusBracket\` divs; measured \`everLeftSheet: false\` over 45 Tabs), and **focus returns to the opener on close** — verified on **all three** paths (Escape, \`Done\`, backdrop). ⚠️ \`useModalPanelKeyboard\` (the sidebar's hand-rolled trap) is **NOT needed** here and would fight RNW's.
- ☠️ **The tab cycle is 36 stops**: backdrop → \`Prev\` → month → year → \`Next\` → **30 individual days** → \`Clear\` → \`Done\` → wraps.
- ☠️ **Focus on open lands on the INVISIBLE BACKDROP** — announces *"Close, button"* — because RNW's trap calls \`focusFirstDescendant\` and the backdrop is the first child. ☠️ **\`tabIndex: -1\` does NOT remove it from the cycle** (it is **stop 37**, the wrap point): a \`-1\` element is still *programmatically* focusable. The ticket's premise was wrong.
- ☠️ **NO arrow key moves focus** — \`←/→/↑/↓\`, Home, End, PageDown all driven against a focused enabled day: nothing moved. 30 Tabs to cross the month.
- ☠️ **\`aria-label\` is the BARE DAY NUMBER** ("8, button") — no weekday/month/year. ☠️ **No \`aria-selected\`/\`aria-pressed\`/\`aria-current\`**: selection is painted as a background **on the \`<button>\` itself** and conveyed by **colour alone** (WCAG 1.4.1 + 4.1.2). ☠️ **Zero grid roles, no \`aria-live\`**; weekday header is unassociated divs. ☠️ **\`Prev\`/\`Next\` aria-labels are hardcoded ENGLISH** even in \`bg\` (month localizes fine) — invisible to \`i18n-key-coverage\` because it is in \`node_modules\`.
- ✅ Works: days are real \`<button type="button">\`, disabled past days carry \`disabled\`+\`aria-disabled\` and leave the tab order, and **Enter genuinely selects** (moved selection 15 → 8 by keyboard).
- ☠️ **\`components.Day\` CANNOT carry a11y** — the library renders it **inside its own \`Pressable\`** with \`accessibilityLabel={text}\` hardcoded. Only lever is **\`patch-package\`** (precedent \`patches/react-native-sortables+1.9.4.patch\`; ⚠️ the filename **pins the version**, so an upgrade silently drops the patch). ⚠️ Patch surface is small: \`components\` is already threaded into every \`Day\`, so it is one optional \`components.dayProps(day)\` spread onto **BOTH** \`Pressable\` branches + a \`types.d.ts\` line.
- ☠️ **\`useRovingFocus\` CANNOT be reused verbatim**: it is **1-D** (\`ArrowDown\` = \`ArrowRight\` ±1, Home/End jump the whole list, no PageUp/Down) **and it activates on every move** — which would fire ~30 draft changes arrowing across a month and make \`aria-selected\` follow focus (an APG anti-pattern). The calendar needs a 2-D, **focus-only** variant.

**Owner rulings on #1205 (2026-08-20):** **(1) patch the library + roving focus** → grid becomes **ONE tab stop** (36 → 7) with APG keys (\`←/→\` ±1 day, \`↑/↓\` ±7, Home/End week, PageUp/Down month, Enter/Space selects) that move **focus only, never selection**; **(2) focus on open = the SELECTED DAY** (today when unset); **(3) the backdrop leaves the focus path entirely** — \`aria-hidden\`, non-focusable, its \`close\` label removed, with \`Clear\`/\`Done\` as #1160's visible way out; **(4) the time control uses COMPOSED names and NEVER auto-advances**. Plus my own (reversible) call: the silent blur-revert is an **unidentified error** and gets a scoped polite live region.

☠️ **Premise corrections from #1205:** the ticket's opening claim is **FALSE for the date half** — today's \`<input type="date">\` is **\`aria-hidden\`, \`tabIndex: -1\`, 1×1px, opacity 0** (a hidden \`showPicker()\` handle), so **we never had an accessible date input**; only the browser popup's post-activation a11y is lost. And the WCAG 2.5.3 finding the ticket cites as #1173 actually lives on **#1172** (which also established ☠️ **nothing in \`test/\` gates a11y or label-in-name at all** — every failure above ships green).

**☠️ THE WORKTREE TRAP that opened this session:** \`EnterWorktree\` branched from **origin/main**, which was **19 commits behind origin/dev**, so \`PressShieldModal\` "did not exist". Every file read must target \`origin/dev\`. (Checked: all files #1231 measured are **byte-identical** on main and dev, so those findings stand.) Also ⚠️ dev added a **pre-build guard requiring \`EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY\` in \`process.env\`** — run the export as \`node --env-file=.env.local scripts/e2e-web-server.js <port>\`.

**MAP COMPLETE 2026-08-20 — all 8 tickets closed, fog empty.** Next step is \`/to-spec\` on #1175, then \`/to-tickets\`. Two spun-out bugs remain open and are NOT part of the route: #1235 (web wheel \`:00\`) and #1248 (bg reminder label truncates at 360dp).`;

lines[fIdx] = replacement;
m = lines.join("\n");
m = m.replace(/modified: .*/, "modified: 2026-08-20T23:30:00.000Z");
m = m.replace(
  "#1231's measured phone-width findings, and frontier\"",
  "#1231's measured phone-width findings, #1205's measured a11y contract, and the completed route\"",
);
fs.writeFileSync(p, m);
console.log("memory updated, bytes:", m.length);

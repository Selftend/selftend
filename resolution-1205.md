## Answer

Measured, not reasoned. A second throwaway probe route rendered the sheet as a **real modal** with #1185's chrome (`PressShieldModal` → sibling backdrop → card → picker → `Clear`/`Done` footer) through a real `expo export`, and Playwright drove actual Tab/Arrow/Enter/Escape against it. Artifacts on branch [`worktree-wayfinder-1231-phone-width`](https://github.com/Selftend/selftend/tree/worktree-wayfinder-1231-phone-width): `app/probe-1205.tsx`, `probe-1205-a11y.js`, `-keys`, `-enter`, `-paint`, `-focus`.

**Verdict: react-native-web already gives more than this ticket assumed, and the library gives far less. Everything about closing the sheet works for free; nothing about the calendar grid is announced.**

---

### 1. What react-native-web provides for free — build none of it

Verified on the real modal, not read off the source:

| behaviour | status | mechanism |
| --- | --- | --- |
| **Escape closes** | ✅ free | RNW's `ModalContent` attaches its own `keyup` listener on `document`, gated on `active`, calling `onRequestClose` |
| **Focus is trapped in the sheet** | ✅ free | capture-phase `focus` listener + two `FocusBracket` (`tabIndex 0`) divs; measured `everLeftSheet: false` across 45 Tab presses |
| **Focus returns to the opener on close** | ✅ free | `ModalFocusTrap`'s effect cleanup refocuses `lastFocusedElementOutsideTrap` — verified on **all three** close paths (Escape, `Done`, backdrop click), each landing back on the trigger |

⚠️ **`PickerSheet` must therefore not hand-roll focus management.** In particular `useModalPanelKeyboard` — the sidebar's hand-rolled trap from #665/#671 — exists because a full-height side panel fought a dialog primitive. It is **not** needed here and copying it in would fight RNW's trap.

### 2. What is missing or wrong — all measured

The tab cycle through a full month is exactly **36 stops**:

> backdrop → `Prev` → `September` → `2026` → `Next` → **day 1 … day 30** → `Clear` → `Done` → wraps

- ☠️ **Focus on open lands on the invisible backdrop.** RNW's trap calls `focusFirstDescendant` on activation, and the backdrop is the first child — `tabIndex: -1` is still *programmatically* focusable. A screen reader opens the date picker by announcing **"Close, button"**.
- ☠️ **`tabIndex: -1` does not remove the backdrop from the cycle.** It is **stop 37** — the wrap point, for the same `focusFirstDescendant` reason. The ticket's premise that the backdrop is out of the keyboard path is false.
- ☠️ **No arrow-key navigation whatsoever.** `ArrowLeft/Right/Up/Down`, `Home`, `End`, `PageDown` were each driven against a focused, enabled day: focus did not move once. Crossing the calendar costs **30 Tab presses**; reaching `Done` costs 36.
- ☠️ **`aria-label` is the bare day number** — `"1"`, `"8"`, `"15"`. No weekday, month or year. A screen reader says *"8, button"*.
- ☠️ **No `aria-selected`, `aria-pressed` or `aria-current` anywhere.** Selection is painted as a background colour **on the `<button>` itself** and conveyed by nothing else — a **WCAG 1.4.1 (Use of Colour)** and **4.1.2 (Name, Role, Value)** failure.
- ☠️ **Zero grid semantics**: no `role="grid"/"row"/"gridcell"/"columnheader"`, no `<table>`, no headings, and **no `aria-live`** — so changing month announces nothing. The weekday header (`Mo Tu We…`) is unassociated `div`s, so a day can never be announced with its weekday.
- ☠️ **`Prev` / `Next` are hardcoded English `aria-label`s** — the Bulgarian picker localizes the month to "септември" but still announces **"Prev"** and **"Next"**. An untranslated user-facing string, and invisible to `test/i18n-key-coverage.test.ts` because it lives in `node_modules`.

**What does work:** days are real `<button type="button" role="button">`; disabled (past) days correctly carry `disabled` + `aria-disabled="true"` and are out of the tab order; and **Enter genuinely selects** (verified: selection moved from day 15 to day 8 by keyboard alone).

### 3. ☠️ Premise corrections

1. **The date half of this ticket's opening premise is false.** *"The two elements being deleted provided the entire web keyboard and assistive-technology contract for free — arrow-key date stepping, type-ahead, a labelled combobox role."* In today's `DateField` the `<input type="date">` is **`aria-hidden={true}`, `tabIndex={-1}`, 1×1px, `opacity: 0`, `pointerEvents: "none"`** — a hidden handle for `showPicker()`. Screen readers never see it and Tab never reaches it; the real control is already a bare `Pressable`. **We are not losing an accessible date input, because we never had one.** What is genuinely lost is the *browser popup's* internal keyboard support, reachable only after activation. (The time half was already corrected by #1191.)
2. ☠️ **`components.Day` cannot carry accessibility.** The library renders `components.Day(day)` **inside its own `Pressable`**, with `accessibilityRole="button"` and `accessibilityLabel={text}` hardcoded. A custom Day can change pixels but cannot set `aria-label`, `aria-selected`, `tabIndex`, or key handlers. **The only lever is a patch.**
3. **The WCAG 2.5.3 finding this ticket cites as #1173 is actually on [#1172](https://github.com/Selftend/selftend/issues/1172)** ("What a screen reader hears on a tagged chip").
4. ☠️ **`useRovingFocus` cannot be reused verbatim.** It is strictly **1-D** — `ArrowDown` is an alias for `ArrowRight` (±1), `Home`/`End` jump to the ends of the whole list, and there is no `PageUp`/`PageDown`. It also **activates on every move**, which conflates focus with selection — an ARIA APG anti-pattern for a date grid, and it would fire ~30 draft changes while arrowing across a month.

---

## Rulings (owner, 2026-08-20)

1. **Full: patch the library, then drive the grid with roving focus.** The grid becomes **one tab stop** with arrow-key movement and correct announcements.
2. **Focus on open lands on the selected day** (today when unset).
3. **The backdrop leaves the focus path entirely.** `Clear` / `Done` are the visible way out; Escape still discards.
4. **The inline time control uses composed accessible names, and never auto-advances.**

---

## The contract

### Sheet (date modes only — `TimeField` opens no sheet on web, #1191)

- **Focus on open** → the selected day, or today when unset. This requires the patch (ruling 1) since the day must be focusable and identifiable.
- **Escape** → discards and closes (ruling 6). Free from RNW; do not re-implement. Same path as backdrop tap and as `Clear`-less dismissal.
- **Backdrop** → `aria-hidden`, not focusable at all, and **not** a focus-trap wrap point. It keeps its pointer `onPress` for mouse/touch dismissal only. Its `accessibilityLabel={t("close")}` is **removed** — with `Clear`/`Done` visible in the footer, #1160's "visible way out" rule is satisfied by real controls rather than an invisible one.
- **Tab cycle** → `Prev` · month · year · `Next` · **grid (one stop)** · [`HH` · `MM` · (AM/PM) in `datetime`] · `Clear` · `Done`. That is **7 stops** for `date`, ~10 for web `datetime` — down from 36.
- **Grid keys** (ARIA APG date-picker-dialog): `←/→` ±1 day · `↑/↓` ±7 days · `Home`/`End` start/end of week · `PageUp`/`PageDown` ±1 month · `Enter`/`Space` selects. ⚠️ Arrows move **focus only** — they must **not** select, or `aria-selected` follows focus and browsing becomes committing.
- **Day announcement** → the full localized date plus state, e.g. *"Tuesday, 8 September 2026, selected"* / *"…, unavailable"*. ⚠️ **WCAG 2.5.3** (per #1172): the accessible name must **contain the visible text**, which is the bare number — every natural date format does, but a format that spelled the number as a word would not.
- **Month changes** need an `aria-live="polite"` announcement of the new month/year, since the library provides none.
- ☠️ **`Prev`/`Next` must be given translated `aria-label`s**, overriding the library's hardcoded English.

### The patch

`components` is already threaded from the picker root through `days.js` into every `Day`, so the patch surface is minimal: add an optional **`components.dayProps?: (day: CalendarDay) => object`** and spread it onto **both** `Pressable` branches in `day.js` (the `components.Day` branch and the default branch), plus the matching `types.d.ts` entry. Everything else — `aria-label`, `aria-selected`, `tabIndex`, `onKeyDown` — is then supplied by our own code, and RNW forwards those to the DOM (which is exactly how `useRovingFocus` already works elsewhere in this app).

⚠️ Precedent and hazard: the repo already ships `patches/react-native-sortables+1.9.4.patch` with `patch-package` on `postinstall`, so the mechanism is established — but the patch filename **pins the version**, so a `react-native-ui-datepicker` bump silently drops it. The spec must say the patch is re-verified on any upgrade.

### The inline `HH : MM` control

- **Composed accessible names** — `"Sleep reminder time, hour"` / `", minute"`, so context survives regardless of group-name support. New keys in both locales.
- **No auto-advance.** Focus never moves unless the user moves it — one behaviour to build and test, and it does not disorient switch or screen-reader users.
- **AM/PM**: the accessible name must **contain** the visible "AM"/"PM" (WCAG 2.5.3, #1172), so the segment labels are the name — do not substitute "morning"/"afternoon".
- **The silent revert is an unidentified error.** #981's contract keeps an invalid entry from committing and snaps the field back on blur — a **visual-only** cue today. Ruled: announce the revert through a polite live region scoped to the control, firing only when a revert actually happens. *(My call, not an owner ruling — flagged as reversible.)*
- **Target size** (from #1231): the `HH`/`MM` inputs must **fill the control's height** (36 compact / 48 field) rather than render as 22 × 19 text boxes, and AM/PM needs real padding — ⚠️ `hitSlop` does not enlarge a hit area on web.

### The trigger

Announces **label plus value**, composed: *"Target date, 8 September 2026"* and *"Target date, no date set"* when unset. ⚠️ Today `DateField` passes only the caller's `accessibilityLabel` while the visible text is the formatted date — so the accessible name **drops visible text** and risks WCAG 2.5.3. This follows the same shape #1172 settled for module chips and `sidebar-nav`'s existing `a11yKey` convention.

---

## What this constrains downstream

- **New i18n keys in both locales**: `Clear` (☠️ `common.json` has `change`, `done`, `close` but **no `clear`** — `navigation:dateBar.clear` exists but is being retired with the field), `Prev`/`Next`, the day-cell date format, the month-change announcement, the three time sub-control names, and the revert announcement.
- ☠️ **Nothing in `test/` gates any of this.** #1172 already established there is no a11y or label-in-name check anywhere in the suite, so every failure above would ship green — as they all currently do. The spec must therefore name explicit assertions rather than assume coverage: the rendered `aria-label` of a day, the presence of `aria-selected`, the tab-stop count, and arrow-key movement. ⚠️ And per #1231's lesson, assert on **rendered output**, since `getByRole` in RNTL never matches a plain `View`.
- **#1185's `PickerSheet`** now owns: focus-on-open, the non-focusable backdrop, and the `ThemedCalendar` roving-focus wiring — on top of #1231's scroll container and `p-3 sm:p-6` gutter.
- A **grid-aware roving hook** is needed (2-D, focus-only). `useRovingFocus` stays as-is for `SegmentedControl`; the calendar gets its own, or the existing hook gains `activateOnMove` plus a row stride.

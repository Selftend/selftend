## Answer

Measured, not reasoned. A throwaway probe route rendered the **real** components through a real `expo export` — today's shipped `DateTimeField` card, #1191's proposed web `datetime` composition, the date-only target-date sheet, and the reminders row carrying the proposed inline control — driven by Playwright across 300–768px, both locales. Artifacts on branch [`worktree-wayfinder-1231-phone-width`](https://github.com/Selftend/selftend/tree/worktree-wayfinder-1231-phone-width): `app/probe-1231.tsx`, `probe-1231-measure.js`, `-focus`, `-landscape`, `-gutter`, and `shot-*.png`.

**Verdict: horizontal width was never the risk. The sheet fits at every phone width in both locales. Two real failures live elsewhere — vertical overflow, and the compact 12-hour control colliding with the `Switch`.**

---

### 1. The seven-column grid cannot wrap or clip — the question was unanswerable in the negative

☠️ The ticket asked whether the day grid "fits at 327px without wrapping, clipping, or shrinking day cells". It can only ever *shrink*. `day.tsx` sizes each day wrapper at `width: '99.9/7 %'` — a **percentage**, so seven always fit on a row and the grid scales rather than reflows. Measured `maxPerRow` is **7 at every width down to 300px**, and the card's overflow probe reads **0px everywhere, in both `en` and `bg`**.

Cell *height* is likewise fixed and width-independent: `minHeight: (containerHeight - weekdaysHeight) / 6` = `(300 − 25) / 6` = **45.83px** at every viewport.

### 2. `max-w-[340px]` never binds on a phone — the `p-6` gutter is what sizes the card

The cap only engages at viewport **≥ 388px**. Below that the modal's `p-6` container governs, so the sheet renders below its designed width on essentially every phone:

| viewport | card | picker content | day cell | **actual tap target** |
| --- | --- | --- | --- | --- |
| 320 | 272 | 248 | 35.4 | **32.4 × 42.8** |
| 360 | 312 | 288 | 41.1 | **38.1 × 42.8** |
| 375 | 327 | 303 | 43.2 | **40.2 × 42.8** |
| 390 / 430 | 340 (capped) | 316 | 45.1 | **42.1 × 42.8** |

☠️ **The tap target is smaller than the cell you see.** The library's `<button>` is inset ~3px inside its wrapper, leaving **3px dead gutters between adjacent day targets** (measured: `[3,3,3,3,3,3]` across a row). So the pressable is 42.1 × 42.8 at best, not the 45.1 × 45.8 the grid draws.

☠️ **42.1 × 42.8 is a ceiling, not a phone problem.** Because the cap is 340, `(340 − 24) / 7 − 3` ≈ 42.1 — a 44 × 44 day target is unreachable at **every** viewport, desktop included. Reaching 44 would need the card ≥ 353px, i.e. raising the cap, not just shrinking the gutter. Everything measured still clears **WCAG 2.5.8 AA (24 × 24)** comfortably; it is Apple's 44pt guidance that is missed, by ~2px.

### 3. ☠️ Bulgarian is *not* the width stress case for the calendar

The ticket predicted the `bg` month name would pressure the header. Measured: **"септември" 80.5px vs "September" 79.3px** — 1.2px apart, inside a 191px header slot. **Nothing clipped in either locale at any width.** Weekday labels render in the 2-character `min` format and are never tight.

The footer is a non-issue too: `Clear` 58.6 + `Done` 96 inside a 248px minimum content width leaves **≥81px spare at 320px**. The #1184 footer fits everywhere, and the `ghost` variant the sheet needs for a quiet `Clear` **already exists** in `buttonVariants` — #1184's "the sheet does not have a low-emphasis button style" is true of the sheet, but not of the button primitive.

### 4. The real failure is vertical, and it already ships

Card heights are **width-invariant** (identical at 320 and 430), so this is a pure window-height question:

| sheet | card height | window height needed |
| --- | --- | --- |
| A — shipped `DateTimeField` | 469 | 517 |
| C — proposed date-only | 465 | 513 |
| **B — proposed web `datetime`** | **521** | **569** |

- Portrait 375 × 667 (layout viewport): 619 available — all three fit.
- **iPhone SE with Safari toolbars (~553 usable): 505 available — the proposed `datetime` sheet misses by 16px.** Date-only and today's shipped picker still fit. So #1191's composition is precisely what tips this over.
- ☠️ **Landscape phone (667 × 375): 327 available — every variant overflows, including the picker shipping today.**

The failure mode is the bad one: the modal is `flex-1 items-center justify-center p-6` with **no scroll container**, so overflow splits top *and* bottom and the footer — `Done`, the only commit affordance under ruling 6 — is **clipped and unreachable**.

### 5. The reminders row — ☠️ the ticket's framing was inverted

At **every** phone width the row sits in its **stacked** branch (`wide` flips at exactly 640, confirmed at 639/640), and stacked is the **roomy** face: the control gets its own line and never competes with the label. The ticket's "confirm the breakpoint lands before the row overflows" assumed the opposite.

- **24-hour (`bg`)**: control **77.8 × 36**, ~135px spare at 375. Fine at every width.
- **12-hour (`en`, with AM/PM)**: control **175.5 × 36**. Its right edge is pinned at **x = 250.5 regardless of viewport** (it is laid out from a fixed left offset at content width), while the `Switch`'s left edge moves with the viewport. They cross at **≈324px**:

| viewport | 300 | 310 | **320** | 330 | 338 | 360 |
| --- | --- | --- | --- | --- | --- | --- |
| overlap with `Switch` | 23.5 | 13.5 | **3.5** | clear | clear | clear |
| overflows its own `flex-1 min-w-0` body | 37.5 | 27.5 | 17.5 | 7.5 | 0 | clear |

At 320 the `PM` pill **paints over the `Switch`** — visually confirmed in `shot-row-320.png`; `shot-row-360.png` shows it clear. Note it overflows its *body box* from 338 down, eating the `gap-[14px]` before it reaches the switch, so the row looks crowded before it looks broken.

- **Tap targets inside the compact control** (the ticket's "36px is the tightest this gets" worry — confirmed): AM/PM tabs measure **43.2 × 24**, i.e. *exactly* the WCAG 2.5.8 AA floor with zero margin, and `SegmentedControl` carries **no `hitSlop`** while every neighbouring control uses `COMPACT_CONTROL_HIT_SLOP` (14). The `HH`/`MM` inputs measure **22 × 19** in the naive composition — below the 24 × 24 floor, surviving only on the spacing exception.

---

## Rulings (owner, 2026-08-20)

1. **The supported floor is 360dp.** The AM/PM ↔ `Switch` collision exists only below ~324px, so at a 360 floor it cannot occur on a supported device and needs no code change. ⚠️ **The spec must state 320dp is unsupported** rather than leaving it silently broken — this is the whole reason the collision is not being fixed.
2. **The picker sheet scrolls.** `PickerSheet` (#1185) gains a scroll container so overflow is reachable instead of clipped. One change to the primitive that fixes the SE-with-toolbars case, fixes landscape, **and fixes the already-shipped picker**, which breaks there today.
3. **The modal gutter becomes breakpoint-aware; the 340px cap stays.** `p-3 sm:p-6` on the sheet's container.

### The gutter value is measured, not chosen by taste

Re-laying out the same rendered DOM at each candidate padding:

| gutter | 360 (the floor) | 375 | 390+ |
| --- | --- | --- | --- |
| `p-6` (today) | 38.1 | 40.2 | 42.1 |
| `p-4` | 40.4 | **42.1** (cap reached) | 42.1 |
| **`p-3`** | **41.5** | **42.1** | **42.1** |
| `p-2` | 42.1 | 42.1 | 42.1 |

`p-3` lifts the day target from **38.1 → 41.5 at the 360 floor** and reaches the 42.1 ceiling from 364px up, without the visually cramped 8px gutter. `sm:p-6` restores today's gutter from 640px, where the cap binds anyway and the gutter is purely visual.

---

## What this constrains downstream

- **#1185 (`PickerSheet`)** gains two requirements it did not have: a **scroll container**, and **`p-3 sm:p-6`** on the modal container. Both belong to the primitive, not the modes, so all four fields inherit them.
- ✅ **A scroll container is safe here**, and this was checked rather than assumed: `PanResponder`/gesture code appears in **exactly one file** in the library — `time-picker/wheel-web.js`. The calendar itself has **no swipe or pan gesture**, so nothing competes with a vertical scroll. (It also independently corroborates #1191's finding that the library's web time control is a bare drag surface.)
- **#1191's inline control** must size its `HH`/`MM` inputs to **fill the control's height** (36px compact / 48px field) rather than sit at the 19px text box the naive composition produces, and its AM/PM segment wants `COMPACT_CONTROL_HIT_SLOP` like its neighbours. Recorded as an amendment on #1205, which owns the control's a11y contract.
- **#1187's proof plan** gains a cheap, high-value assertion: card height is width-invariant, so **one height assertion at a phone viewport** catches any future composition that re-breaks the vertical fit. The existing `reducedMotion` and phone-width blind spots stay accepted as recorded.
- ☠️ Found in passing and **not** caused by this map: at the newly-ruled 360dp floor, the longest Bulgarian reminder label — *"Дневник на благодарността"* — needs **213px but gets 198px and ellipsizes** to "Дневник на благодарно…". It truncates at 320 and 360 today, independent of the time control. Spun out separately.

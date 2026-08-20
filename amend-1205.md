
---

## ⚠️ Amended by [Do the picker sheet and the inline time control work at phone width?](https://github.com/Selftend/selftend/issues/1231)

#1231 measured the proposed inline control as rendered, and it hands this ticket a **fourth sub-control question: target size**, alongside the naming and focus questions above.

Measured in the `compact` (36px) variant at 390dp:

| sub-control | rendered target | WCAG 2.5.8 AA (24 × 24) |
| --- | --- | --- |
| `HH` input | **22 × 19** | ✗ below the floor |
| `MM` input | **22 × 19** | ✗ below the floor |
| AM/PM tab | **43.2 × 24** | ✓ exactly at the floor, zero margin |

- ☠️ The **19px input height is a composition artifact, not a font floor** — the inputs sit as unstretched text boxes inside a 36px container. The spec must require them to **fill the control's height** (36 compact / 48 field), which alone clears the AA floor and roughly doubles the touch area. Decide it here rather than leaving it to whoever builds the control.
- ☠️ `SegmentedControl` carries **no `hitSlop` at all**, while every neighbouring compact control on that row uses `COMPACT_CONTROL_HIT_SLOP` (14). At 24px tall and sitting flush against the `Switch` on the reminders row, the AM/PM segment is the one control on the line with no slop. Note ⚠️ **`hitSlop` does not enlarge the hit area on web** — RNW targets the DOM box — so on web this must be real padding, not slop.
- For reference, the calendar's own day cells measure **42.1 × 42.8** with **3px dead gutters** between adjacent targets (the library insets its `<button>` inside each cell). They clear AA comfortably but miss Apple's 44pt; #1231 ruled that acceptable and fixed the gutter instead. The time control should not end up with *smaller* targets than the calendar it sits beneath.

⚠️ Scope note: #1231 ruled the supported floor at **360dp**, so this ticket's answers only need to hold at ≥360.

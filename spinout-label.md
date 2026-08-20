Found while measuring the reminders row at phone width for #1231 (part of #1175), but **not caused by that map** — this is shipped behaviour today, independent of any picker or time-control change.

## What happens

On the reminders screen, `notification-target-row.tsx` renders the target name with `numberOfLines={1}`. In Bulgarian the longest label — **"Дневник на благодарността"** (Gratitude journal) — needs **213px** but the row's body box gives it less at phone widths, so it ellipsizes:

| viewport | body width | label needs | result |
| --- | --- | --- | --- |
| 320 | 158 | 213 | truncated — "Дневник на благод…" |
| 360 | 198 | 213 | truncated — "Дневник на благодарно…" |
| 375 | 213 | 213 | fits, with 0.2px to spare |
| 390+ | 228+ | 213 | fits |

Measured from a rendered static export at 15px `font-semibold` Noto Sans, not estimated. Screenshots: `shot-row-320.png` / `shot-row-360.png` on branch `worktree-wayfinder-1231-phone-width`.

## Why it matters now

#1231 ruled the supported floor at **360dp**. That makes this a truncation **inside the supported range**, not on an unsupported edge — and 375 clears it by 0.2px, which is not a margin.

The arithmetic behind the squeeze, at 320: `320 − 48 (screen p-6) − 2 (card border) − 32 (card px-4) − 20 (icon) − 14 − 14 (gaps) − 32 (Switch) = 158px`.

## Notes for whoever picks this up

- The row already has a stacked phone branch (`items-start gap-1` below 640), and at phone widths the label is **already on its own line** — so the fix is not "stack it", it is already stacked. The line is simply narrower than the longest translation.
- ☠️ Do not "fix" this by widening the `min-w-[150px]` floor — that floor only applies in the `wide` (≥640) branch, which is not where the truncation happens.
- Candidate fixes: allow two lines at phone width (`numberOfLines={2}`), or shorten the Bulgarian string in the `notifications` namespace. The latter is a translation change and goes through Weblate.
- `NotificationRowSkeleton` shares the breakpoint and would need to match whichever height results — a skeleton at the wrong height is a layout jump dressed as a loading state (the #981 lesson).

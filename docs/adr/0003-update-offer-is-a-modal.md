# ADR-0003: The update offer is a modal, superseding #388 §3's inline strip

Date: 2026-08-26 · Status: accepted · Origin: #1142 (map; owner ruling
2026-08-20) · Supersedes: #388 §3 · Recorded by: #1146 / #1476

## Context

#388 §3 ruled the update offer an "app-shell inline strip, never overlaying
content/toasts, no focus stealing, no live-region interruption" — an overlay
was considered then and rejected on calm-product grounds. In practice the
strip went unnoticed and unacted-on, and the owner overturned the ruling: the
offer became an in-app modal (web + Android, authenticated shell only). This
record exists so the reversal reads as a decision, not an accident — #388's
text still says "never overlaying", and without this ADR an agent or reviewer
finding it would "fix" the popup back into a strip.

The reversal is **total, not clause-by-clause**. Every react-native-web
`Modal` steals focus by construction (`ModalFocusTrap` runs
`focusFirstDescendant` on activation), so §3's "no focus stealing" could only
be replaced, never softened — keeping any one clause would have forbidden the
modal outright (#1146). All four clauses are dead together.

## Decision

The update offer renders as a modal dialog (`src/components/app/update-popup.tsx`),
judged against three constraints that replace §3:

- **C1 — the destructive default is never the focused default.** Initial
  focus lands on "Later", never on the platform action. The mechanism is
  button tree order, not a ref: `focusFirstDescendant` focuses the first
  `role="button"`, and "Later" is first on purpose. The only automated proof
  of the property itself is `test/e2e/update-popup.e2e.test.ts` — jest runs
  the native preset, where the focus trap never executes.
- **C2 — one appearance per version; anything that closes it, closes it for
  that version.** Every close path persists `updateBannerDismissed:<version>`:
  "Later", web Escape, Android back (all one `onRequestClose` handler), plus
  `act` on Android only (backing out of Play must not resume into the same
  modal; on web the reload itself is the suppression, so web `act` writes
  nothing). A _suppressed_ offer was never shown, so suppression is not
  dismissal and persists nothing.
- **C3 — two labelled buttons; no X, no bare glyph, no scrim tap.** A
  pressable scrim cannot coexist with C1 — react-native-web's `Pressable`
  always emits a tabIndex and `attemptFocus` focuses programmatically, so a
  scrim before the card in tree order wins initial focus (measured, #1153).

What #388 reaffirmed stays reaffirmed: **no forced updates, no
minimum-version gate, ever**; the offer appears at most once per version; iOS
ships nothing (no device-side availability signal exists); nothing new is
persisted beyond the per-version dismissal.

## Consequences

- The generalized rule lives in AGENTS.md (Review guidelines → Retention &
  product guardrails): an unprompted modal is permitted only when triggered
  by a fact about the app — never the user's behaviour or absence — at most
  once per fact, dismissible by every close path, with the irreversible
  action never the default.
- Timing is per-platform on purpose (web re-checks on foreground with a 6h
  throttle; Android is launch-only with no `AppState` listener) — the
  reasoning lives in `src/lib/use-update-availability.ts`'s docblock; a
  "unify the platforms" cleanup would reintroduce the mid-session Android
  modal.
- The popup is the single overlay exempt from the #1473 overlay-count
  registry: its own trigger gates on that count, so self-registration would
  oscillate the offer.
- #388 §3's other surfaces are untouched: the landing page's Android download
  bar and the rest of #388 remain as ruled.

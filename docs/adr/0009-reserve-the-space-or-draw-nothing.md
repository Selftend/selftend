# ADR-0009: A loading surface states nothing it does not know, and reserves the space it will occupy

Date: 2026-09-12 · Status: accepted · Origin: #2327 (map; #2334 ruled the
convention, #2341 ruled its enforcement) · Recorded by: #2345

## Context

Two conventions for "what a surface draws while its data is in flight" were live
in this repository at once, each documented, each pinned by a passing test, and
each reading as a refutation of the other.

`src/features/home/tool-row-stats.tsx` said it in three words — "Never a dash,
**never a skeleton**" — and rendered `null`. `notification-target-row.tsx` said
the opposite in as many: a wrong-height skeleton is "a layout jump dressed up as
a loading state" (#981), and it ships `NotificationRowSkeleton`, which reserves
the row's exact height by rendering the real content at `opacity-0` beneath a
grey bar.

**They were never opposites.** "Never a dash, never a skeleton" is an honesty
rule stated as though it settled a layout question. A grey bar that reserves
height while asserting nothing satisfies both halves. This ADR is the synthesis,
not a winner.

The cost of leaving the halves apart was found on a volunteer's user test
(#2327): on the check-in editor a bare `ActivityIndicator` stood in for the
emotion grid, the Note field sat immediately below it, and the collapse landed a
tap meant for Note on `sad` — index 11 of 22. **That is an input-integrity
defect, not a cosmetic one.** A layout shift under a finger is the app taking an
action the person did not choose.

The shift is **292px at 390dp** — the Note field's top edge moves from y=609 to
y=901. That figure is measured rather than estimated: it is what the guard below
reported when it was first run against the unfixed code. Every pixel number in
the tickets behind this ADR was derived from class strings, and the closest of
them said ~250px, which is why edge 4 prefers a technique that needs no number
at all.

### What the sweep actually found

Three premises worth writing down, because each one was wrong before it was
checked:

☠️☠️ **There are three loading conventions here, not two.**
`src/components/app/screen-state.tsx`'s `LoadingState` / `ErrorState`, governed
by the documented **rule R3** (a whole-screen stand-in must still carry
`ScreenTopBar`), is a third — already repo-wide, already working, and already
satisfying clause 2 by owning the entire screen. It is named below and **left
alone**.

☠️ **The shift bucket is four sites, not an epidemic.** Of **65**
`ActivityIndicator` render sites: 53 sit inside a fixed-size control (a Button
slot — no shift is possible), 5 are whole-screen gates, 10 are other, and
**four** substitute for content with a sibling below to push:
`mood-entry-editor-screen.tsx`, `mood-tracker-screen.tsx`,
`journal-list-screen.tsx`, `manage-emotions-modal.tsx`. The report named one of
the four.

☠️ **Home is a different mechanism.** `ToolStat` returns `null` — no spinner is
involved at all. A rule written only about spinners would miss the very case
that prompted it, so this ADR governs **spinner-substitution and
null-substitution alike**.

## Decision

### Clause 1 — honesty (kept, unweakened)

**A loading surface never states a fact it does not have.** No dash, no "Nothing
yet", no fabricated figure, no placeholder number. `undefined` from a query
means "not loaded", which includes a failed fetch with no cache — and claiming
emptiness there erases a real history.

### Clause 2 — reservation (added)

**A surface that will occupy space reserves that space while the outcome is
unknown.** The space is part of what the surface owes the reader; giving it back
and taking it again is a shift, whatever is or is not drawn in it.

### Scope

**`src/` and `app/`, both, said here in as many words.** The natural compliance
check is a grep, and a `src/`-only grep cannot see the `app/` router tree — which
holds six of the files this rule reaches.

## The edges

1. **Reservation belongs to the PENDING state, not to the slot.** Reserve while
   pending; once the query settles, render the truth and collapse if there is
   none.

   ⚠️ **This converts a shift-on-success into a rarer shift-on-failure. It is a
   trade, not an elimination, and this ADR does not claim one.** It is a good
   trade because success is the common path. It is also what keeps `ToolStat`
   honest: `null` there covers a failed fetch with no cache as well as a pending
   one, and eight permanently reserved dead slots on Home would be a worse
   surface than the shift they prevent.

2. **A visible fill is itself a claim — it says _content is coming_, and how
   much.** So: **fill visibly only where arrival is guaranteed** — the row
   exists and only its data is pending, as in `NotificationRowSkeleton`, whose
   registry is static and whose ten rows are known before any query resolves.
   **Otherwise reserve blank**, or hold the space around a contentless signal
   such as a spinner. The a11y and contrast rules below therefore bind only the
   filled case.

3. **Where the fill is visible**, two findings are promoted from local practice
   to the rule:
   - It is **hidden from the accessibility tree on all three platforms** —
     `accessibilityElementsHidden` and `importantForAccessibility` for iOS and
     Android, `aria-hidden` for web, which implements neither of the first two.
     A reserved placeholder a screen reader announces is a worse defect than the
     shift it fixes, and a measuring stick built from real content puts real
     words in the DOM.
   - It fills with **`bg-muted-foreground/25`, never `bg-muted`**. `bg-muted`
     measures about **1.10:1** on a card and is invisible (#725);
     `muted-foreground/25` measures 1.41 light / 1.68 dark — faint on purpose,
     but there. This is a property of the token, not of one row, and `bg-muted`
     is the obviously-named thing anyone will otherwise reach for.

4. **Preferred technique: render the real content at `opacity-0` beneath the
   fill**, sharing the frame constants so the two cannot drift. **It needs no
   measured pixel number**, which is the entire point — every pixel figure in
   the tickets behind this ADR was derived from class strings rather than
   measured in a browser, and a number nobody re-measures is a number that goes
   stale silently. `ReservedSpace` in
   `src/components/app/reserved-space.tsx` packages it for the whole-region
   case — one stick, one signal drawn over it — with the a11y hiding and the
   fill token attached.

   ⚠️ `NotificationRowSkeleton` is where the technique came from, and it still
   builds its own: it interleaves a stick and a fill **per element** rather than
   overlaying one on one, which `ReservedSpace` does not express. It shares the
   fill token and nothing else, so a change to `ReservedSpace`'s hiding does not
   reach it — touch both, or give `ReservedSpace` the per-element shape first.

5. **When the final height genuinely is not knowable**, move the content to the
   **end of its scroll column** so nothing sits below it to push. This is not an
   invention: `load-more-footer.tsx` and `act-values-screen.tsx` already do it,
   which is why neither is a shift site despite substituting content.
   `manage-emotions-modal.tsx` is the real instance. Fallback, only where
   position cannot move: reserve one item's worth. **A guessed fixed height is
   rejected** — it is a layout shift with extra steps.

   ⚠️ **Edge 5 assumes the column's CONTAINER has a definite height, and had
   been assuming it in silence** (#2360, found while building the instance
   above). Putting the content last stops it pushing its siblings; it does
   nothing about a container that is itself sized by that content, which then
   grows and carries everything _above_ the content with it. The named instance
   is both cases at once: native is a `pageSheet` at `flex-1` and genuinely
   fixed, while the same panel on web hugs its content by design (2E/#905) and
   still settled.

   **This records the precondition and stops short of a convention, because the
   class has one member.** A sweep of every overlay in `src/` and `app/` found
   the content-hugging web panel nowhere else — the others are full-height or
   bottom-anchored under a `max-h`, and none of the ones that do grow holds
   pending remote content. How that single instance was settled (shutting the
   surface that opens it while the read they share is pending, rather than
   sizing the panel) is written at its own call sites, not generalised here.
   Giving the container a height remains the guess this edge already rejects,
   one level up.

6. **Rule R3 is the full-screen instance of clause 2, and is left alone.** A
   whole-screen stand-in reserves the whole screen by construction.
   `screen-state.tsx` already satisfies this ADR by another route; rewriting a
   working convention to fit a new document is churn, and leaving it unnamed
   invites the next agent to "fix" it into compliance with a rule it already
   keeps.

7. **`tool-row-stats.tsx` is amended, not exempted.** Under the synthesis its
   sentence is half-right, and it is the exact wording that propagated the
   collapse into Home. Its test's substance survives — nothing claimed, no dash,
   no "Nothing yet" — only the "not a skeleton" clause changes. An exemption
   would have frozen the contradiction into the codebase while this document
   said otherwise.

## Enforcement

**One Playwright spec, deliberately — not a repo-wide metric, and not review
alone.** `test/e2e/loading-reserves-space.e2e.test.ts` stalls the
`emotion_preferences` read on the check-in editor, measures the Notes field,
releases the request, and asserts the field's `y` is **identical**.

Three properties of that spec are load-bearing, and each is there for a reason
the next person will otherwise undo:

- ☠️ **A CLS-style "this surface never shifts" metric would fail on behaviour
  edge 1 explicitly permits.** The guard does not have to separate the forbidden
  shift from the permitted one at runtime — **the fixture chooses the path.**
  Seed the rows and arrival is guaranteed, so the permitted shift-on-failure
  cannot occur in that spec and any movement is forbidden by definition.
- ☠️ **It asserts on the element _below_ the region, not on the region's
  height.** That is the definition of a layout shift rather than a proxy for
  one; it needs no `testID` on the spinner, which carries none; and it therefore
  **survives the spinner being replaced**, which edge 2 expressly permits.
- ☠️ **Exact equality, not a tolerance.** With the route stalled both
  measurements are deterministic. If it flakes, find the cause — widening the
  tolerance is a regression of this decision, not a fix.

**A jest assertion cannot replace it.** NativeWind resolves no width into
`props.style` under jest, so a reserved-height assertion there is _vacuously
green_ — it passes without testing anything. The reasoning is spelled out at
`item-card.tsx`. Any real guard must run in a real engine.

**Coverage is one site, on purpose.** Four near-identical specs assert one rule
four times and quadruple maintenance for no additional coverage _of the rule_.
Review carries the remaining sites, which is what review is for. The check-in
editor was chosen because its shift is the input-integrity one.

## Consequences

- The check-in editor holds the emotion grid's space while the preferences query
  is in flight. A user who has pruned the emotion list still sees a smaller
  settle: the stick is built from the default set, which is what every
  first-ever user is seeded with. **A reduction, not an elimination** — edge 1's
  trade, stated again where it actually lands.
- Three sites remained to convert when this was written, and all three now are.
  `mood-tracker-screen.tsx` (#2346) and `journal-list-screen.tsx` (#2347) reuse
  `ReservedSpace` under edge 4. `manage-emotions-modal.tsx` (#2348) does not,
  and could not: it is edge 5's named instance, so "Add emotion" moved above the
  grid and the grid went last in its scroll column, with nothing left below it
  to push. The sweep is closed. ⚠️ The prediction in this bullet's first
  draft — that all three would reuse `ReservedSpace` — was wrong about the one
  site the edges themselves had already singled out.
- ⚠️ **Replacing a spinner costs five test rewrites.** Five assertions pin
  `ActivityIndicator` by component type via `UNSAFE_getByType`
  (`act-committed-action-detail-screen.test.tsx`, `coping-plan.test.tsx` ×2,
  `meditation-sessions-screen.test.tsx` ×2). None of them is a shift site, so
  they are left alone — but the bill is on the record, and a blanket
  find-and-replace across the 65 spinner sites will hit them.
- `notifications-screen.tsx` swaps a **Button** for a spinner with sibling cards
  below — a small, bounded shift that is neither a whole-screen gate nor a
  content substitution. It is not ruled here; decide it against this ADR when it
  is next touched.

## Alternatives rejected

- **A synchronous first paint of the emotion constants.** Already considered and
  rejected for its own reasons (`use-emotion-display.ts`): the database is
  authoritative and the constants must not flash, because a user who removed an
  emotion would watch it reappear. Reserving height with the same constants
  rendered **invisibly** avoids both horns — the list is there for its size, and
  never for its content.
- **A guessed fixed height.** Rejected at edge 5. It is a layout shift with
  extra steps, and it goes stale the first time the type scale or the locale
  moves.
- **No enforcement, review alone.** A defensible answer, and recording _that_
  would have been worth as much as recording a guard. What costs is recording
  nothing: the convention was ruled once, wrote down no enforcement, and the
  question came back as a ticket three weeks later.

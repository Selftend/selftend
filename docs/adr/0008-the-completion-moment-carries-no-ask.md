# ADR-0008: The completion moment carries no ask

Date: 2026-09-12 · Status: accepted · Origin: #2327 (map; #2330 ruled it on the
evidence gathered in #2329) · Supersedes: ADR-0004's Investment carve-out ·
Recorded by: #2342

## Context

ADR-0004 ruled **retention by return, not engagement**, and refused Eyal's
facilitator playbook whole. Its Investment bullet granted exactly one exception:

> Loading the next trigger at the investment moment survives only in its
> consented form (the once-ever post-completion reminder offer).

The carve-out was granted on the strength of the word **once-ever**. The
shipped code never implemented that word. `ReminderPromptCard` was eligible
once **per tool**, across ten notification targets, raised from 27 mutation
`onSuccess` handlers — so one person could be asked ten times about one
underlying question. A passing test asserted the per-tool scoping as intended
("stays eligible for other tools when a different tool was prompted"), which is
why eight weeks of review never caught it: the code, its test and its comment
all agreed with each other, and only the ADR disagreed.

A user-testing session (#2327, 2026-09-11) surfaced it from the outside: one
reviewer was asked seven times in a single sitting, and reported declining
every time. He had not been ignored — the decline was never recorded at all.
The only write happened **on show**, and "No thanks" was `setActiveTarget(null)`,
local state. Declining and navigating away were byte-identical.

### What the evidence said (#2329, read from production)

- **Repetition is measured fact, not a sample.** Of the twelve people ever
  offered a reminder, **seven were offered more than once**; worst case seven
  times in one sitting. ADR-0004's "once-ever" had already been breached for a
  majority of the affected population.
- **Acceptance is unmeasurable and small.** At most five target-enables, across
  three people, from the 27 offers that ever reached an external user — a
  ceiling rather than a count, because only two surfaces set an enabled flag
  and the stored time cannot discriminate them. Two other people enabled a
  reminder from settings having never seen the offer at all, so an unknown
  share of those five would have happened anyway.
- **A failed write silently re-arms it.** The `reminder_prompted_tools` append
  was fire-and-forget (`.catch(() => {})`), so even a correct once-ever flag had
  to survive a failed persist. The counts above are a floor.

Against the product's own doctrine the card fails twice over.
`docs/product-principles.md` §12 grants no carve-out at all — its Reward bullet
is _"completion copy states the record and stops"_ — and the card appended an
ask to a moment that was supposed to end. `AGENTS.md`'s unprompted-modal rule
asks for a trigger that is a fact about the app, never the user's behaviour;
the card's sole trigger was a completed save.

## Decision

**No ask belongs at the completion moment.** ADR-0004's Investment carve-out is
withdrawn. The post-completion reminder offer is removed outright — the card,
its store request, its eligibility predicate, and every `onSuccess` call site
that raised it.

**Nothing replaces it.** Not a quieter card, not a text link, not a once-ever
version of the same ask. A lower-volume ask is still a step appended to a moment
§12 says must state the record and stop. This is deletion, not relocation.

The rest of ADR-0004 stands whole. Only the parenthetical at its line 47 dies,
and it dies here rather than by an edit there: amending that line in place would
erase the most instructive thing on the record — that the carve-out was granted,
implemented wrong for eight weeks, and withdrawn on evidence.

### Why removal strands no capability

Reminders stay exactly as discoverable as they were, without asking anybody:

- a stateless reminder bell on **all twelve** tool home screens
  (`module-home-header.tsx`, one ruling for all of them in #967), deep-linking
  to `/notifications?target=<tool>` and scrolling that tool's row into view;
- the settings card (`settings-screen.tsx`) and the sidebar item
  (`sidebar-nav.tsx`);
- `/notifications` itself, which **arms the OS channel** in three places.

☠️ The card's own source comment claimed otherwise — _"This card IS the ask
(#981) … the contextual prompt after a completed session is where the channel
gets armed"_ — and it was stale. Verify a necessity claim against its callers
before believing it; a comment is not evidence that the thing it defends is
load-bearing.

## Consequences

- **The unprompted-modal rule binds non-`Modal` overlays.** The subject of
  `AGENTS.md`'s rule is the unprompted _interruption_, not the React component
  name. An opaque, interactive, full-bleed-at-360px card covering a screen's
  actions is what that rule exists to constrain, and letting it escape on a
  component-name technicality makes the rule trivially routable-around. Stated
  in `AGENTS.md` in as many words, so it is settled rather than re-litigated.
- ☠️ **The starter-routine offer changed as a forced consequence.**
  `StarterOfferCard` did not merely yield visually — it called
  `isReminderPromptEligible` as its own gate ("the reminder prompt wins this
  save"). Deleting the predicate deletes that gate, so the starter offer now
  fires on the **first** qualifying save, which is what #1677 intended before
  the reminder card began taking the first qualifying save for each of ten
  tools in turn. The deferral is deleted, not replaced with a fresh one: with
  one floater there is nothing to yield to.
- **`reminderConsent` / `reminderConsentUpdatedAt` stay**, and they are not the
  same kind of thing. They record consent to the reminder _channel_, not to this
  prompt, and are written on every target enable and by the routine editor.
  ⚠️ **`reminderConsent` remains load-bearing**: `send-web-reminders` skips any
  user whose consent is falsy, so it is a hard delivery gate read on every send,
  and nothing here touches it. Only **`reminderConsentUpdatedAt`** is orphaned —
  consent-false-with-a-timestamp was how the removed predicate recognised a
  decline, and nothing else has ever read the date. It is kept anyway: a consent
  trail nothing reads is still a consent trail, and retiring one is a privacy
  call in its own right, not a loose end of this change. The genuinely dead half
  — a global decline branch nothing in the app could ever write — dies for free
  with the predicate.
- **`reminder_prompted_tools` is dropped**, column and rows — done in #2343,
  `20260915000000_drop_reminder_prompted_tools.sql`, which re-declares
  `export_user_data` without it in the same migration. It recorded only _"the
  app asked you"_: no user value, and with the offer gone, no reader. Data
  minimisation. An older shipped build that still sends the column is not
  broken by the drop — `updateUserPreferences` answers PGRST204 by dropping the
  unknown key and re-upserting — so this did not have to wait on a release.
- The post-save moment now carries **at most one offer, once ever** — the
  starter-routine offer — and nothing else.

## Alternatives rejected

- **Fix the implementation to match the word: make it genuinely once-ever.**
  The obvious repair, and it was drafted as its own ticket (#2331) before this
  ruling invalidated it. Rejected because the evidence answered a prior
  question: acceptance is too thin to justify any version of the ask, while the
  cost is measured. A correctly-implemented once-ever ask is still an ask at a
  moment ruled to state the record and stop.
- **Keep it, quieter** — a muted line, a text link, a non-covering strip.
  Rejected: volume was never the objection. §12's bar is "fulfilling, and
  done", and a done moment with a question on it is not done.
- **Move it elsewhere** — to Home, to the end of a routine, to a digest.
  Rejected: the per-tool bell already carries discoverability permanently and
  without asking, so a relocated ask adds repetition to a capability that is
  already one tap away from twelve screens.
- **Edit ADR-0004 line 47 in place.** Rejected on the house convention ADR-0003
  set: a reversed clause gets a new ADR with a `Supersedes:` header. The
  history of a granted-then-withdrawn exception is the part worth keeping.

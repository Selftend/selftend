# ADR-0010: One reminder is suggested, by placement alone; every other reminder is manual-only

Date: 2026-09-15 · Status: accepted · Origin: #2409 (map; #2412 ruled the
surfaces, #2413 the reminder and its trigger, #2414 the surviving doors, #2417
the coexistence rule, #2416 the screen) · Recorded by: #2418 · Spec:
`docs/reminders.md`

## Context

Selftend carries eleven per-tool reminders and a per-routine reminder, every one
off by default, delivered by a server cron the person arms once. Until #2342
(ADR-0008) the product _offered_ a reminder after a completed save, per tool;
that offer was removed on evidence. What was left of "suggesting a reminder" was
three surfaces of unequal kind: a stateless bell on each tool's home screen, a
post-completion offer in the continue-routine sheet that ADR-0008's reasoning
had not yet reached, and a settings card that said "You choose which ones to
turn on" without naming any.

The owner's instruction (charting, 2026-09-15) was three sentences: _don't
suggest reminders for each individual tool; do it globally, only for a general
reminder to check out the app; individual tool reminders are manual only, off
by default._ No general reminder existed. Every reminder target in the registry
is a tool, and six of the twenty-nine surfaces a target fans out to assume one
(#2415): the registry's practice gate, its Favourites-catalogue lock, the edge
function's non-empty `activitySources`, the activity-window reader, the routine
editor's overlap detector, and the glossary's definition of a reminder through
"that tool's bell".

Three doctrines constrain the answer. `docs/product-principles.md` §12: _every
nudge opt-in, off by default, traced to one explicit choice; nothing on any
channel is triggered by non-use._ ADR-0004: non-use-triggered contact is
refused, not deferred. ADR-0008: no ask at a completion moment, and the
unprompted-interruption rule binds regardless of component. A "general reminder
to check out the app" sits one careless clause away from all three - _remind me
if I haven't opened it_ is exactly the get-back-on-track contact ADR-0004 names.

## Decision

**The product suggests exactly one reminder - the general one - and suggests it
by placement alone. Every other reminder is manual-only: reachable, never
offered, off by default.**

Three sentences carry the rule, each ruled on its own ticket, quoted here so
they are cited from one place:

1. **A door is not an offer: it opens only on the person's own tap, states
   nothing, and asks nothing; the one suggestion is the placement of the general
   row on the screen every door opens onto.** (#2414) The eleven bells stay,
   stateless. The continue-routine sheet's completion-state offer is deleted -
   a post-completion ask with an unrecorded decline, the shape ADR-0008 removed
   for tools, at a moment ADR-0008 had already rejected as a relocation target.
   The settings card names the general reminder and stays a navigation row with
   no switch. Nothing is ever _shown_: no card, no flag, no trigger, so
   "suggested once" means one suggestion, not shown once.

2. **The clock is the trigger, never absence.** (#2413) The general reminder
   fires at the time the person chose, every day, identically whether or not
   the app was opened. It reads nothing about the person's day, and use does
   not cancel it. A reminder that fired _only_ when the app had not been opened
   would be non-use-triggered contact; this one fires regardless, so non-use is
   neither read nor rewarded. Per-tool suppression stays for the eleven tool
   targets - #1655's "a nudge vanishes when satisfied" needs a _satisfied_, and
   only a tool has one - and the general target declares that it never
   suppresses, as a typed rule, not an empty list.

3. **Overlap is the same work nudged twice, never the same minute. The general
   reminder names no work, so it overlaps nothing and nothing overlaps it. It
   adds at most one notification a day per device, exactly as one tool or one
   routine does; a day's total is the count of reminders the person turned on,
   never more and never fewer.** (#2417) This restates #28's invariant without
   widening it: every OS nudge traces to exactly one explicit opt-in; nothing is
   silently enabled, disabled or deduped; no note is added anywhere.

The general reminder passes the registry's practice gate as **the practice with
no named tool** - a personal schedule toward doing one thing, set by the person,
carrying no project event - and the gate's docblock is reworded to say so. It is
not an exception to the gate; it is what the gate was written to admit and
broadcasts are what it was written to refuse.

## Consequences

- **Reach is accepted as-is.** On a phone the doors are the settings card and
  the tool bells; a person who opens neither never meets the suggestion. §12's
  registration rule - _a third is not added by finding a calmer place for it;
  every surface is a step_ - is the precedent for counting suggestion surfaces,
  and it counts two.
- **The rule widens past tools.** "Manual-only" now covers the routine reminder,
  which #28 fixed as its own opt-in without ruling where it could be offered.
  Its door is the routine editor's Daily reminder section; the sheet's offer is
  gone.
- **Use is never read for the general target.** The research (#2415) priced
  "any tool used today" at twenty-one tables and up to twenty-one sequential
  reads per channel row per due tick, in the sender's zone, measuring a written
  row rather than an opened app. The routines precedent - no suppression, one
  per day per channel - is the only honest shape, and it is the one adopted.
  The configuration says `suppression: "never"` for exactly one key, and a test
  pins that the set is exactly that key, so a tool cannot slip into the
  exemption and the exemption cannot silently widen.
- **The registry's order rule changes from "catalogue order, catalogue-less
  last" to "general first, then catalogue order, then catalogue-less".** The
  catalogue lock (every target is a Favourites item with an `href`) exempts
  exactly the general target, whose destination is the screen every catalogue
  item sits on.
- **Copy avoids "check-in" and "проверка" outright**, because the mood tool is
  named Check-in and three push titles already end in it. The push reads _One
  small thing - A few minutes with whichever tool helps. Whenever you're ready._
  The row is labelled _Selftend_, so the list reads _Selftend 18:00 / CBT
  19:00_.
- **The deep link is Home**, shipped held out until the native build that
  allowlists `/` is live on both stores (#2213's two-release path, as DBT). The
  row is visible, off, with the held-out note, from the first release.
  _Dated note, 2026-09-22 (#2698): that condition is met — `/` shipped in
  v0.21.0, which is the live App Store version — so the hold-out was lifted and
  the row now takes an ordinary opt-in. The decision above is unchanged; only
  the state it describes has moved on._
- **Nothing is measured newly.** Enabling the general reminder writes
  `reminder_consent` through the same patch every target uses, so §8 of the
  engagement report counts it with no change; it gets no line of its own.
- **Counts.** The bells are eleven and the Reminders screen becomes twelve
  rows. ADR-0008 says "all twelve" tool home screens at its lines 73 and 138;
  it is amended by a dated note, not rewritten, in the build that lands the
  count sweep.
- ☠️ **What this ADR forbids next time.** A reminder or contact that fires on
  inactivity, a "skip it if they opened the app" clause on the general target,
  a second general target, a note on the Reminders screen about coexistence, a
  card or line anywhere that suggests any reminder, a switch on the settings
  card. Each was considered and each is recorded in the spec's rejected lists.

## Alternatives rejected

- **Suppress the general reminder on any tool use.** The obvious reading of
  "reminder to check out the app": don't send it if they already did. Rejected
  on cost and on honesty - twenty-one reads to learn whether a row was written,
  not whether the app was opened - and because the honest version is the one
  ADR-0004 refuses: a signal that reads absence. The clock fires regardless.
- **A line on the onboarding wizard's only panel.** The panel already carries
  the registration line and is declared the whole invitation surface by spec; a
  reminder line there is a second invitation before the person has used
  anything, one tap from the browser's permission prompt on first visit.
- **A static invitation on Home.** #960 pins Home's greeting block at exactly
  two children and "no derived prose"; ADR-0004 bars anything Home says about
  returning.
- **A once-ever card, anywhere - including correctly implemented.** ADR-0008
  bars every completion moment; the unprompted-modal rule bars a trigger that is
  the person's behaviour; ADR-0004 bars non-use. There is no moment left that is
  "a fact about the app".
- **An inline switch on the settings card.** A second arming point without the
  channel flow - it arms a reminder Settings cannot deliver, or duplicates the
  permission request, the blocked-channel card and the master switch.
- **Delete the bells too, for a cleaner "manual-only".** Deleting them voids
  ADR-0008's "removal strands no capability" argument retroactively and pushes
  every door out to Settings and the sidebar for no gain in restraint: a door
  shows nothing and asks nothing.
- **Keep the routine sheet's offer, because routines are not tools.** The seed
  ruling counts suggestions, not tools, and ADR-0008's reasoning - a done moment
  with a question on it is not done - is not tool-specific. Recording the
  decline once was the correctly-implemented once-ever ask ADR-0008 already
  rejected.
- **A time-based overlap note for the general reminder.** Would build a
  mechanism #28 declined to build for tools, and build it only for the general
  target - special in exactly the way the practice-gate ruling refused.
- **Route the general target through the routine code path, or admit an empty
  `activitySources`.** The first grows a second shape in the routine path to
  carry a per-target column; the second makes the type say nothing and turns
  the "none is exempt" test into an allowlist. A discriminant states the rule.

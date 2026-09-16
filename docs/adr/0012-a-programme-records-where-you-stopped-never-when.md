# ADR-0012: A programme records where you stopped, never when

Date: 2026-09-17 · Status: accepted · Origin: #2529 (map; #2530 ruled the facts,
#2532 priced the shapes, #2533 the guardrails, #2534 the shape and the words,
#2535 the report) · Recorded by: #2536 · Reported as: #2386 · Spec:
`docs/analytics.md`

## Context

CBT, ACT and DBT each carry a programme: an authored sequence of phases a person
enters, advances through, and either finishes or leaves. All of it lives in six
columns per module on `user_preferences` - `*_program_started_at`,
`*_program_phase_index`, `*_program_phase_started_at`, `*_program_completed_at`,
`*_graduation_dismissed_at`, `*_program_prompt_dismissed_at` - and there is no
table, no row per attempt and no event anywhere.

#2386 filed this as an erasure. `abandonProgram` nulls `*_program_started_at`
and `*_program_completed_at`, so someone who began, reached phase 3 and left
counts at no step of the engagement report's programme funnel and is absent from
its denominator too; a graduate who starts again stops counting as having
finished. The funnel says so above its first row, and `docs/analytics.md` had
been leaning on that same funnel to justify deferring client-side event
collection - the one question the deferral leaned on was the one the data could
not answer.

☠️ **The premise was half wrong, and that is what reorganised the answer.**
`abandonProgram` nulls two columns and leaves `*_program_phase_index` **and
`*_program_phase_started_at`** standing. So the app already holds, today, by
accident, a mark that a run existed and how far it got: a non-null
`*_program_phase_started_at` beside a null `*_program_started_at`. Nothing was
ever fully destroyed. What was lost is two dates.

Measured against production on 2026-09-16: zero explicit abandonments, zero
completions, zero phase advances, and ten runs sitting untouched at phase 1, the
oldest 93 days old. **The exit #2386 describes has never happened. The exit that
has happened to everyone is a run going quiet**, and nothing records that
either. Any design chosen here is chosen against ten quiet rows, which is why it
had to be a design that is correct independently of behaviour nobody has yet
exhibited.

Three doctrines bound the answer. `AGENTS.md` asks for feature-level
justification before a new data field and asks that personal data be minimised.
ADR-0004 refuses non-use-triggered contact outright, and
`docs/product-principles.md` §12 sets the bar at _fulfilling, and done_. And a
ground the map adopted in its own words: **an app must not overwrite a timestamp
with a value asserting the thing never happened.**

## Decision

**A programme records the phase you stopped at. It does not record when you
started, when you left, or that you were ever here before.**

Five rulings carry it, each made on its own ticket and quoted here so they are
cited from one place.

1. **`*_program_started_at` means _when the current run started, null when there
   is none_ - and the fossil is the record.** (#2530) Under that definition,
   nulling it on exit is the column's defined behaviour rather than a falsehood.
   `*_program_phase_started_at` outliving a null `*_program_started_at` says a
   run existed; `*_program_phase_index` says how far it got. ☠️ **Nothing may
   null `*_program_phase_started_at`.** That is a contract with a test behind
   it, not an accident of three `abandonProgram` bodies - without the pin this
   ADR is a comment.

2. **The two dates are refused.** (#2530) When a later-left run began, and when
   it was left, are not kept. Neither clears `AGENTS.md`'s feature-level bar and
   no product feature reads either. ⚠️ **`*_program_prompt_dismissed_at` is not
   a leave time and may never be read as one**: `abandonProgram` happens to
   write it, but `dismissProgramPrompt` writes the same column, so any later
   dismissal silently overwrites it. It is evidence, never a record, and no
   report may date an exit from it.

3. **A stall is a reading the report makes, never a status the app stores.**
   (#2530) A run that has gone quiet - `*_program_phase_started_at` ageing while
   `*_program_started_at` stays set - is derivable from the columns as they are.
   Nothing in this product is awake to write a status: no cron, no server job,
   no `pg_cron`, so a stored `stalled` would be wrong from the moment it became
   true until somebody next opened the app. And it would measure the wrong
   thing: the module gate (#2446) removes the door rather than the person's
   interest, so after it ships every live run stalls because of us. A stored
   status asserts a fact about a person that the product caused; a derived
   reading asserts nothing, and the report subtracts the gate's release window
   itself, because that is a release fact it already knows.

4. **A programme run is not a thing with an identity, and only the most recent
   one is visible.** (#2532, #2534) No run row, no run table, no history of
   prior passes; a start or a replay overwrites the fossil, deliberately.
   `programme_runs` is a **decided no**, not a deferred idea. ☠️ And there is
   intentionally **no _run_ term** in the product's vocabulary, symmetrically
   with routines (`CONTEXT.md`): a programme is an authored definition plus
   per-person state, and nothing represents one pass through it. Say _the
   programme_, _the phase you reached_, _starting again_.

5. **Completion is kept, and stops being erased, at no new cost.** (#2530,
   settled by the owner 2026-09-16) All three writers - `startProgram`,
   `abandonProgram`, `replayProgram` - stop nulling `*_program_completed_at`,
   which comes to mean **the last time this person finished this programme**,
   durable against every path. _Graduate of the run you are in_ becomes
   **`completed_at >= started_at`**, which is exact: `advancePhase` at the last
   phase writes only `completed_at` and never touches `started_at`, so a
   replay's fresh `started_at` retires an older completion by itself.

☠️ **The lifecycle is three states and no fourth** - _not in progress_, _in
progress_, _graduated_ - and `ProgramStatus`'s `not_started` is renamed
`not_in_progress` because the old name was false of exactly the case this ADR is
about. A fourth `left` member was considered and rejected: it would be honest
about the data while creating the capability to build a surface distinguishing
_never began_ from _began and quit_, which is what the guardrails below exist to
refuse. **The union declines to carry the left/never distinction on purpose**,
and the rename stops the name asserting something false while it does so.

### The three guardrails

Ruled on #2533, which declined to write its own ADR on the explicit
understanding that this one would carry them.

1. **The product may show _where_ you are in a programme; it may never show
   _how long_ you have been there.** _"Phase 2 of 5"_ stays - that is show the
   record, don't read it, working as intended. _"Phase 2 of 5 · started 15
   June"_, _"day 93 of this phase"_, or anything else computed from
   `*_program_phase_started_at` on a person-facing surface, does not. ⚠️ **The
   rule binds rendering, not reading**: `coalesce(phase_started_at, started_at)`
   legitimately decides which practices count as today's, in the hook and in the
   `program_widget_task_status` RPC. That is the app choosing what to show; it
   is not telling somebody about their lapse, and a reviewer applying this rule
   to the task-window reads would be applying it wrongly.

2. **A stall, derived or otherwise, may never trigger, schedule, or influence
   any contact.** Not a notification, not an email, not a badge, not the
   ordering of a surface the person did not open. `AGENTS.md` and ADR-0004
   already forbid non-use-triggered contact and ADR-0010 made every per-tool
   reminder manual-only, so this is a formality - recorded anyway because it
   will look like a kindness to whoever proposes it, and one sentence is cheaper
   than the argument.

3. **The product must never present starting again as a way to clear the
   record.** There is no per-feature erasure anywhere in the app, so once the
   fossil is contractual there are exactly two ways to remove it: delete your
   account, or start the programme again. Nobody designed that; this ADR made it
   a design. It is accepted and **never advertised** - _"start again to clear
   this"_ is a retention mechanic wearing a privacy hat, and ADR-0004 would be
   breached by the copy, not by the data.

## Consequences

- **No migration, no column, no table.** Every consequence of this ADR is client
  code, temp-view SQL, tests and docs. A fact the app already writes stops being
  deleted by three buttons; nothing new is collected.
- ☠️ **The refusals are permanent in practice.** The dates of runs already left
  are gone, recording is forward-only, and nothing can be backfilled - the ten
  runs in flight get no repair (#2535). Reopening this is on evidence, not in
  principle.
- ☠️ **The test pin is not optional.** Nothing in the repo currently stops a
  future change nulling `*_program_phase_started_at` and silently deleting the
  only record of a run somebody left. The three `abandonProgram` bodies carry a
  comment saying the omission is load-bearing, because the failure mode is a
  tidy-up, not a decision.
- ⚠️ **One place retention _increases_.** A person who completed a programme and
  later abandoned a replay keeps a completion timestamp they cannot clear from
  inside the app, and it exports by rule. It was weighed: _you finished this_ is
  the one fact on the list that is not a wound.
- **The export is unchanged and the withheld list is not touched.**
  `export_user_data()` already returns all six programme columns per module by
  bare name, so the fossil exports today and continues to. `supabase/README.md`
  already ruled the category - a programme phase is data the person generated,
  and _"it is app state"_ is not a reason to withhold - so the export rule
  follows with no second decision. ⚠️ That the person receives bare column names
  they cannot interpret is a real export-legibility problem, ruled **out of
  scope** rather than annexed: it belongs to whoever owns the export and applies
  far beyond programmes.
- **The report gains the fossil, and gains no threshold.** `programme_progress`
  learns `phase_started_at`; a block counts the people who left by the phase
  they left at, **beside** the funnel and never a step in it, because the funnel
  is a snapshot of runs in progress and runs completed and must not claim to be
  a cohort. A second block prints days since a live run last moved in fixed
  buckets. ☠️ **The word _stalled_ appears nowhere in the report's output** - a
  named threshold there is the first step toward one in the product.
- **`docs/analytics.md` converts a deferral into a decision.** It stated the gap
  three times and ruled on it zero times; the Phase 3 passage's own correction
  (#2375) is itself superseded, because _the fact is destroyed_ was never quite
  true. The privacy policy's §8 gains one line, in `en` and `bg`, saying what is
  kept after you leave and what is not.
- **The module contract inherits the lifecycle.** `docs/modules/tools.md` says a
  module with a programme uses the shared three states and the leave record
  behind them, and invents no fourth state, no status column of its own and no
  run object. ⚠️ Scoped to CBT, ACT and DBT: meditation's ten-stage program is
  **stages, not phases**, carries none of these columns, and is not annexed.
- ☠️ **What this ADR forbids next time.** A `*_program_left_at` column, however
  named. A `*_program_abandoned_at`. A `programme_runs` table. A stored
  `stalled`, `paused` or `left` status. A fourth member on `ProgramStatus`. Any
  person-facing surface that states a duration inside a programme. Any contact
  triggered by a run going quiet. A _"forget that I started this"_ control -
  which would be a new surface whose entire content is the person's lapse, and
  account deletion remains the universal erasure. And any report that dates an
  exit from `*_program_prompt_dismissed_at`.

## Alternatives rejected

- **Keep the start date: add `*_program_abandoned_at` and stop nulling
  `started_at`.** The obvious fix, and the one #2386 proposed first. It costs
  roughly three columns, a migration, and either a redeclared
  `program_widget_task_status()` or a start date copied aside at exit. It lost
  because **no product feature reads those dates** - the only remaining reader
  is the engagement report, and the map ruled a reporting convenience
  inadmissible as the justification for retaining a date about a person's
  mental-health behaviour. Having refused to record the exit that has happened
  to all ten people (a run going quiet), a field for the exit that has happened
  to nobody could not be added without the ruling reading as nonsense.
- **Finish the erasure: null the fossil too.** Internally consistent, deletes
  data rather than adding it, and makes the abandon copy literally true. It lost
  because it destroys the abandonment visibility the fossil already gives, for
  nothing, and leaves the report exactly as blind as #2386 found it.
- **A run row, encrypted.** Its premise was wrong: a run row of status, phase
  index and timestamps has **zero columns the encryption pattern would encrypt**
  (#2532). What remained was a bet on a future free-text field.
- **A run row, plain.** Its only advantage over columns is **prior runs**, which
  ruling 4 refuses outright - so it buys a table, RLS, the export gate, a
  `NOT_CONTENT` registry line, a redeclared widget RPC, programme state moved
  off the row the whole app blocks on, and a second blocking request, for
  nothing. It would hold zero rows today, and what it would eventually hold is
  _a log of how many times a person started and stopped a mental-health
  programme_, which is the clearest thing on the list to refuse.
- **Change nothing and say so in `docs/analytics.md`.** The third option #2386
  offered. It would leave `*_program_started_at` being overwritten with no
  stated meaning and the fossil an undefended accident, one tidy-up away from
  gone.
- **Adopt `paused`, which `GoalStatus` already carries.** `goals`,
  `procrastination_tasks` and `act_committed_actions` carry such a status
  because they are **content the person authored**. A programme is **a path the
  product offered**. That asymmetry is why programmes are the outlier in their
  own codebase rather than an oversight, and copying the shape across would
  erase the distinction that justifies both.
- **Read the leave instant out of `*_program_prompt_dismissed_at` and give it a
  proper name.** Tempting, because it would put a `*_program_left_at` at the
  _preservation_ bar rather than the _collection_ bar. It fails on fact:
  `dismissProgramPrompt` writes the same column, so a person who abandons, later
  reopens the prompt and dismisses it again overwrites their own leave time with
  no trace. A value any unrelated tap can silently replace is not a record.
- **Change the exit dialog to disclose what is kept.** Rejected, and recorded
  because it was the strongest counter rather than because it was missed: CBT's
  _"Your saved thought records, activities, goals, and logs stay in place"_
  reads as exhaustive, so a person may infer that what is not listed does not
  stay. A dialog someone is using to leave is still the wrong place for a
  retention disclosure - it turns a quiet exit into a moment about their record.
  The disclosure goes to privacy §8 instead, where someone looking for it will
  find it.

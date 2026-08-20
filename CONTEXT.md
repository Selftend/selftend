# Selftend

The shared glossary for Selftend, a free guided self-help app. This file is a glossary only — the canonical meaning of domain terms, devoid of implementation detail. Add terms here as they are resolved; keep definitions tight.

## Language

### Routines

A routine is the "second-action bridge": it couples small in-app tool actions a user can do in one sitting, to help someone move past a single isolated action into a repeatable practice.

**Routine**:
A user-named, ordered set of steps, optionally attached to a single reminder. The user names it freely ("Morning wind-down"). It is a definition the user owns and edits.
_Avoid_: plan, habit, program, checklist

**Step**:
One position in a routine that points at a single in-app tool (e.g. mood, journal, breathing). Only tools that keep a dated record of use can be steps.
_Avoid_: task, item, action, activity

**Step completion**:
A step is complete for the day once the user has a qualifying record in that step's tool that day. Completion is a property of the day, read from the user's actual tool use — not a checkbox the routine owns, and not merely opening the tool.
_Avoid_: check-off, tick, done-marking

**Routine status**:
A routine's standing for the current day, one of _not started_, _in progress_, or _complete_. Complete means every active step is complete that day. There is deliberately no "failed" or "broken" status — an unfinished day is neutral.
_Avoid_: streak, success/fail, pass

**Order** (of steps):
The suggested sequence in which steps are presented and revealed. It is advisory only: steps may be completed in any order and any step may be left undone.
_Avoid_: sequence-gate, prerequisite

**Reminder** (of a routine):
An optional, single, user-chosen daily time at which the app nudges the user toward the routine. Off unless the user sets it. Distinct from the per-tool reminder prompt shown after a single tool use.
_Avoid_: notification, alarm, schedule

**Anchor**:
The everyday behavior a user is encouraged to attach a routine to ("right after my morning coffee"). It is coaching guidance offered when a routine is set up, not a stored property of the routine.
_Avoid_: trigger, cue-field, hook

**Day**:
The calendar day an entry belongs to. Which calendar depends on whether the tool records where the user was:

- **Tools that capture an occurrence offset** — mood, gratitude, sleep, journal, meditation, breathing, grounding, CBT thought records, CBT activities — use the **civil day at the place the entry was logged**, fixed for the life of the entry. Changing timezone never moves an entry to a different day. The repository resolves it once into a `dayKey` (`YYYY-MM-DD`); surfaces group on that and never convert the timestamp themselves. Breathing and grounding share one table and so share one offset column. A thought record captures the offset of its creation instant rather than a separate `occurred_at`, because unlike journal it is not back-datable.
- **CBT activities** carry two such days, for two different reasons: `completedDayKey` is the ordinary occurrence — the day the activity was done — and `scheduledDayKey` freezes the civil day a _future_ plan was meant for, so "Tuesday 7pm" stays Tuesday after travel. Behavioural activation asks whether you did the thing you planned for that day, so the day is the unit of the intervention. The stored instant is unchanged and still does the ordering and the time-of-day display; the offset only records which day was meant. An edit that leaves the schedule field alone carries the stored pair through rather than re-deriving it, so editing the notes after travel cannot move the plan's day.
- **Habits** reach the same answer by a shorter route, and a stronger model: `habit_logs.logged_on` stores the resolved civil date itself, and a unique index on `(habit_id, logged_on)` makes that date the tick's identity. Nothing is converted at read time, so unlike an offset this model has no "unknown" case to fall back from.
- **Routines are viewer-local by decision, and stay that way.** A routine has no dated record to freeze — there is no run object — and its job is "today, where you are standing"; freezing the axis would hand someone who has travelled a checklist for a day they have not lived, or mark one complete before they wake. Steps still read each tool's own day model, so the two models coexist on purpose rather than by omission. Routine status resets at local midnight.
- **ACT is deliberately deferred, not pending**, and is the only module left with no captured offset. Nine tables and roughly 60% of the workstream's remaining cost, against a symptom of a single wrong day, visible only around travel and self-correcting the next day: every ACT surface is a same-day list, and `useSelectedDate()` returns today with deliberately no global selected-date state, so there is no history or calendar on which a mis-filed entry stays visible. It returns only if ACT grows one.
- Both of those are owner decisions of 2026-07-28, recorded on [#330](https://github.com/Selftend/selftend/issues/330#issuecomment-5100789560).
- The **CBT programme checklist** exists twice — once client-side in `src/features/cbt/program-definition.ts` and once in the `program_widget_task_status` RPC — because the programme screen and the **Android launcher widget** answer "is today's practice done" from different places (home's own card stopped asking in #977 - it shows an ordinal phase badge and no task list). Every CBT leg now reads the captured day on both sides (#425 moved the last three, `thoughtRecordDaily`, `activityDaily` and `calmingDaily`, in one change). A module that graduates on one side only makes the two surfaces contradict each other, so the two copies move together, per module.
- Where a captured offset is missing (entries predating the column, or written by an older client) the first group falls back to the **viewer's current local day**. That is a fallback for unknown, never a claim the entry was logged at UTC.
- This holds server-side too: `public.occurrence_day_key` is the SQL twin of `entryDayKey`, so an RPC that answers "done today" resolves the same day the screens do rather than range-scanning the viewer's window (#414).

_Avoid_: session, cycle

> Note: there is intentionally no "run" term. A routine has a definition and a status derived per day; there is no separate object representing one day's execution.

### Reminder channel

**Reminder channel**:
The device-scoped capability that lets reminders reach a device: the platform's notification permission together with that device's push registration, taken as one thing. There is one channel per device, shared by every reminder — it is not a property of any single reminder, and enabling a tenth reminder never asks the user again. A reminder can be "on" while the channel is absent; nothing is delivered until the channel exists again.
_Avoid_: subscription (only half the channel), per-reminder permission

**Re-arm**:
Restoring a lost reminder channel for a user who has already said yes, without asking again. A re-arm never prompts; when consent cannot be presumed, what happens instead is a fresh request, not a re-arm.
_Avoid_: re-subscribe (names the mechanism, not the promise), re-prompt (the thing a re-arm must never do)

### Design language ("Color field")

The app-wide visual direction (decided on the design redesign map, first shipped by the mood workstream).

**Room** (retired):
A module's screen environment: every neutral surface on that screen re-tinted toward the module's hue, switching at navigation boundaries. **Rooms no longer exist** (#586). A module's screens wear the app's own surfaces, and module identity is carried by icon and label rather than by re-tinting the page. The term is kept here only so the phrase is recognisable in older code and docs — do not build new rooms.
_Avoid_: theme, skin

**Field** (retired):
The full-bleed pour behind a screen's header, carrying white ink (title, description, stats), poured from the active palette's accent (#586). **Fields no longer exist** (#733). Every module home now renders the quiet shell instead — breadcrumb, `h1`, tagline, optional inline stats — on the page background, and form and detail screens render `ScreenTopBar`, a 48px `--card` bar with one hairline. The `useNeutralFieldGradient` hook is gone with it. `neutralFieldGradient` in `src/lib/theme/chrome.ts` survives, unused by the app, still covered by `test/neutral-field-contrast.test.ts`. The term is kept here only so the phrase is recognisable in older docs and tickets — do not pour new fields, and do not reintroduce a gradient to soften the loss (an accepted trade, #690).
_Avoid_: banner, hero image, module hue

**Sheet** (retired):
The content surface that rose over the field on a large top radius, with the screen's cards on it. **Sheets no longer exist** (#733) — `ContentSheet` went with the field it overlapped, since its only reason to exist was that overlap. Content sits directly on the page background inside the content column.
_Avoid_: modal, bottom sheet (the interaction pattern is unrelated)

**Content column**:
The width the shell gives a screen, so no screen picks a number by hand: **720px** for a module home (it rides `ModuleHomeHeader`) and **620px** for a form or detail screen (it rides `ScreenTopBar`). See `src/lib/layout.ts`. Before #733 the app had no content column at all and a tool screen ran edge to edge on desktop.
_Avoid_: container, wrapper, max-width (the number is never the name)

**Soft card**:
A borderless card lifted from the page by a hue-tinted shadow instead of a border. Opt-in per screen; the bordered card stays the default elsewhere. The redesign replaces these with hairline `Section` rules, but per tool on each tool's own map (#690) — 34 call sites across 18 files, so they were deliberately left out of #733's chrome change.

**Accent ink**:
A module hue used as _text_ rather than as a surface or a swatch. A hue's published accent (`--think`, `text-think`) is tuned as a _colour_ — it paints fills, borders, chips and gradients — and carries too much luminance for small text in light mode.

A contrast ratio is only ever true of a **named pair**, so never record that a hue "passes" without saying on what. On the neutral app background, five of the eight are already under AA: `think` 1.88:1 (1.90:1 on its own room's background), `iris` 3.42, `mist` 3.43, `clay` 3.51, `act` 3.64. The other three pass **there and on `--card`, and nowhere tighter** — `be` 4.86, `aqua` 4.86, `ink` 4.87 on the background. Put any of them on a `bg-<hue>/10` tint of its own hue, which is what a hue-labelled chip or row actually sits on, and **all eight fail**: `be` 4.22, `aqua` 4.27, `ink` 4.28, the rest lower. So no published accent is safe for small text on **every** surface it lands on — `be`, `aqua` and `ink` hold on the neutrals and nowhere tighter; the other five hold nowhere.

So a hue gets a second, darkened value for text: the same hue and saturation at lightness 28%, certified against the surfaces it lands on. `text-<hue>-ink` carries it; `text-<hue>` stays correct for icons, large numerals and decorative marks, which owe WCAG 1.4.11's 3:1 rather than 1.4.3's 4.5:1.

**Both forms are now the encoding palette only.** #558 ruled that hue survives just where colour carries information the user reads off it — a scale, a live state readout, or a colour they chose — and that "distinguishes items in a set" is explicitly not enough. Module and tool identity is icon and label. Four surfaces keep hue, listed in [`src/lib/theme/encoding.ts`](../src/lib/theme/encoding.ts): the mood heatmap ramp, habit colours, the breathing pacer, and the colour a user picks for a custom breathing exercise. (The mood scale left the list with the 2a redesign — selection reads in size and opacity — and the sleep quality ramp with the sleep redesign, #771/#855: dot count and the level's name carry it now.) Everything else takes the neutral roles in [`src/lib/theme/chrome.ts`](../src/lib/theme/chrome.ts) or the app accent.

Three things were deleted with the chrome they served (#589), and it is worth knowing they existed because the traps they carried are the reason the gates look the way they do:

- **`--accent-ink`** was the room-poured ink: `text-accent-ink` asked the _room_ for a hue. Outside a room it fell back to `--primary` and rendered violet — changing the hue rather than the contrast, silently, since it still looked like a deliberate colour. A module's directory name never told you its room (`src/features/act/` was room-less; the `act` room was worn by `src/features/habits/`), so the trap was easy to walk into.
- **`TINT_TEXT` / `TINT_ACCENT`** split a tint's text value from its mark value, so a label and the glyph beside it could take one tint and get different colours — an icon darkened to ink reads as disabled.
- The per-tint mark derivation. `TINT_ACCENT` spent three PRs justifying itself with the claim that the published accents clear 3:1. Nothing computed the claim, and it was false: `think` is a light gold measuring **1.88:1 on the bare app background**, before any tint is laid under it. Four more cleared only thinly (`act` 3.24, `clay` 3.12, `mist` 3.09, `iris` **3.00**).

`primary` is not a hue — no room poured it and every gate was spelled `text-<hue>` — which is exactly why it kept writing its raw accent as text long after the eight were swept. It has an ink of its own (`text-primary-ink`), on the same 28% recipe in light; dark lifts to 80% because the raw dark accent genuinely fails there (#421 §3).

**The gate is a lint rule now** (`eslint.config.js`, #589): a decorative hue class anywhere in `src/`, `app/` or `lib/` fails the build, and the only exemptions are the encoding palette's own files. It matches the class literal rather than an import, because that was the shape of all 470 swept call sites. It also matches the arbitrary-value spelling `bg-[hsl(var(--act)/0.10)]` — that spelling hid ~78 sites from every check while the suites stayed green (#421), and it was the first thing a reviewer found missing when the rule was written.

Two habits keep these gates honest, both learned by shipping past them. **Gate per hue, not per sweep**: a suite that scans everything and asserts one aggregate stays green while a single hue regresses — journal and sleep share a hue, so a journal regression hid behind sleep (#428). Every floor here is `it.each` per hue or per tint, so a failure names the one that caused it. And **a floor must measure the surface, not the spelling**: three green gates checked `text-<hue>` against `text-<hue>-ink` and none checked luminance, which is how a 1.80:1 glyph reached the signed-out landing page (#433).
_Avoid_: accent-foreground (that is ink on the `accent` _surface_, a different pairing).

**Guest hue**:
Another module's hue appearing as an accent inside a room (e.g. the act-green mood scale in mood's rose room). Guest hues stay accent-strength and never re-pour surfaces.

**Routine vs. Habit**:
Selftend keeps both, as distinct features. The line is _who reports completion_: a **routine** step completes when the app sees a real record in its in-app tool (auto-derived, never marked); a **habit** is a behaviour the user marks done themselves (a self-report tick that can stand for anything, including off-app behaviour). If the app can see it, it's a routine; if only the user knows, it's a habit. They coexist in v1; folding habits into routines is a deliberately deferred option, not a v1 goal.
_Avoid_: treating "routine" and "habit" as synonyms; calling a self-tracked habit a routine.

### Navigation ("the way out")

The vocabulary for how a user leaves a screen (#1160/#1163). Four words that were previously all
called "back", which is why they rotted.

**Escape**:
The single leading affordance that lets a user leave the screen they are on. Exactly one per
screen — never two — and present on every screen except the app's root (`/(app)` signed in, `/`
signed out). Where it _leads_ varies; that it is _there_ does not. Distinct from the
`InvisibleHeader` brand link, which is always a jump to the root and discards where the user was.
_Avoid_: back button, close button (those name a glyph, not the role)

**Up**:
The Escape's default destination: one deterministic hop along the screen's own breadcrumb trail,
Material's "Up" (#495). Never history — a fixed hop cannot bounce. On a screen whose trail has a
single crumb, Up is the root.

Up is read off the trail by one rule: **the deepest crumb that still carries an href**. That rests
on an invariant of `computeBreadcrumbs` — **a trail always ends in a crumb with no href**, because an
absent href is how the trail marks "you are here" (#1251). A trailing href would make every Escape
on that route land one crumb too shallow, mistaking the current screen for its own parent.
_Avoid_: parent, back (Up is a structural claim, back is a temporal one)

**Origin**:
The route an off-trail arrival came from — off-trail meaning it is not on the destination screen's
own breadcrumb trail. When an arrival carries one, the Escape leads to the Origin instead of Up,
because Up would land somewhere the user has never been. It is always an explicitly carried value
and is **never** inferred from navigation history: `dangerouslySingular` replaces history entries
rather than adding them, and the Escape itself navigates with `replace`, so history here does not
describe where the user came from.
_Avoid_: referrer, previous page, back stack

**Close**:
The Escape wearing its X glyph, on a create/edit form, where the promise is "abandon this" rather
than "go up a level" (#733). Same rule and same destination logic — only the promise and the glyph
differ.
_Avoid_: cancel, dismiss (those name what happens to the _data_, not to the navigation)

**Completion** (not an Escape):
A "Done"-after-save action that happens to navigate (`backWithFallback`, #475). It is a content
action reporting that a task is finished, not a way out of a screen, so neither the Escape rule nor
its enforcement gate governs it. A screen may carry both.
_Avoid_: calling Done an escape hatch; a screen is not exempt from an Escape because it has a Done.

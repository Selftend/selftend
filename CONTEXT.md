# Selftend

The shared glossary for Selftend, a set of free, private mental health tools. This file is a glossary only — the canonical meaning of domain terms, devoid of implementation detail. Add terms here as they are resolved; keep definitions tight.

## Language

### The product

**mental health tools**:
What Selftend is, in the words it says so in — the category noun, a bare plural with no article and no qualifier, spelled the same way everywhere ([#2004](https://github.com/Selftend/selftend/issues/2004)). _A set of_ may stand in front of it in the frame sentence and nowhere else. The method — a **CBT programme**, _cognitive behavioural therapy_ spelled out on first use on a surface, then **CBT** — is **not** inside the noun: it is the second beat of the frame sentence, run by the person using it with no practitioner involved, and it is what makes the eight everyday tools the everyday end of a named approach rather than a flat inventory of utilities. The noun alone is that inventory, which is why no surface may carry it without the method somewhere on it. (The previous noun, _CBT self-help app_, carried the method inside itself — [#1814](https://github.com/Selftend/selftend/issues/1814); that move was surrendered on #2004.)

The frame binds **copy only**, never what the product contains or what it offers first. The eight everyday tools, ACT and the DBT overview are all unaffected by it. (The six onboarding concerns this line once listed are gone: since [#1958](https://github.com/Selftend/selftend/issues/1958) the first-run introduction is one panel and asks no concern.)

_Avoid_: wellness app, toolkit, mood tracker, journalling app, habit tracker, sleep app, meditation app — as **categories**; each names a real tool Selftend ships and a shelf it is not on. Telehealth or therapy-matching, likewise — Apple files the noun beside prescribers, and Selftend has nobody else in the loop. And above all the practitioner-implying compound retired in [#1616](https://github.com/Selftend/selftend/issues/1616). ☠️ The noun no longer owns half of that compound, but _self-help_ stays live vocabulary elsewhere, so the ban and its one-word gap stay. The full and current list, with each refusal's reason, is [docs/positioning.md](docs/positioning.md) § _The refusals_ and § _Words never to use_ — read it there rather than from this line, which is a pointer and not a second copy. `test/positioning-copy.test.ts` fails `verify` on the compound in this file too, which is why the banned words are never spelled out here.

**programme**:
The noun of a module's own staged progression — authored, phased, and graduated from once: the CBT programme (five phases), the ACT programme (four), and the DBT programme (four, decided in [docs/modules/dbt-mckay-skills-workbook.md](docs/modules/dbt-mckay-skills-workbook.md) §4, not yet built). The frame sentence names only the CBT one, because that is the method the category is paired with; the word itself belongs to every module that has one ([#1991](https://github.com/Selftend/selftend/issues/1991)). ☠️ It is **not** the product's category any more: [#1814](https://github.com/Selftend/selftend/issues/1814) kept the word for the component and moved the category to the entry above, and [#2004](https://github.com/Selftend/selftend/issues/2004) kept it there when the category moved again.

> Note: **programme** names this progression — never a user's routine, which keeps its own `_Avoid_: program` below. A routine is user-named and user-owned, and has no authored order to graduate from; a programme is authored and staged.

### DBT

The module's vocabulary, decided on map [#1980](https://github.com/Selftend/selftend/issues/1980) and held in full by [docs/modules/dbt-mckay-skills-workbook.md](docs/modules/dbt-mckay-skills-workbook.md) §12; the terms below are the ones other parts of the app meet.

**Skill group**:
One of DBT's four — distress tolerance, mindfulness, emotion regulation, interpersonal effectiveness — in the book's order. The same four are the DBT programme's phases. In Bulgarian, distress tolerance is _Устойчивост на стрес_ ([#1991](https://github.com/Selftend/selftend/issues/1991)).
_Avoid_: pillar (CBT's word), module (the group is inside one), phase (that is the programme's view of it)

**Coping plan**:
One per person: three sections of app-written picks and the person's own lines, plus an ordered fallback list of three to six, read as a **card** in a hard moment. It is a document with a _touched_ time, never a record with history, and the card carries no crisis bar and no completion affordance. Never counted.
_Avoid_: emergency plan, crisis plan, safety plan (all reserved or banned vocabulary), plan history

**Pause and choose**:
A four-step flow between the urge and the next act, ending on the person's coping plan. It **records nothing** — no row, no count, no signal — and its first step is a static line pointing at the crisis bar, identical for everyone.
_Avoid_: interrupt log, a record of moments, any per-use count

**Session** _(in DBT's sense)_:
A timed, text-guided practice that records **on completion only**. Its **Stop** ends it at once, saves nothing and asks nothing — the opposite of the everyday tools' _Finish early_, which saves a partial row and answers the back gesture with a dialog. Muscle relaxation is the first; the rest are the second slice.
_Avoid_: finish early, partial session, `stepsCompleted`

**Wise mind**:
Deciding by feeling and by facts together; _emotion mind_ and _reason_ are its halves. The **wise mind check-in** is a guided pause ending in a typed decision note: one row, no timer, no outcome field, no draft.
_Avoid_: intuition, gut, the right answer

**Judgement record**:
A judgement, a Negative/Positive mark, and an optional plain restatement of what was actually there; the time is captured, not asked. No _where_, no counts. Spelled with the _e_ in every string the gate reads.
_Avoid_: judgment (gated spelling), judgement log, a tally

**Emotion record**:
Six parts from what happened to what came after — the meaning kept as the person's own, feelings from the check-in's editable list — with no rating of any kind. Its one door hands the event and the built-in emotions to the CBT thought record through the seed store.
_Avoid_: emotion log (the check-in's job), intensity, portrait fields

**Opposite action**:
The move a feeling would not choose. The **opposite-action plan** is an open record closed from its detail with a done-day and an optional _what shifted_; the done-day is the fact, the plan's existence never is. Nothing asks the person to close it.
_Avoid_: overdue, age on an open plan, a count of plans, _should_

**Script**:
The four lines — I think, I feel, I want, what I'll do for myself — written before a conversation and reopened as a card. _Ask for what you want_ is the door and the room; _script_ is the record noun. Nothing is stored about the other person.
_Avoid_: who, assertiveness training, hierarchy, rehearsal record

**Ladder** _(DBT)_:
The script list ordered easiest-first by the optional 0–100 difficulty, done scripts falling away. An ordering, never an entity, and never the CBT exposure ladder.
_Avoid_: hierarchy, rung numbers, a gate between rungs

**Learn page**:
A static primer or skill-group page — DBT is the only module with a learn route, and every learn page opens with the crisis bar. It carries every learn-only skill, the cautions and the referral lines, and it records nothing and varies by nothing.
_Avoid_: onboarding, info modal (the siblings' primer shape), lesson

**Favourite**:
A tool or a module the person has starred to keep on Home — one of the eight everyday tools or one of the three modules, and nothing finer-grained than that ([#1885](https://github.com/Selftend/selftend/issues/1885)). Home lists the favourites first, then the complete catalogue of eleven, through the same card; a favourited item therefore appears twice, plainly. The star is a toggle with an immediately visible consequence, so there is no cap and no "full" state. Favourites is the catalogue **filtered**, never sorted — nothing stores an order — and the modules section beneath it renders unconditionally, because a Home that shows the tools without the method is the inventory `docs/positioning.md` forbids.

> Note: the star means "keep this handy", not "I do this" — a routine composes from what the person has records in, never from their favourites. The word collides on purpose with gratitude's own starred **entries**, one tap deeper; the two are different kinds of object and the Home copy names its kinds (_a tool or a module_) rather than disclaiming the other. _Avoid_: **widget** for this — that is the Android launcher's word, and the in-app dashboard it also used to name is gone.

### Practice

**Practice**:
A person's repeated use of a Selftend skill in their life. Its success measure is the skill becoming automatic — never opens, sessions, or frequency. A user who needs Selftend less is a practice succeeding. (User copy may still call a meditation sit a "practice" — that is the ordinary word, not this term.)
_Avoid_: engagement, usage, stickiness, habit loop

**Return**:
Came back at all within a window — the only sense in which Selftend counts retention ([#1598](https://github.com/Selftend/selftend/issues/1598)). Never duration, frequency, or depth. The product may deserve a return; it must not prescribe one.
_Avoid_: retention-as-frequency, re-engagement, win-back, DAU/WAU

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
The everyday behaviour a user is encouraged to attach a routine to ("right after my morning coffee"). It is coaching guidance offered when a routine is set up, not a stored property of the routine.
_Avoid_: trigger, cue-field, hook

**Day**:
The calendar day an entry belongs to. Which calendar depends on whether the tool records where the user was:

- **Tools that capture an occurrence offset** — mood, gratitude, sleep, journal, meditation, breathing, grounding, CBT thought records, CBT activities — use the **civil day at the place the entry was logged**, fixed for the life of the entry. Changing timezone never moves an entry to a different day. The repository resolves it once into a `dayKey` (`YYYY-MM-DD`); surfaces group on that and never convert the timestamp themselves. Breathing and grounding share one table and so share one offset column. A thought record captures the offset of its creation instant rather than a separate `occurred_at`, because unlike journal it is not back-datable.
- **CBT activities** carry two such days, for two different reasons: `completedDayKey` is the ordinary occurrence — the day the activity was done — and `scheduledDayKey` freezes the civil day a _future_ plan was meant for, so "Tuesday 7pm" stays Tuesday after travel. Behavioural activation asks whether you did the thing you planned for that day, so the day is the unit of the intervention. The stored instant is unchanged and still does the ordering and the time-of-day display; the offset only records which day was meant. An edit that leaves the schedule field alone carries the stored pair through rather than re-deriving it, so editing the notes after travel cannot move the plan's day.
- **Habits** reach the same answer by a shorter route, and a stronger model: `habit_logs.logged_on` stores the resolved civil date itself, and a unique index on `(habit_id, logged_on)` makes that date the tick's identity. Nothing is converted at read time, so unlike an offset this model has no "unknown" case to fall back from.
- **Routines are viewer-local by decision, and stay that way.** A routine has no dated record to freeze — there is no run object — and its job is "today, where you are standing"; freezing the axis would hand someone who has travelled a checklist for a day they have not lived, or mark one complete before they wake. Steps still read each tool's own day model, so the two models coexist on purpose rather than by omission. Routine status resets at local midnight.
- **ACT is deliberately deferred, not pending**, and is the only module left with no captured offset. Nine tables and roughly 60% of the workstream's remaining cost, against a symptom of a single wrong day, visible only around travel and self-correcting the next day. The deferral holds on a **single-frame invariant**, not on an absence of history: **every ACT tool now ships a full, cross-day archive** (#1517) — the five list screens, urge surf, bull's-eye and the finished half of committed actions are all flat, newest-first and keyset-paged — so a mis-filed entry stays visible for as long as the user scrolls. What ACT does not do is name a day twice from two frames. Those archives introduce no second frame: they order on the plaintext `created_at` (`reviewed_at` for bull's-eye) and carry no day heading, no date control and no `formatRelativeDayKey` label. Their rows still name a day — since #1539 a **compact** label (`formatCompactAtOffset`: a time today, a weekday and a time inside a week, then a date), or a bare date on bull's-eye, where one check-in writes up to four rows milliseconds apart and a time would stack four near-identical labels — but every one of those is resolved read-time from the viewer's current device timezone, which is the one frame ACT keeps. ACT's **detail** screens keep the absolute form (`formatAtOffset`), the same row-compact/detail-absolute split the detail screens of journal, meditation, sleep, mood and CBT activities already ship. A compact weekday label is **not** the `formatRelativeDayKey` label named below: that one reads a **captured** `dayKey` and measures it against the viewer's today, which is two frames and is exactly why it is closed to ACT, whereas `formatCompactAtOffset(value, null)` derives both the entry's day and today's in the _same_ viewer frame — so it names a day relatively without ever naming it twice. The day-namers that remain — the programme's `didOnDate` and the ACT legs of `program_widget_task_status` — both resolve the day from the viewer's _current_ device timezone, the latter scanning a client-passed `created_at` window where the CBT legs beside it read `occurrence_day_key`. `useSelectedDate()`, with deliberately no global selected-date state, still returns today, and after #1517 it survives on ACT's **write** path only (`loggedAtForSelectedDate`); the five list screens that used to filter reads through it no longer do. So ACT's surfaces can be wrong together after travel but can never contradict each other, and self-contradiction is the harm the captured day exists to prevent. The offset returns the moment an ACT surface names a day from a **second** frame — a day-grouped heading, a date control, a `formatRelativeDayKey` label, or a server-resolved day. A flat, newest-first list does not, however far back it reaches. The invariant is no longer prose alone: `test/act-captured-offset-gate.test.ts` (#1533) fails if any `act_*` table declares an `*_offset_minutes` column or any ACT source file declares an `*OffsetMinutes` field, because the breach that ends the invariant is **partial** graduation — one ACT table capturing an offset while its siblings do not, leaving one module naming days in two frames. Graduation is therefore module-wide or not at all, and it deletes that gate rather than exempting a file. ☠️ The obvious-looking guard is backwards: adding `src/features/act/` to `eslint.config.js`'s `CAPTURED_FRAME_FILES` would ban the viewer-local helpers ACT is _required_ to use.
- Both of those are owner decisions of 2026-07-28, recorded on [#330](https://github.com/Selftend/selftend/issues/330#issuecomment-5100789560).
- The **CBT programme checklist** exists twice — once client-side in `src/features/cbt/program-definition.ts` and once in the `program_widget_task_status` RPC — because the programme screen and the **Android launcher widget** answer "is today's practice done" from different places (home's own card stopped asking in #977 - it shows an ordinal phase badge and no task list). Every CBT leg now reads the captured day on both sides (#425 moved the last three, `thoughtRecordDaily`, `activityDaily` and `calmingDaily`, in one change). A module that graduates on one side only makes the two surfaces contradict each other, so the two copies move together, per module. There is a **third, non-rendering copy**: `scripts/seed-demo-data.mjs` re-derives the seeded phase's legs to assert that the demo account's stored phase index does not contradict the rows behind it (#1282). It cannot make two surfaces disagree, because nothing renders from it — but a leg whose rule changes in the two copies above and not there leaves the seed asserting a rule the app no longer uses, and passing. The **ACT programme checklist** is duplicated the same three ways, and the seed's copy of it is now complete: #1284 places the ACT practice logs so `openUp`'s `unhookOnce` reads done and its `makeRoomOnce` and daily practice stay open, and #1286 persists the anchor those margins were placed against and re-derives all three legs out of the database to check them. #1286 anchors from `ACT_PHASE_STARTED_DAY`, the constant #1284 declares, rather than naming a second day — nothing else persists that phase, so two different days would leave the margins and the anchor silently measuring different phases. #1286 also re-derives the two boundary invariants at both edges of the supported timezone band (UTC−11:00 and UTC+12:45), because both are claims about a civil day and no ACT table stores a captured offset. **Routine status is duplicated the same non-rendering way** (#1290): the seed's `ROUTINE_STEP_SOURCES` and `statusOn` restate `stepDoneOnDate` and `deriveRoutine` — which tool a step reads, which timestamp that tool dates a row by, and which rows do not count at all — so it can re-derive each seeded routine's status and seven-day strip out of the database and refuse to finish on a picture a reviewer would not see. The mapping is the app's, not the schema's: a change to which column a tool derives "done today" from, or to a filter like `listThoughtRecords`' `archived_at is null`, has to move here too, or the seed goes on asserting a rule the app has stopped using. **The seeded favourites are a fourth such copy, and the only one that cannot rot** (#1352, #1953, #1959): demo's ten and bob's four `favorites` rows are restated as literals because one seeder is `.mjs` and the other is SQL and neither can import the catalogue — but `test/seed-favorites.test.ts` parses both seed files and checks every key against the real `CATALOGUE` in `src/features/favorites/items.ts` on every run, and the demo seeder reads all three accounts' rows back out of the database as its last step. That is the pattern the three copies above lack: where they need a human to carry a rule change into the seed, this one fails in CI if nobody does. (Until #1959 the seeds also wrote the old `widget_preferences` layouts, defined as "what `buildWidgetRecommendations` emits for these onboarding answers" and compared against the real builder by `test/seed-widget-layouts.test.ts`; no seed writes that table now, so that comparison retired with the dashboard. Until #1954 the same test also composed bob's starter routine from his rows through `buildStarterSteps`; the starter now composes from the tools a person has records in.) `test/integration/favorites.integration.test.ts` still replays the #1953 migration's own SQL rather than a retyped mapping.
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

**Reminder consent**:
Account-wide permission to deliver any reminder at all. Delivery needs three separate things — consent, a per-tool enabled flag, and a channel — and consent is the **permission** where the per-tool flag is the **nudge**; the quiet-by-default guardrail bites on the nudge. Consent arms nothing by itself. Unlike the channel it belongs to the account rather than to a device, which is why a reminder that is on with no channel is the ordinary state of a new device, while a reminder that is on with no consent is a state no user path produces. Its three states are named because two of them are indistinguishable unless you also know whether the question was ever put:

- **Never asked** — no answer recorded. The one-time post-completion prompt is offered.
- **Declined** — asked, and the answer was no. The prompt is permanently withheld. It **has no positive rendering**: nothing draws differently for declined than for never asked, so declined is only ever the _absence_ of the prompt.
- **Consented** — asked, and the answer was yes. The prompt is offered for any tool not already armed.

Invariant: an account cannot hold an enabled reminder without consent.
_Avoid_: notification permission (that is the channel's half, and it belongs to a device), opt-in (does not distinguish never asked from declined)

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

It **says where it goes**: its accessible label names the destination — "Back to CBT" — because an
explicit `accessibilityLabel` _replaces_ a pressable's children for a screen reader, so a glyph-only
label would hide from screen-reader users the name the arrow shows on screen (#1253). Where the
trail has no name for the destination it says "Go back". Never the fallback word "Entry", which is
the absence of a name dressed as one, and never the nearest _named_ ancestor, which names a screen
the Escape does not go to.

It is present on every **branch**, not merely every screen. A loading, error or not-found state is
a screen the user is looking at, so a component that mounts its chrome on the happy path and
early-returns past it strands them on the branch that actually rendered — an undeclared exception,
which R3 does not admit. Fifty-two screens shipped that shape before the gate could see branches
(#1328). Either hoist the chrome above the branch, or reach for `ScreenLoading` / `ScreenNotFound`,
which carry the bar; `LoadingState` / `ErrorState` / `EmptyState` are _bodies_, dropped into a screen
whose chrome is already mounted above them, and carry none.

A placeholder branch does not _consume_ the Origin, though it does show it: a screen that loads
first mounts two Escapes in turn, and an arrival can only be consumed once.
_Avoid_: back button, close button (those name a glyph, not the role); a **chrome-less**
`SafeAreaView` for a loading or not-found branch (that is how the defect spread the first time)

**Up**:
The Escape's default destination: one deterministic hop along the screen's own breadcrumb trail,
Material's "Up" (#495). Never history — a fixed hop cannot bounce. On a screen whose trail has a
single crumb, Up is the root.

Up is read off the trail by one rule: **the deepest crumb that still carries an href**. That rests
on an invariant of `computeBreadcrumbs` — **a trail always ends in a crumb with no href**, because an
absent href is how the trail marks "you are here" (#1251). A trailing href would make every Escape
on that route land one crumb too shallow, mistaking the current screen for its own parent.

A crumb can have a correct href and still have no _name_: an opaque-id segment no table can label
falls through to the generic "Entry". `computeBreadcrumbs` marks those `unresolved`, so the Escape
can tell a real name from the fallback without comparing against a translated word (#1253). It is
what the seven `[id]/edit` and `[id]/log` forms hop up to.
_Avoid_: parent, back (Up is a structural claim, back is a temporal one)

**Origin**:
The route an off-trail arrival came from — off-trail meaning it is not on the destination screen's
own breadcrumb trail. When an arrival carries one, the Escape leads to the Origin instead of Up,
because Up would land somewhere the user has never been. It is always an explicitly carried value
and is **never** inferred from navigation history: `dangerouslySingular` replaces history entries
rather than adding them, and the Escape itself navigates with `replace`, so history here does not
describe where the user came from.

It is carried in memory — `navigation-origin-store.ts`, recorded through the one helper
`usePushWithOrigin` and **consumed on mount**, so a screen holds the Origin it arrived with and the
next arrival at the same route finds nothing (#1261). Never a route param: Expo Router serialises
params into the address bar, and on this app a route names which therapy module the user was in.
Recording is **opt-out** — everything that pushes through the helper records, and only the global
nav chrome stays out, because opt-in fails invisibly (a cross-link that forgets just quietly shows
Up).
_Avoid_: referrer, previous page, back stack

**Close**:
The Escape wearing its X glyph, on a create/edit form, where the promise is "abandon this" rather
than "go up a level" (#733). Same rule and same destination logic — the promise, the glyph and the
label differ. A Close announces "Close", never the destination: on a form what it promises is
_abandoning this_, and where it lands is secondary.
_Avoid_: cancel, dismiss (those name what happens to the _data_, not to the navigation)

**Completion** (not an Escape):
A "Done"-after-save action that happens to navigate (`backWithFallback`, #475). It is a content
action reporting that a task is finished, not a way out of a screen, so neither the Escape rule nor
its enforcement gate governs it. A screen may carry both.
_Avoid_: calling Done an escape hatch; a screen is not exempt from an Escape because it has a Done.

### Accounts ("optional registration")

The vocabulary for how a person holds an account (#1427/#1429). Registration is optional: an
account exists from first use, and a sign-in identity is attached later, if ever.

**Guest account**:
The account created silently on first use, with no sign-in identity attached. A full account — it
owns its data like any other — whose only key is the session held on that device or browser: lose
the session, lose the account. "Guest" is the word in copy, docs and code alike; the platform's
mechanism word is "anonymous", which stays out of the UI because the data is not anonymous — it is
the person's own, just unlabelled by an email.
_Avoid_: anonymous account (mechanism word, and wrong as a privacy claim), local account, device
account, trial account

**Registered account**:
An account with at least one sign-in identity attached (email and password, or an OAuth provider).
What a guest becomes after conversion. Registering is invited, never required, and gates no
feature.
_Avoid_: full account, real account, permanent account, member

**Conversion**:
Attaching the first sign-in identity to a guest account, in place, keeping all its data. Guest →
registered, one way. User-facing copy never says the word — people just "create an account".
_Avoid_: upgrade, migration, merge (a conversion never combines two accounts)

**Abandonment**:
Knowingly leaving a guest account behind by signing in to a registered account from a device that
holds guest data. Always preceded by a warning when the guest account holds any user-created
content — never silent — and the warning offers export in place (#1430). A guest account with
nothing in it is abandoned without ceremony. The warning is a confirm at submit; `/sign-in` also
carries a quiet line saying the same thing on arrival, so the fact reaches the person before they
have typed anything rather than after (#1865). The line is a foreshadow, not a second gate: it
appears on exactly the confirm's own preconditions, and it stays silent when the content check
cannot be reached, where the confirm warns.
_Avoid_: logout, switch (both hide that data is being left behind)

**Orphaned guest account**:
A guest account no device holds a session for — created by abandonment, reinstall, or cleared
storage. Unreachable by its owner, because a guest account's only key is that session; it is never
deleted at the moment of abandonment — cleanup after dormancy is its only deletion path (#1431).
_Avoid_: dead account, stale user

**Dormancy**:
The state of a guest account that has gone twelve months without activity — in practice, twelve
months without the app being opened on a device holding its session, since any open renews it.
Dormancy, not account age, is what makes a guest account eligible for cleanup: a recently used
account is never dormant, however old it is (#1431).
_Avoid_: inactive (too vague), expired (nothing expires on its own)

**Cleanup**:
The scheduled deletion of dormant guest accounts — the only path by which an orphaned guest
account is ever deleted. Cleanup removes exactly what self-service account deletion removes,
nothing less. A device that returns after its account was cleaned up starts fresh with a calm,
one-time notice — never silently (#1431).
_Avoid_: purge, garbage collection, expiry

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
- The **CBT programme checklist** exists twice — once client-side in `src/features/cbt/program-definition.ts` and once in the `program_widget_task_status` RPC — because the programme screen and the home widget answer "is today's practice done" from different places. Every CBT leg now reads the captured day on both sides (#425 moved the last three, `thoughtRecordDaily`, `activityDaily` and `calmingDaily`, in one change). A module that graduates on one side only makes the two surfaces contradict each other, so the two copies move together, per module.
- Where a captured offset is missing (entries predating the column, or written by an older client) the first group falls back to the **viewer's current local day**. That is a fallback for unknown, never a claim the entry was logged at UTC.
- This holds server-side too: `public.occurrence_day_key` is the SQL twin of `entryDayKey`, so an RPC that answers "done today" resolves the same day the screens do rather than range-scanning the viewer's window (#414).

_Avoid_: session, cycle

> Note: there is intentionally no "run" term. A routine has a definition and a status derived per day; there is no separate object representing one day's execution.

### Design language ("Color field")

The app-wide visual direction (decided on the design redesign map, first shipped by the mood workstream).

**Room** (retired):
A module's screen environment: every neutral surface on that screen re-tinted toward the module's hue, switching at navigation boundaries. **Rooms no longer exist** (#586). A module's screens wear the app's own surfaces, and module identity is carried by icon and label rather than by re-tinting the page. The term is kept here only so the phrase is recognisable in older code and docs — do not build new rooms.
_Avoid_: theme, skin

**Field**:
The full-bleed pour behind a screen's header, carrying white ink (title, description, stats). It is poured from **the active palette's accent**, not from a module hue (#586) — so a header looks the same in every module and follows the palette the user picked. Its lightness is solved per palette so the white ink clears WCAG AA; see `neutralFieldGradient` in `src/lib/theme/chrome.ts` and `test/neutral-field-contrast.test.ts`.
_Avoid_: banner, hero image, module hue

**Sheet**:
The content surface that rises over the field on a large top radius; the screen's cards sit on it.
_Avoid_: modal, bottom sheet (the interaction pattern is unrelated)

**Soft card**:
A borderless card lifted from the sheet by a hue-tinted shadow instead of a border. Opt-in per screen; the bordered card stays the default elsewhere.

**Accent ink**:
A module hue used as _text_ rather than as a surface or a swatch. A hue's published accent (`--think`, `text-think`) is tuned as a _colour_ — it paints fills, borders, chips and gradients — and carries too much luminance for small text in light mode.

A contrast ratio is only ever true of a **named pair**, so never record that a hue "passes" without saying on what. On the neutral app background, five of the eight are already under AA: `think` 1.88:1 (1.90:1 on its own room's background), `iris` 3.42, `mist` 3.43, `clay` 3.51, `act` 3.64. The other three pass **there and on `--card`, and nowhere tighter** — `be` 4.86, `aqua` 4.86, `ink` 4.87 on the background. Put any of them on a `bg-<hue>/10` tint of its own hue, which is what a hue-labelled chip or row actually sits on, and **all eight fail**: `be` 4.22, `aqua` 4.27, `ink` 4.28, the rest lower. So no published accent is safe for small text on **every** surface it lands on — `be`, `aqua` and `ink` hold on the neutrals and nowhere tighter; the other five hold nowhere.

So a hue gets a second, darkened value for text: the same hue and saturation at lightness 28%, certified against the surfaces it lands on. Which class carries it depends on where the text stands:

| context                                          | class                                           |
| ------------------------------------------------ | ----------------------------------------------- |
| Small text in a hue, inside that hue's room      | `text-accent-ink` — in-room only                |
| Small text in a hue, anywhere at all             | `text-<hue>-ink` — names its hue, so it travels |
| Icons, large numerals, decorative marks, borders | `text-<hue>` — but see the mark floor below     |

The two are not interchangeable in both directions. `text-<hue>-ink` names the hue it wants and is therefore correct everywhere, in a room or out of one. `text-accent-ink` asks the _room_ for a hue, so it is only meaningful where a room is pouring one: outside a room it falls back to `--primary` and renders violet, changing the hue rather than the contrast — silently, since it still looks like a deliberate colour. Inside a room both resolve to the same value from one source, `HUE_INK_TRIPLES`.

A module's directory name does not tell you its room: `src/features/act/` is room-less (the `act` room is worn by `src/features/habits/`), so `text-accent-ink` there would render violet.

A shared colour map has to split the two uses rather than pick one: `TINT_TEXT` resolves every tint to its ink and `TINT_ACCENT` to its mark colour, so a label and the glyph beside it can take the same tint and still get different values — an icon darkened to ink reads as disabled.

**The mark floor: a non-text mark owes 3:1, and that is measured too.** An icon, rule or dot is WCAG 1.4.11 rather than 1.4.3, so it needs 3:1 rather than 4.5:1 — a weaker floor, not no floor, and the same rule applies to it: never record that an accent clears it without saying on what. `TINT_ACCENT` spent three PRs justifying itself with the claim that the published accents clear 3:1. Nothing computed the claim, and it is false: `think` is a light gold measuring **1.88:1 on the bare app background**, before any tint is laid under it, so there is no surface in the product where it reads as a mark. `think` is therefore the one tint whose _mark_ is its ink — the only hue for which `TINT_ACCENT` and `TINT_TEXT` agree in light mode, as they already did for every hue in dark, where `--<hue>-ink` **is** the published accent. The other seven clear the floor on every wash a mark lands on, but four of them thinly (`act` 3.24, `clay` 3.12, `mist` 3.09, `iris` **3.00**), so which tint gets which is derived from the tokens in `test/theme-token-sync.test.ts` per tint rather than written down — a palette retune that costs `iris` any luminance moves it to ink and fails the build instead of shipping.

`primary` is not a hue — no room pours it and every gate was spelled `text-<hue>` — which is exactly why it kept writing its raw accent as text long after the eight were swept. It has an ink of its own now (`text-primary-ink`), on the same 28% recipe in light; dark is the one place it parts company with the hues, lifting to 80% because the raw dark accent genuinely fails there (#421 §3).

`test/accent-ink-call-sites.test.ts` gates this across all of `app/` and `src/`, not per module: a bare `text-<hue>` is a build failure unless it sits in a classified area and is enumerated there with a measured contrast figure, and room ink is banned outright in areas that are not rooms. Write a hue as an arbitrary value (`text-[hsl(var(--think))]`) and the gate is blind to it — that spelling hid ~78 sites from every check while the suites stayed green (#421), so the tint maps are additionally asserted by shape.

Two habits keep these gates honest, both learned by shipping past them. **Gate per hue, not per sweep**: a suite that scans everything and asserts one aggregate stays green while a single hue regresses — journal and sleep share a hue, so a journal regression hid behind sleep (#428). Every floor here is `it.each` per hue or per tint, so a failure names the one that caused it. And **a floor must measure the surface, not the spelling**: three green gates checked `text-<hue>` against `text-<hue>-ink` and none checked luminance, which is how a 1.80:1 glyph reached the signed-out landing page (#433).
_Avoid_: accent-foreground (that is ink on the `accent` _surface_, a different pairing).

**Guest hue**:
Another module's hue appearing as an accent inside a room (e.g. the act-green mood scale in mood's rose room). Guest hues stay accent-strength and never re-pour surfaces.

**Routine vs. Habit**:
Selftend keeps both, as distinct features. The line is _who reports completion_: a **routine** step completes when the app sees a real record in its in-app tool (auto-derived, never marked); a **habit** is a behaviour the user marks done themselves (a self-report tick that can stand for anything, including off-app behaviour). If the app can see it, it's a routine; if only the user knows, it's a habit. They coexist in v1; folding habits into routines is a deliberately deferred option, not a v1 goal.
_Avoid_: treating "routine" and "habit" as synonyms; calling a self-tracked habit a routine.

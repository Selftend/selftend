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

- **Tools that capture an occurrence offset** — mood, gratitude, sleep, journal, meditation — use the **civil day at the place the entry was logged**, fixed for the life of the entry. Changing timezone never moves an entry to a different day. The repository resolves it once into a `dayKey` (`YYYY-MM-DD`); surfaces group on that and never convert the timestamp themselves.
- **Habits** reach the same answer by a shorter route: `habit_logs.logged_on` stores the resolved civil date itself, so there is no timestamp to convert and no missing-offset case.
- **Everything else** — ACT, CBT records, breathing, grounding — has no captured offset and uses the **viewer's current local day**. Routines deliberately keep a viewer-local day axis whatever their steps use: a routine has no dated record to freeze, and its job is "today, where you are standing". Routine status resets at local midnight.
- Where a captured offset is missing (entries predating the column, or written by an older client) the first group falls back to the second. That is a fallback for unknown, never a claim the entry was logged at UTC.

_Avoid_: session, cycle

> Note: there is intentionally no "run" term. A routine has a definition and a status derived per day; there is no separate object representing one day's execution.

### Design language ("Color field")

The app-wide visual direction (decided on the design redesign map, first shipped by the mood workstream).

**Room**:
A module's screen environment: every neutral surface on that screen re-tinted toward the module's hue. One room per screen; rooms switch at navigation boundaries.
_Avoid_: theme, skin

**Field**:
The full-bleed pour of the module hue behind a screen's header, carrying white ink (title, description, stats).
_Avoid_: banner, hero image

**Sheet**:
The content surface that rises over the field on a large top radius; the screen's cards sit on it.
_Avoid_: modal, bottom sheet (the interaction pattern is unrelated)

**Soft card**:
A borderless card lifted from the sheet by a hue-tinted shadow instead of a border. Opt-in per screen; the bordered card stays the default elsewhere.

**Accent ink**:
A module hue used as _text_ rather than as a surface or a swatch. A hue's published accent (`--think`, `text-think`) is tuned as a _colour_ — it paints fills, borders, chips and gradients — and four of the eight carry too much luminance to hold small text in light mode, on any pale surface: `think` is 1.90:1 on its own room's background and 1.88:1 on the neutral app background, with `iris`, `clay` and `act` also under AA on both. So a hue gets a second, darkened value for text: the same hue and saturation at lightness 28%, certified against the surfaces it lands on. Which class carries it depends on where the text stands:

| context                                          | class                                    |
| ------------------------------------------------ | ---------------------------------------- |
| Small text in a hue, inside that hue's room      | `text-accent-ink` (the room re-pours it) |
| Small text in a hue, on the neutral app surface  | `text-<hue>-ink`                         |
| Icons, large numerals, decorative marks, borders | `text-<hue>` (unchanged)                 |

Both classes resolve to the same colour inside a room — one source, `HUE_INK_TRIPLES`. The distinction matters because `accent-ink` is room-poured: outside a room it falls back to `--primary`, so using it on a room-less screen changes the hue rather than the contrast.

A module's directory name does not tell you its room: `src/features/act/` is room-less (the `act` room is worn by `src/features/habits/`), so `text-accent-ink` there would render violet. `test/accent-ink-call-sites.test.ts` enforces both halves of the rule for that module — the third row's exemptions are enumerated with a reason each, and room ink is banned outright. Other directories are not yet covered; add one only after classifying its sites.
_Avoid_: accent-foreground (that is ink on the `accent` _surface_, a different pairing).

**Guest hue**:
Another module's hue appearing as an accent inside a room (e.g. the act-green mood scale in mood's rose room). Guest hues stay accent-strength and never re-pour surfaces.

**Routine vs. Habit**:
Selftend keeps both, as distinct features. The line is _who reports completion_: a **routine** step completes when the app sees a real record in its in-app tool (auto-derived, never marked); a **habit** is a behaviour the user marks done themselves (a self-report tick that can stand for anything, including off-app behaviour). If the app can see it, it's a routine; if only the user knows, it's a habit. They coexist in v1; folding habits into routines is a deliberately deferred option, not a v1 goal.
_Avoid_: treating "routine" and "habit" as synonyms; calling a self-tracked habit a routine.

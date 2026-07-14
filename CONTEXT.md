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
The user's local calendar day. Routine status resets at local midnight; a routine is evaluated one day at a time.
_Avoid_: session, cycle

> Note: there is intentionally no "run" term. A routine has a definition and a status derived per day; there is no separate object representing one day's execution.

**Routine vs. Habit**:
Selftend keeps both, as distinct features. The line is _who reports completion_: a **routine** step completes when the app sees a real record in its in-app tool (auto-derived, never marked); a **habit** is a behaviour the user marks done themselves (a self-report tick that can stand for anything, including off-app behaviour). If the app can see it, it's a routine; if only the user knows, it's a habit. They coexist in v1; folding habits into routines is a deliberately deferred option, not a v1 goal.
_Avoid_: treating "routine" and "habit" as synonyms; calling a self-tracked habit a routine.

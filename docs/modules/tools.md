# Tools Navigation Spec

The product stays modular without implying planned tools are already ready.

## Current State

The protected app sidebar groups tools as:

- CBT
  - Overview
  - History
  - Learn
- Mood tracker
- Journal
- Meditation
- ACT
- Gratitude log

CBT, Mood tracker, and Journal are the working modules. The app shell and CBT each have one-page onboarding tracked in `user_preferences`; Settings can reset those flags.

Meditation, ACT, and Gratitude log are placeholders. They must not collect data, schedule reminders, create streak pressure, or imply therapeutic outcomes until each has a reviewed module spec.

## Routes

Working CBT routes:

- `/cbt`
- `/cbt/learn`
- `/cbt/history`
- `/cbt/new`
- `/cbt/[id]`
- `/cbt/goals`, `/cbt/goals/new`, `/cbt/goals/[id]`
- `/cbt/activities`, `/cbt/activities/new`, `/cbt/activities/[id]`
- `/cbt/values`
- `/cbt/weekly-review`
- `/cbt/beliefs`, `/cbt/beliefs/new`, `/cbt/beliefs/[id]`
- `/cbt/exposure`, `/cbt/exposure/new`, `/cbt/exposure/[id]`
- `/cbt/worry`, `/cbt/worry/new`
- `/cbt/mindfulness`, `/cbt/mindfulness/[slug]`
- `/cbt/tasks`, `/cbt/tasks/new`, `/cbt/tasks/[id]`
- `/cbt/anger`, `/cbt/anger/new`, `/cbt/anger/[id]`
- `/cbt/self-care`
- `/cbt/recovery`

Working tool routes:

- `/tools/mood-tracker`, `/tools/mood-tracker/new`, `/tools/mood-tracker/[id]`, `/tools/mood-tracker/[id]/edit`
- `/tools/journal`, `/tools/journal/new`, `/tools/journal/[id]`, `/tools/journal/[id]/edit`
- `/tools/mindfulness`, `/tools/mindfulness/[slug]`

Placeholder routes: `/tools/meditation`, `/tools/act`, `/tools/gratitude-log`.

## Expansion Rule

Before a placeholder becomes real, add a module spec covering:

- user problem and feature boundary
- data fields, privacy justification, RLS, export, and deletion
- safety copy and non-medical framing
- reminder behavior, if any
- tests and acceptance criteria

## Module Contract

Every real module must use the shared app foundation:

- stable `ModuleKey`, route group, settings label, and i18n keys
- shared loading, empty, error, toast, safety/crisis, and mobile form patterns
- online-first drafts that survive failed saves and clear after confirmed save or explicit discard
- reminders off by default, explicit, local where possible, and non-punitive
- schema/repository tests plus one component state test for user-facing flows

Planned boundaries:

- **CBT:** guided self-help strategies under the Gillihan CBT program, private history, recovery planning, pattern insights, and optional quiet reminders
- **Mood tracker:** check-ins only; do not mix in generic journaling
- **Journaling:** private free-text reflection, separate from CBT and check-ins. Spec: [journaling.md](journaling.md)
- **ACT:** focused exercises after a spec
- **Meditation:** guided practice, no reminder or progress pressure without review
- **Gratitude log:** lightweight entries, no default streak pressure

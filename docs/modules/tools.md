# Tools Navigation Spec

Last updated: 2026-05-03

## Purpose

Keep the product modular without implying that future tools are ready.

The protected app sidebar now groups self-help modules under a collapsible `Tools` submenu:

- CBT, also collapsible
  - Overview
  - History
  - Learn
- Mood tracker
- Meditation
- ACT
- Gratitude log

## Current behavior

CBT is the only working tool module.

Mood tracker, Meditation, ACT, and Gratitude log are placeholder routes with explicit under-construction copy. They must not collect data, schedule reminders, create streak pressure, or imply therapeutic outcomes until each module has its own reviewed spec.

## Routes

Working CBT routes:

- `/cbt`
- `/cbt/learn`
- `/cbt/history`
- `/cbt/new`
- `/cbt/[id]`

Placeholder routes:

- `/tools/mood-tracker`
- `/tools/meditation`
- `/tools/act`
- `/tools/gratitude-log`

## Expansion rule

Before any placeholder becomes a real tool, add a module spec covering:

- user problem and feature boundary
- data fields and privacy justification
- safety copy and non-medical framing
- notification or reminder behavior, if any
- tests and acceptance criteria

## Module contract

Every real module must follow the shared app foundation instead of inventing local behavior.

- **Identity:** define a stable `ModuleKey`, route group, settings label, and i18n keys before adding UI.
- **Data:** document persisted fields, privacy justification, RLS ownership, export coverage, and deletion coverage before adding migrations.
- **UI states:** use shared loading, empty, error, toast, safety/crisis, and mobile form patterns from `src/components`.
- **Safety:** include the shared crisis-support pattern where a flow asks for sensitive reflection or distress-related input. Do not claim diagnosis, treatment, crisis response, or emergency support.
- **Drafts:** online-first forms keep unsaved local content after failed saves or temporary network loss and clear only after confirmed save or explicit discard.
- **Reminders:** default off, explicitly enabled, locally scheduled where possible, and always non-punitive.
- **Tests:** add schema/repository tests for data logic and at least one component state test for new user-facing flows.

Current planned module boundaries:

- **CBT:** working guided thought records, distortion learning, history, edit, archive, optional quiet reminders.
- **Mood tracker:** planned check-ins only; do not mix generic journaling into this module.
- **Journaling:** planned free-text/private reflection; keep separate from CBT thought records and mood check-ins.
- **ACT:** planned focused exercises; add its own spec before collecting data.
- **Meditation:** planned guided practice surface; no reminders or progress pressure without review.
- **Gratitude log:** planned lightweight entries; no streak pressure by default.

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

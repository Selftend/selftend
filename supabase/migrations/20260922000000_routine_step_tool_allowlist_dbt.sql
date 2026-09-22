-- Routine steps: the six DBT tool ids join the write allowlist (#2713, #2203).
--
-- The second half of the two-step release 20260912000000 describes, and the
-- first time that step has ever been taken. That migration constrained
-- `routine_steps.tool_id` to the ids EVERY shipped client could read, which in
-- September 2026 meant the twenty non-DBT tools: the DBT six were admitted to
-- the read vocabulary in v0.18.0 but withheld from writing, because a row
-- composed on the web is read by a phone still on the previous store release,
-- and a client with no route, no done-predicate and no label for an id throws
-- on "Do next step".
--
-- ☠️ That condition was met in the same release that created it. v0.18.0
-- carries `/modules/dbt/*` and its labels, and by 2026-09-22 the App Store was
-- live on 0.21.0 and Google Play on 0.23.0 - so every shipped client reads the
-- six. They stayed withheld for 13 further days because nothing goes red while
-- an id sits here past its own condition. `docs/releasing.md` is where a
-- hold-out is now recorded so that someone looks.
--
-- ⚠️ A NEW migration rather than an edit to 20260912000000, as that file
-- requires in its own words: production will not re-run it.
--
-- NOT VALID for the same reason as before: it binds every INSERT and UPDATE
-- from here on, without re-checking rows already in the table. Widening only
-- makes previously-illegal rows legal, so there is nothing here that a
-- validation pass could usefully reject.
--
-- The client half is `WITHHELD_STEP_TOOL_IDS` in
-- src/features/routines/step-tool-rollout.ts, now empty.
-- `step-tool-rollout.test.ts` parses the NEWEST migration declaring this
-- constraint and fails when the two disagree, so neither half can ship alone.

alter table public.routine_steps
  drop constraint if exists routine_steps_tool_id_allowlisted;

alter table public.routine_steps
  add constraint routine_steps_tool_id_allowlisted check (
    tool_id in (
      'mood',
      'journal',
      'gratitude',
      'sleep',
      'cbt',
      'activities',
      'exposure',
      'breathing',
      'grounding',
      'meditation',
      'habits',
      'defusion',
      'expansion',
      'urgeSurf',
      'connection',
      'dropAnchor',
      'observingSelf',
      'bullsEye',
      'choicePoint',
      'committedAction',
      'muscleRelaxation',
      'wiseMind',
      'judgement',
      'emotionRecord',
      'oppositeAction',
      'script'
    )
  ) not valid;

notify pgrst, 'reload schema';

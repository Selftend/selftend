-- Routine steps: constrain tool_id to the ids EVERY shipped client can read (#2203).
--
-- `routine_steps.tool_id` is written by one client and read by another, and
-- those are never the same build. The release workflow deploys this database
-- and the web client the moment a promotion merges, while the Android and iOS
-- builds sit behind Google review and a manual TestFlight promotion for days.
-- A tool id admitted by the new client is therefore live on the web while
-- phones still run the previous release - and that client has no route, no
-- done-predicate and no label for it: the step can never be ticked, the
-- routine can never complete, and its "Do next step" handler throws.
--
-- The database is the layer that deploys FIRST and covers every writer, so the
-- allowlist lives here. It is the write vocabulary, deliberately NOT the read
-- vocabulary: the client keeps reading ids it does not yet write, so a row
-- written by a later build (or already present from before this constraint)
-- still renders normally.
--
-- ☠️ Widening this list is the SECOND half of a two-step release: the client
-- that reads the new id ships first and leaves it withheld; only once that
-- build is live on both stores does a NEW migration add the id here and the
-- same change drop it from WITHHELD_STEP_TOOL_IDS in
-- src/features/routines/step-tool-rollout.ts. `step-tool-rollout.test.ts`
-- parses this file and fails when the two disagree, so neither half can ship
-- on its own. Never edit this migration to widen it - production will not
-- re-run it.
--
-- NOT VALID on purpose: it binds every INSERT and UPDATE from here on, which
-- is the whole point, but does not re-check rows already in the table. Staging
-- has carried the dev build and may already hold DBT-tooled steps; validating
-- against them would wedge the deploy for data that becomes legal again the
-- moment the allowlist widens.

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
      'committedAction'
    )
  ) not valid;

notify pgrst, 'reload schema';

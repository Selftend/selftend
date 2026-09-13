-- Correct the schema comment on `user_preferences.initial_concerns` (#2377,
-- measured on #2365). Comment only: no data, no DDL, nothing observable changes.
--
-- ☠️ THE OLD COMMENT SAID THE COLUMN IS "written once by
-- apply_widget_recommendations", WHICH PRODUCTION DISPROVES. The column is
-- non-null for ZERO of the 64 `user_preferences` rows and always has been, so
-- nothing has ever written it there. The function still exists and is still the
-- only writer, but the migration that added the column (#1612) and the commit
-- that removed the app-side code calling it (#1958) are BOTH contained in tag
-- v0.18.0 - the column reached users in the very build that stopped asking. It
-- was dead on arrival, not closed later.
--
-- That mattered because a report believed the comment: `scripts/analytics-segment.sql`
-- cohorted W4 retention by this column, every account fell into its `unknown`
-- arm, and the gate - which counts retention across the whole population and
-- knows nothing about arms - could still open and declare the cross-tab readable
-- over an empty table. The report is re-based onto locale and module usage in
-- the same change, and it now carries an axis-coverage precondition.
--
-- ⚠️ THE COLUMN IS DELIBERATELY KEPT. Dropping it changes nothing observable and
-- would cost an INTENTIONALLY_DROPPED entry in the export-completeness gate; a
-- comment that says what production does is the cheaper and more honest fix. A
-- pre-redesign native build that still calls the function can still write it, so
-- the column is dormant rather than closed, and a future non-zero value would be
-- a real intake record rather than a defect.
--
-- ⚠️ The next reader should MEASURE the column rather than believe this comment
-- in turn: `select count(*) from public.user_preferences where initial_concerns
-- is not null` is the whole check, and it is how the claim above was reached.
comment on column public.user_preferences.initial_concerns is
  'Concerns declared at first onboarding completion, written once and never updated. '
  'MEASURED EMPTY IN PRODUCTION: non-null for zero accounts, and never non-null for any account (#2365, re-checked 2026-09-13). '
  'apply_widget_recommendations is still the only writer and still exists, but the migration that added this column (#1612) and the commit that removed the app-side caller (#1958) both shipped in tag v0.18.0, so the column arrived in the build that stopped asking - dead on arrival, not closed later. '
  'Only a native build predating the one-panel onboarding can still write it, so treat the column as dormant rather than closed. '
  'NULL means never recorded, which is not the same as no concerns. '
  'DO NOT COHORT ANYTHING BY THIS COLUMN: scripts/analytics-segment.sql did, and every account landed in its unknown arm. It is re-based onto locale and module usage (#2377). '
  'Verify before relying on any of this: select count(*) from public.user_preferences where initial_concerns is not null.';

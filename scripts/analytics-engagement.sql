-- Engagement report: activation, retention, module usage. Aggregate-only by
-- policy (docs/analytics.md): no per-user rows, no user ids, no emails.
--
-- Definitions (agreed 2026-07-14, see docs/analytics.md "Phase 1 in use"):
--   activation : first row in any user-content table; setup actions (enabling
--                modules, widget picks, onboarding flags) deliberately excluded.
--   retention  : signup-anchored windows, week N = days 7*N .. 7*(N+1) after the
--                user's own signup; retained = any content row in the window.
--                Percentages use mature users only (window fully elapsed).
--   usage      : per module (cbt, meditation, gratitude, act, dbt), % of the account
--                population with >=1 record in the module's tables; then the
--                same per core tool (mood, journal, sleep, habits, mindfulness).
--                Nothing is enableable: every tool is reachable from the tools
--                grid, and `user_preferences.enabled_modules` gates nothing
--                (#1672), so "enabled" is not an axis this report carries.
--
-- The W4 column of section 3 is the canonical retention definition that
-- `scripts/analytics-segment.sql` (#1613) cohorts by concern. There is exactly
-- one definition of retention; do not fork a second one.
--
-- Content tables are decrypt-on-read views over *_data base tables; we select
-- only user_id/created_at (never encrypted), and closed-test row counts make
-- any decrypt overhead irrelevant.
--
-- The runner pipes this file through a single psql session, so the temp views
-- below live for the run and vanish afterwards.
--
-- ☠️ Every table below is split by account type (#1613); see the header of
-- `scripts/analytics-onboarding.sql` for why, and for the one thing the split
-- cannot show (guest -> registered conversion happens in place, so a converted
-- guest reads as `registered` for their whole history).

-- ☠️ SECTION 6'S CUTOFF, AND IT IS THE ONE LINE THAT MOVES THAT FIGURE (#1978).
-- `age_floor_met` is null for every account that predates the age gate, and
-- null means *never asked*, not *refused* (docs/age-floor.md, the three-state
-- note). So without a created-after cutoff, "asked, never attested" is the
-- entire pre-gate install base.
--
-- ☠️ The cutoff is the GATE'S OWN, not the release date (#2241, after #2227):
-- `AGE_GATE_INTRODUCED_AT` in src/components/app/protected-layout.tsx, which is
-- the instant of supabase/migrations/20260905000000_age_attestation.sql. The
-- gate scopes who is asked by account age against that constant - deliberately
-- earlier than the release, whose date no client can know - so an account
-- created between the migration instant and the release is asked, and a
-- release-dated cutoff would leave it out. `cutoff_source` names the constant
-- on every row so a reader knows which instant the window is keyed on.
-- test/analytics-age-gate-cutoff.test.ts fails when this instant and the
-- client's constant disagree; move them together.
--
-- ⚠️ These are psql variables, and this report is the first of the three to use
-- one — the other windows here are inline `interval` literals, so do not go
-- looking for a sibling convention. `\set` is used because a variable can be
-- overridden after the definitions block, which is how the integration test
-- exercises a cutoff of its own.
\set age_gate_cutoff_source 'AGE_GATE_INTRODUCED_AT'
\set age_gate_cutoff '2026-09-05T00:00:00Z'

-- ☠️ THE MODULE GATE DATE, AND IT IS DELIBERATELY EMPTY (#2553, ruled on #2535).
-- When the module gate (#2446) removes a programme's door, every run still open
-- stops advancing FOR A REASON THE PRODUCT CAUSED. Section 7b's buckets would
-- then show a population going quiet and mean nothing about the people in it.
--
-- ⚠️ It ANNOTATES, it does not suppress. A rule that hid rows past this date
-- would be the report deciding what the reader may see; a sentence saying what
-- the window contains lets them read the rows and know what they are. That is
-- the same choice 7b makes about thresholds, one layer out.
--
-- Set it to the release instant when the gate ships. While it is empty the
-- annotation does not print at all - not a half-sentence, not an empty date.
--
-- ⚠️ The on/off flag is derived in section 7b, immediately before it is read,
-- NOT here. Deriving it beside this `\set` would freeze it at definition time
-- and make the variable un-overridable, which is the one thing the comment on
-- `age_gate_cutoff` above says these variables are for.
\set programme_gate_date ''

-- The block below is byte-identical in analytics-onboarding.sql and
-- analytics-segment.sql; test/analytics-shared-sql.test.ts fails if they drift.
-- >>> shared:accounts
create temp view accounts as
  select id as user_id,
         created_at,
         -- `email` is carried for the population-provenance block below and for
         -- nothing else. It is never selected into a printed row - every report
         -- is aggregate-only (docs/analytics.md), so no address ever leaves the
         -- database. It is read here rather than in that block because a report
         -- reads the account source exactly once; test/analytics-shared-sql.test.ts
         -- allows exactly one such line per file, and this is it.
         email,
         case when coalesce(is_anonymous, false) then 'guest' else 'registered' end as account
  from public.digest_auth_users;

-- Both labels, so section 0 prints the guest population even while it is zero.
create temp view account_labels(account) as values ('registered'), ('guest');
-- <<< shared:accounts

-- >>> shared:k_suppression
-- k=5 cell suppression. Byte-identical in all three reports;
-- test/analytics-shared-sql.test.ts fails if they drift.
--
-- ☠️ This is a FALSE-PRECISION control first and a privacy control second: a
-- printed "67%" that means two users out of three is the number that gets
-- believed. A count of 1..4 prints `<5`; a percentage whose numerator or
-- denominator is suppressed prints `-`. Zero prints as 0 — an empty arm is
-- information, and it discloses nothing.
--
-- ⚠️ THAT ORDERING DESCRIBES THE SUPPRESSED-COUNT ROUTES, not every route
-- out of these tables. Where a rate prints `0.0%` or `100.0%` the
-- false-precision leg is not engaged at all — those two figures are exactly
-- true, and are the least falsely-precise numbers these reports can print —
-- and privacy is the only leg in play.
--
-- ☠️ THE RULE REASONS ABOUT CELL SIZE, NEVER ABOUT CELL VALUE, and never
-- about what a reader derives from the cells printed BESIDE it. What it
-- therefore does NOT guarantee is written out in docs/analytics.md, "What the
-- floor does not guarantee": the routes that bound or recover a suppressed
-- cell, and the guards that were priced against them and refused.
--
-- ☠️ WHAT IS A SLICE, AND WHAT IS NOT (docs/analytics.md, "Small cells print as
-- `<5`"). The rule governs any cell that SLICES the population — a cell that
-- counts the people who did something (activated, completed, retained, used a
-- module, converted from guest) or who carry some property (a concern arm, a
-- completion mode, a pinned favourite) — and every percentage taken over such a
-- cell.
--
-- It never governs a WHOLE-POPULATION count: how many accounts there are, how
-- many of each type, how many arrived in a given week, how big a signup cohort
-- is. Those are the population itself and the trend over it, they attribute
-- nothing to anybody, and without that carve-out the rule would print `<5`
-- over the very trend the monthly digest exists to show.
--
-- Two blocks are exempt, each carrying its recorded reason: the
-- population-provenance block below, and the first-occurrences section (which
-- prints facts, never counts, so it has no cell to suppress).
--
-- ⚠️ One SECTION is carved out too, and it is not one of those two: the gate
-- status in analytics-segment.sql prints a retained count raw, because it is
-- the distance to a threshold this repo has already committed to in writing
-- and because a two-arm split beside its own total suppresses nothing anyway.
-- The reasoning is written out beside it; do not copy the carve-out anywhere
-- else on the strength of this sentence.
create function pg_temp.k_count(n bigint) returns text
  language sql immutable
  as $$
    select case
      when coalesce(n, 0) = 0 then '0'
      when n < 5 then '<5'
      else n::text
    end
  $$;

create function pg_temp.k_pct(num bigint, den bigint) returns text
  language sql immutable
  as $$
    select case
      when coalesce(den, 0) < 5 then '-'
      when coalesce(num, 0) between 1 and 4 then '-'
      else round(100.0 * coalesce(num, 0) / den, 1)::text || '%'
    end
  $$;
-- <<< shared:k_suppression

-- The block below is byte-identical in analytics-segment.sql;
-- test/analytics-shared-sql.test.ts fails if they drift. A new content table
-- must be added to both, or the segment report silently under-counts retention.
-- >>> shared:content_events
create temp view content_events as
  -- core tools, grouped as 'core'. Nothing below is gated: every tool is on the
  -- tools grid whether or not enabled_modules lists its module (#1672).
  select user_id, created_at, 'core' as module, 'mood' as feature from public.mood_logs
  union all select user_id, created_at, 'core', 'journal' from public.journal_entries
  union all select user_id, created_at, 'core', 'sleep' from public.sleep_logs
  union all select user_id, created_at, 'core', 'habits' from public.habit_logs
  -- mindfulness_sessions backs the breathing, grounding, and mindfulness tools
  union all select user_id, created_at, 'core', 'mindfulness' from public.mindfulness_sessions
  -- cbt module
  union all select user_id, created_at, 'cbt', 'thought_record' from public.thought_records
  union all select user_id, created_at, 'cbt', 'worry' from public.worry_entries
  union all select user_id, created_at, 'cbt', 'anger' from public.anger_logs
  union all select user_id, created_at, 'cbt', 'self_care' from public.self_care_logs
  union all select user_id, created_at, 'cbt', 'activity' from public.activity_logs
  union all select user_id, created_at, 'cbt', 'exposure' from public.exposure_sessions
  -- goals and milestones are routed under modules/cbt, whatever their anchoring
  -- to personal values suggests; a milestone is dated by created_at, not by the
  -- completed_at it also carries, so an unfinished one still counts as use.
  union all select user_id, created_at, 'cbt', 'goal' from public.goals
  union all select user_id, created_at, 'cbt', 'milestone' from public.milestones
  -- The rest of the cbt module's exercise outputs (#2374, ruled on #2383). Each
  -- one is a record of having DONE the exercise, not a setting, so the
  -- authored-configuration rule does not reach it; each module label is the
  -- route the feature lives on, not a guess. Their CHILD rows are deliberately
  -- absent - see the registry in the integration suite.
  union all select user_id, created_at, 'cbt', 'core_belief' from public.core_beliefs
  union all select user_id, created_at, 'cbt', 'challenge_plan' from public.challenge_plans
  union all select user_id, created_at, 'cbt', 'recovery_plan' from public.recovery_plans
  union all select user_id, created_at, 'cbt', 'task' from public.procrastination_tasks
  union all select user_id, created_at, 'cbt', 'exposure_hierarchy' from public.exposure_hierarchies
  union all select user_id, created_at, 'cbt', 'values_profile' from public.values_profile
  -- meditation module
  union all select user_id, created_at, 'meditation', 'session' from public.meditation_sessions
  union all select user_id, created_at, 'meditation', 'stage_practice_note' from public.stage_practice_notes
  -- gratitude module
  union all select user_id, created_at, 'gratitude', 'entry' from public.gratitude_entries
  -- act module
  union all select user_id, created_at, 'act', 'defusion' from public.act_defusion_logs
  union all select user_id, created_at, 'act', 'expansion' from public.act_expansion_logs
  union all select user_id, created_at, 'act', 'urge_surf' from public.act_urge_surf_logs
  union all select user_id, created_at, 'act', 'connection' from public.act_connection_logs
  union all select user_id, created_at, 'act', 'observing_self' from public.act_observing_self_sessions
  union all select user_id, created_at, 'act', 'choice_point' from public.act_choice_points
  union all select user_id, created_at, 'act', 'committed_action' from public.act_committed_actions
  union all select user_id, created_at, 'act', 'bulls_eye' from public.act_bulls_eye_snapshots
  union all select user_id, created_at, 'act', 'value_entry' from public.act_value_entries
  -- dbt module
  union all select user_id, created_at, 'dbt', 'coping_plan' from public.dbt_coping_plans
  union all select user_id, completed_at, 'dbt', 'muscle_relaxation' from public.dbt_sessions
  union all select user_id, created_at, 'dbt', 'wise_mind' from public.dbt_wise_mind_checkins
  union all select user_id, created_at, 'dbt', 'judgement' from public.dbt_judgements
  union all select user_id, created_at, 'dbt', 'emotion_record' from public.dbt_emotion_records
  union all select user_id, created_at, 'dbt', 'opposite_action' from public.dbt_opposite_action_plans
  union all select user_id, created_at, 'dbt', 'script' from public.dbt_scripts;
-- <<< shared:content_events

create temp view first_content as
  select a.user_id as id, a.account, a.created_at as signup_at, min(c.created_at) as first_content_at
  from accounts a
  left join content_events c on c.user_id = a.user_id
  group by 1, 2, 3;

-- The three programmes, one row per account per programme (#2375). Every column
-- read here already exists and is already written for the whole population;
-- this collects nothing new.
--
-- ☠️ `phase_index` DEFAULTS TO 0, for everyone who has never opened the
-- programme. Reading it without `started_at is not null` beside it reports the
-- column default as though it were progress - which is the `enabled_modules`
-- mistake (#1672) in a new place. Section 7 conditions every phase step on
-- having started, and this view keeps the two columns together so that stays
-- easy to see.
--
-- The phase counts live in `programme_labels` just below - CBT_PROGRAM (5),
-- ACT_PROGRAM (4), DBT_PROGRAM (4) in
-- src/features/<module>/program-definition.ts - so the funnel can print one row
-- per phase without a second list of magic numbers.
-- test/analytics-programme-phases.test.ts fails if a programme grows or shrinks
-- and that list is not moved with it.
-- ☠️ The programmes and their lengths, and the ONE place either is written.
-- This is deliberately independent of `accounts`: the funnel's shape must not
-- depend on anybody existing. Derived from the progress view instead - with a
-- `select distinct` over it - it would collapse to NOTHING on a database with
-- no accounts, and section 7 would print zero rows. A fixed-shape table that
-- prints nothing is the one outcome docs/analytics.md rules out, because
-- silence then means either "no data" or "broken" and a reader cannot tell.
create temp view programme_labels(programme, total_phases) as values
  ('cbt', 5), ('act', 4), ('dbt', 4);

create temp view programme_progress as
  select a.user_id,
         a.account,
         p.programme,
         p.started_at,
         p.phase_index,
         p.phase_started_at,
         p.completed_at,
         p.graduation_dismissed_at
  from accounts a
  left join public.user_preferences up on up.user_id = a.user_id
  cross join lateral (values
    ('cbt', up.cbt_program_started_at, up.cbt_program_phase_index,
            up.cbt_program_phase_started_at,
            up.cbt_program_completed_at, up.cbt_graduation_dismissed_at),
    ('act', up.act_program_started_at, up.act_program_phase_index,
            up.act_program_phase_started_at,
            up.act_program_completed_at, up.act_graduation_dismissed_at),
    ('dbt', up.dbt_program_started_at, up.dbt_program_phase_index,
            up.dbt_program_phase_started_at,
            up.dbt_program_completed_at, up.dbt_graduation_dismissed_at)
  ) as p(programme, started_at, phase_index, phase_started_at,
         completed_at, graduation_dismissed_at);

-- ☠️ `phase_started_at` is here for ONE reason, and it is not the phase window:
-- it is half of the FOSSIL. A non-null `phase_started_at` beside a NULL
-- `started_at` is the only record that somebody ran this programme and left,
-- and `phase_index` says where they stopped (#2530, ADR-0012). Until #2552 the
-- view did not select it, so the report could not see a left run at all - which
-- is what made §7's drop-off optimistic and what #2386 was filed about.
--
-- ⚠️ It dates A phase, never THE FIRST time anybody reached one: every advance
-- overwrites it. The first-occurrences exclusion below still stands unchanged.

-- The funnel's steps, generated from each programme's own length rather than
-- listed: started, then one row per later phase, then completed, then
-- graduation dismissed. A FIXED-shape table - every step prints for every
-- programme and both account types, zeros included - because those zeros are
-- the watch list the first-occurrences section reads. Reaching phase 1 IS
-- starting, so the phase steps begin at 2.
--
-- ⚠️ `kind` is the stable key the section branches on; `step` is only the label
-- it prints. They are separate because a `case` on the printed text falls
-- through to the phase branch the moment somebody rewords a label, and would
-- then count completers by phase index without failing anything.
create temp view programme_steps(programme, step_order, step, kind, min_phase_index) as
  select pl.programme, 1, 'started', 'started', 0
    from programme_labels pl
  union all
  select pl.programme, i, 'reached phase ' || i, 'phase', i - 1
    from programme_labels pl
   cross join generate_series(2, pl.total_phases) as i
  union all
  select pl.programme, pl.total_phases + 1, 'completed', 'completed', null
    from programme_labels pl
  union all
  select pl.programme, pl.total_phases + 2, 'graduation dismissed', 'graduation_dismissed', null
    from programme_labels pl;

-- Section 7b's buckets, listed here rather than derived, because a duration
-- band is a reporting choice and not a fact about the data. A FIXED-shape list
-- for the same reason every other table in this file is fixed: every bucket
-- prints for every programme and both account types, zeros included.
--
-- ☠️ These bounds are NOT a threshold and must never acquire one. #2530 refused
-- to store a `stalled` status because a threshold freezes an analyst's
-- judgement into a person's row; naming one of these bands "too long" in a
-- label, a heading or a comment re-commits that error where the reader will
-- read it as the report's own verdict. The bands exist to make a distribution
-- legible, and the reader draws every conclusion.
create temp view quiet_buckets(bucket_order, bucket, from_days, to_days) as values
  (1, '0-7 days', 0, 7),
  (2, '8-30 days', 8, 30),
  (3, '31-90 days', 31, 90),
  (4, '90+ days', 91, null);

-- ============================================================================
-- FIRST OCCURRENCES (#2379). Facts that became true for the FIRST TIME EVER
-- during the covered period.
--
-- ☠️ THIS IS THE SECTION THE WHOLE MONTHLY DIGEST EXISTS FOR, AND IT IS THE ONE
-- MOST LIKELY TO BE DELETED AS DECORATION. Read this before touching it.
--
-- The 2026-09-02 failure is usually described as "nobody read the report". That
-- is NOT what happened, and designing against it produces the wrong instrument.
-- Activation collapsing is exactly what a digest of numbers WOULD have shown,
-- and the reader would have concluded "activation is down" - which is wrong.
-- What actually went missing is that A METRIC'S MEANING CHANGED: anonymous
-- sign-in went live, "signups" quietly became "visitors who tapped a button",
-- and docs/analytics.md had predicted precisely that in writing. Printing
-- quantities more often cannot fix that. Something has to make a REGIME CHANGE
-- visible, and this is it.
--
-- ⚠️ It is NOT the rejected "flag notable movement". `Notable` is a judgement
-- wearing a number's clothes and needs a threshold; zero to non-zero is the
-- boundary of EXISTENCE, not a chosen number. No magnitude, no comparison.
--
-- Each fact fires at most once, ever, so this section shrinks monotonically and
-- is structurally incapable of becoming alert fatigue.
--
-- ☠️ IT PRINTS FACTS - NEVER DATES, NEVER COUNTS. A first occurrence is n=1 by
-- definition, so a count would always be 1, and THE DATE IS THE PART THAT WOULD
-- INDIVIDUATE: "the first guest account was created at 14:07 on the 3rd" is a
-- timestamp belonging to one identifiable person. The period is already stated
-- by the digest, so "this happened for the first time in the covered period" is
-- the whole statement. ⚠️ A later reader WILL want to restore the timestamp as
-- a helpful detail. It is not a helpful detail; it is the aggregate-only rule
-- being quietly broken in a section whose whole defence is that it prints no
-- per-user data. Do not add it.
--
-- This is the second block exempt from the k=5 rule above, and it needs no
-- mechanism: printing facts rather than counts leaves no cell to suppress.

-- The covered period. Defaults to THE CALENDAR MONTH JUST ENDED, which is what
-- the monthly run on the first of the month reports on.
-- ⚠️ The integration suite replaces this view to move the window; nothing else
-- should. A fact is "first" relative to all of history, never to the window -
-- the window only decides whether to PRINT it.
create temp view digest_period as
  select date_trunc('month', now()) - interval '1 month' as period_start,
         date_trunc('month', now())                      as period_end;

-- The modules and the core tools, as literal lists.
--
-- ⚠️ They duplicate the labels in the shared content_events block DELIBERATELY:
-- deriving either from the data would shrink it to whatever has already
-- happened, which is the exact opposite of a watch list - the row that matters
-- most is the module NOBODY HAS USED YET. The integration suite holds each list
-- in step with the block's text rather than with its rows.
--
-- `module_labels` is also what section 4 prints, so the module list is written
-- once in this file rather than twice.
create temp view module_labels(module) as values
  ('cbt'), ('meditation'), ('gratitude'), ('act'), ('dbt');

create temp view core_tool_labels(feature) as values
  ('mood'), ('journal'), ('sleep'), ('habits'), ('mindfulness');

-- The watch list: every fixed-shape row the three reports print, each with the
-- instant it first became true, or null if it never has.
--
-- ☠️ TWO FACTS THE SCHEMA CANNOT DATE, AND BOTH ARE EXCLUDED RATHER THAN FAKED:
--
--   * PER-PHASE PROGRAMME MILESTONES. The funnel's "reached phase N" steps come
--     from `*_program_phase_index`, and `*_program_phase_started_at` holds only
--     the CURRENT phase's start - it is overwritten on every advance. "The first
--     time anybody reached phase 3" is not recoverable. Started, completed and
--     graduation-dismissed all have their own columns and ARE covered. Verified
--     against the live schema: there is no event, audit or history table for
--     programme phases anywhere.
--
--   * A PROGRAMME BEING LEFT. The fossil says THAT somebody left and AT WHICH
--     PHASE - block A in section 7 prints it - but never WHEN. #2530 refused
--     the date deliberately, on data minimisation, and it is not recoverable
--     afterwards. ☠️ `*_program_prompt_dismissed_at` is NOT that date. Yes,
--     `abandonProgram` happens to write it; but `dismissProgramPrompt` writes
--     the same column, so any later dismissal overwrites it with no trace. A
--     value an unrelated tap can silently replace is not a record. DO NOT DATE
--     THIS FACT FROM IT - the column sits right there looking exactly like a
--     leave timestamp, which is why this warning is worth its space.
--
-- ⚠️ AGE-GATE ATTESTATION WAS ALMOST EXCLUDED ON A FALSE PREMISE, and the near
-- miss is worth recording. `age_floor_met` is a bare boolean, so a search for a
-- companion column named after IT finds nothing - but the timestamp exists under
-- a different name, `age_attested_at` (#1762), written at the moment of
-- attestation. The fact is covered below. Do not re-exclude it on the strength
-- of `age_floor_met` having no `_at` twin.
--
-- ☠️ AND A CAVEAT THAT APPLIES TO EVERY FACT DATED FROM `user_preferences`:
-- those columns are STATE, NOT EVENTS. `abandonProgram` NULLS
-- `*_program_started_at`; `*_program_completed_at` now SURVIVES every writer
-- (#2530, ADR-0012) but still holds only the MOST RECENT completion, so a
-- person who finishes, replays and finishes again overwrites their first one;
-- and `reminder_consent_updated_at` holds the time of the LAST change, so a
-- consent later revoked is not visible at all. A `min()` over current state can
-- therefore be LATER than the truth, and a fact can fire a month late - or, if
-- everyone who held it has since reverted, not yet at all. Facts dated from
-- append-only rows (auth.users, content_events, auth.identities) are exact.
-- See docs/analytics.md and the funnel's own abandonment note in section 7.
create temp view first_occurrences(fact_order, fact, first_at) as
  -- Account types. Exact: auth.users rows are append-only.
  -- ☠️ The guest row is the one that matters. This is the fact that WOULD have
  -- fired in the digest after 2026-09-02, beside a release list naming the
  -- release responsible, and it is the worked example in docs/analytics.md.
  select 1, 'a ' || l.account || ' account exists',
         (select min(a.created_at) from accounts a where a.account = l.account)
    from account_labels l
  union all
  -- Modules. Exact: content rows are append-only.
  -- ⚠️ JOINED TO `accounts`, exactly as sections 4 and 5 join it. Without that
  -- a content row whose account no longer exists would still fire the fact, and
  -- this section would disagree with the very tables it watches.
  select 2, 'the ' || m.module || ' module has been used',
         (select min(c.created_at)
            from content_events c
            join accounts a on a.user_id = c.user_id
           where c.module = m.module)
    from module_labels m
  union all
  -- Core tools. Exact, same reason, same join.
  select 3, 'the ' || t.feature || ' tool has been used',
         (select min(c.created_at)
            from content_events c
            join accounts a on a.user_id = c.user_id
           where c.module = 'core' and c.feature = t.feature)
    from core_tool_labels t
  union all
  -- Programme milestones. ⚠️ Dated from state - see the caveat above.
  select 4, pl.programme || ' programme: somebody has ' || k.label,
         -- ⚠️ Every branch is named and there is NO catch-all `else`. Section 7
         -- learned this the hard way: a fall-through branch silently absorbs any
         -- kind added later, and would date a new milestone from the graduation
         -- column without failing anything. An unnamed kind yields null here,
         -- which prints nothing rather than something wrong.
         (select min(case k.kind
                       when 'started' then pp.started_at
                       when 'completed' then pp.completed_at
                       when 'graduation_dismissed' then pp.graduation_dismissed_at
                     end)
            from programme_progress pp where pp.programme = pl.programme)
    from programme_labels pl
   cross join (values ('started', 'started it'),
                      ('completed', 'completed it'),
                      ('graduation_dismissed', 'dismissed its graduation')) as k(kind, label)
  union all
  -- Reminder consent. ⚠️ Dated from state - see the caveat above.
  select 5, 'somebody has consented to reminders',
         (select min(p.reminder_consent_updated_at)
            from public.user_preferences p
            join accounts a on a.user_id = p.user_id
           where p.reminder_consent)
  union all
  -- The age gate. `age_attested_at` is the instant the verdict was written
  -- (#1762); `age_floor_met` null means never asked, so a non-null timestamp is
  -- an attestation whichever way the verdict went. ⚠️ Dated from state: it is
  -- overwritten if somebody attests again.
  select 6, 'somebody has answered the age gate',
         (select min(p.age_attested_at)
            from public.user_preferences p
            join accounts a on a.user_id = p.user_id)
  union all
  -- The first guest-to-registered conversion, on the identity clock the
  -- onboarding report's section 4 defines (#2376): the account's EARLIEST
  -- identity, more than a second after the account itself. Exact:
  -- auth.identities rows are append-only.
  select 7, 'a guest account has converted to registered',
         (select min(f.first_identity_at)
            from (select i.user_id, min(i.created_at) as first_identity_at
                    from public.digest_auth_identities i group by 1) f
            join accounts a on a.user_id = f.user_id
           where f.first_identity_at > a.created_at + interval '1 second');

-- >>> shared:population_provenance
-- Who is in this population (docs/analytics.md, "Who is in the population").
-- Byte-identical in all three reports; test/analytics-shared-sql.test.ts fails
-- if they drift, and each report prints it separately and deliberately: every
-- report runs independently, so a surviving one must carry its own population
-- statement when another throws.
--
-- The `accounts` view has no WHERE, so every figure in every report includes
-- the project's own accounts. Excluding them was refused; what ships instead is
-- a measurement of how many of them there are.
--
-- ☠️ THIS BLOCK IS EXEMPT FROM THE k=5 RULE ABOVE, and BOTH reasons are
-- recorded here so the exemption can never be mistaken for an oversight:
--
--   * it counts THE PROJECT'S OWN accounts, so the privacy rationale does not
--     apply to it at all; and
--   * an upper bound is already the anti-false-precision form, so the
--     false-precision rationale is not merely absent but inverted.
--
-- Without the exemption the number would vanish behind `<5` precisely as
-- cleanup succeeded and it finally became good news, leaving a reader unable to
-- tell "almost none" from "withheld". The counts below are therefore raw.
--
-- ⚠️ Not the same thing as `=== 0) Population split` below. That one is about
-- account TYPE (registered or guest); this one is about account PROVENANCE
-- (ours or theirs). Two different questions, one overloaded word.
-- ⚠️ The owner address is in source deliberately. It is not a secret and not a
-- new disclosure: it is the author address on every commit in this repository,
-- and plus-tagged variants of the same mailbox are already written into
-- docs/app-store-review-information.md. The exact count has to compare against
-- something, and a report that kept the address out of the file could not
-- produce the figure docs/analytics.md asks it for.
\set owner_email 'vasil.yoshev@gmail.com'

\echo
\echo '=== Population provenance (how much of this population belongs to the project itself; raw counts, exempt from k=5 - the SQL comment says why) ==='
\echo '    owner_exact          Accounts on the owner address as written, plus-tags of it included. Exact in the'
\echo '                         sense that no stranger holds that address - not in the sense of catching every'
\echo '                         account the owner could make. An address with no marker on it is not in here.'
\echo '    internal_upper_bound AN UPPER BOUND, never a point estimate: plus-tagged, or carrying a demo or test'
\echo '                         string. It bounds what the MARKERS can find, and it over-counts on purpose - a'
\echo '                         real person may plus-tag their own mail, and demo and test are ordinary words.'
\echo '    registered_accounts  The population the two counts above are drawn from, so the bound can be read.'
\echo '    guest_accounts       NOT IDENTIFIABLE AT ALL, and outside both counts. A guest account has no email,'
\echo '                         by construction, so nothing separates a guest minted by a user test from a'
\echo '                         stranger who tapped the button.'
\echo '    AGENTS.md requires deleting throwaway test accounts, so a large bound is a record of cleanup left undone.'
select count(*) filter (where p.owner_address)                              as owner_exact,
       count(*) filter (where p.owner_address or p.plus_tagged or p.demo_or_test_string) as internal_upper_bound,
       count(*) filter (where a.account = 'registered')                     as registered_accounts,
       count(*) filter (where a.account = 'guest')                          as guest_accounts
from accounts a
cross join lateral (
  -- The local part with any plus tag stripped, put back on its own domain:
  -- a plus tag of the owner address IS the owner address. ☠️ The inner
  -- split_part is load-bearing - split_part(addr, '+', 1) on an UNTAGGED
  -- address returns the whole thing, domain included, and the owner would then
  -- be the only account the exact count missed.
  select split_part(split_part(lower(coalesce(a.email, '')), '@', 1), '+', 1)
           || '@' || split_part(lower(coalesce(a.email, '')), '@', 2)
         = lower(:'owner_email')                                      as owner_address,
         split_part(lower(coalesce(a.email, '')), '@', 1) like '%+%'  as plus_tagged,
         (coalesce(a.email, '') <> ''
            and (lower(a.email) like '%demo%'
              or lower(a.email) like '%test%'))            as demo_or_test_string
) p;
-- <<< shared:population_provenance


\echo
\echo '=== First occurrences (facts true for the FIRST TIME EVER during the covered period) ==='
\echo '    READ THIS BESIDE THE RELEASE LIST. One says what changed, the other says something began.'
\echo '    This is the section that answers the 2026-09-02 failure: a metric whose MEANING changed,'
\echo '    which no amount of printing quantities more often can surface. Zero to non-zero is the'
\echo '    boundary of existence, not a chosen threshold - there is nothing notable being judged here.'
\echo '    Each fact fires at most once, ever, so this section shrinks over time and cannot become noise.'
\echo '    FACTS ONLY - no dates and no counts, deliberately. A first occurrence is n=1 by definition,'
\echo '    and the date is the part that would individuate. The SQL comment says why not to restore it.'
\echo '    Exempt from the k=5 rule, and it needs no mechanism: there is no cell here to suppress.'
\echo '    ONE CAVEAT WORTH KNOWING: facts read from user_preferences (programme milestones, reminder'
\echo '    consent, the age gate) are dated from CURRENT STATE, not from an event log. Those columns'
\echo '    are overwritten or cleared, so such a fact can fire a month late - or, if somebody consented'
\echo '    and later revoked, name a month that is not really the first. Facts read from accounts,'
\echo '    content rows and sign-in identities are exact.'
\echo '    OPEN SHAPE: only what exists prints, so a single (no rows) row means the query ran'
\echo '    and matched nothing. A section printing NO rows at all is a bug, never a reading.'
\echo '    A (no rows) here is the ordinary case: it means nothing happened for the first time.'
with section_rows as (
  select fo.fact_order, fo.fact
  from first_occurrences fo
  cross join digest_period d
  where fo.first_at >= d.period_start
    and fo.first_at <  d.period_end
)
select fact
from (
  select fact, fact_order, 0 as empty_marker from section_rows
  union all
  select '(no rows)', null, 1 where not exists (select 1 from section_rows)
) t
order by t.empty_marker, t.fact_order, t.fact;
\echo
\echo '=== 0) Population split (every table below carries this axis) ==='
select l.account,
       count(a.user_id) as users,
       round(100.0 * count(a.user_id) / nullif((select count(*) from accounts), 0), 1) as pct
from account_labels l
left join accounts a on a.account = l.account
group by 1 order by 2 desc, 1;

\echo
\echo '=== 1) Activation summary (72h metrics count only signups older than 72h) ==='
\echo '    `<5` = k=5 suppressed count; `-` = percentage withheld because a contributing cell is suppressed.'
\echo '    `signups` and `signups_72h_mature` are whole-population counts and print raw.'
select l.account,
       count(f.id) as signups,
       pg_temp.k_count(count(f.first_content_at)) as activated,
       pg_temp.k_pct(count(f.first_content_at), count(f.id)) as activated_pct,
       count(f.id) filter (where f.signup_at <= now() - interval '72 hours') as signups_72h_mature,
       pg_temp.k_count(count(f.id) filter (where f.first_content_at <= f.signup_at + interval '72 hours'
                                             and f.signup_at <= now() - interval '72 hours'))
         as activated_within_72h,
       pg_temp.k_pct(count(f.id) filter (where f.first_content_at <= f.signup_at + interval '72 hours'
                                           and f.signup_at <= now() - interval '72 hours'),
                     count(f.id) filter (where f.signup_at <= now() - interval '72 hours'))
         as activated_72h_pct
from account_labels l
left join first_content f on f.account = l.account
group by 1 order by 1;

\echo
\echo '=== 2) Activation by signup week, last 12 weeks ==='
\echo '    `<5` = k=5 suppressed count; `-` = percentage withheld because a contributing cell is suppressed.'
\echo '    `signups` is the weekly arrival trend, a whole-population count, and prints raw.'
\echo '    OPEN SHAPE: only what exists prints, so a single (no rows) row means the query ran'
\echo '    and matched nothing. A section printing NO rows at all is a bug, never a reading.'
with section_rows as (
  select account,
         date_trunc('week', signup_at)::date as week,
         count(*) as signups,
         pg_temp.k_count(count(first_content_at)) as activated,
         pg_temp.k_pct(count(first_content_at), count(*)) as activated_pct,
         pg_temp.k_count(count(*) filter (where first_content_at <= signup_at + interval '72 hours'))
           as activated_within_72h
  from first_content
  where signup_at >= date_trunc('week', now()) - interval '11 weeks'
  group by 1, 2
)
select account, week, signups, activated, activated_pct, activated_within_72h
from (
  select account, week, signups, activated, activated_pct, activated_within_72h, 0 as empty_marker
    from section_rows
  union all
  select '(no rows)', null, null, null, null, null, 1 where not exists (select 1 from section_rows)
) t
order by t.empty_marker, t.week desc, t.account;

\echo
\echo '=== 3) Retention cohorts (week N = days 7N..7(N+1) after own signup; pct over mature users) ==='
\echo '    `-` = percentage withheld because a contributing cell rests on fewer than five users.'
\echo '    `cohort_size` is how many people arrived that week - a whole-population count - and prints raw.'
\echo '    OPEN SHAPE: only what exists prints, so a single (no rows) row means the query ran'
\echo '    and matched nothing. A section printing NO rows at all is a bug, never a reading.'
with flags as (
  select a.account,
         date_trunc('week', a.created_at)::date as signup_week,
         a.created_at as signup_at,
         bool_or(c.created_at >= a.created_at + interval '7 days'
             and c.created_at <  a.created_at + interval '14 days') as w1,
         bool_or(c.created_at >= a.created_at + interval '14 days'
             and c.created_at <  a.created_at + interval '21 days') as w2,
         bool_or(c.created_at >= a.created_at + interval '21 days'
             and c.created_at <  a.created_at + interval '28 days') as w3,
         bool_or(c.created_at >= a.created_at + interval '28 days'
             and c.created_at <  a.created_at + interval '35 days') as w4
  from accounts a
  left join content_events c on c.user_id = a.user_id
  group by a.user_id, 1, 2, 3
),
cohorts as (
  select account,
         signup_week,
         count(*) as cohort_size,
         pg_temp.k_pct(count(*) filter (where w1),
                       count(*) filter (where signup_at <= now() - interval '14 days')) as w1_pct,
         pg_temp.k_pct(count(*) filter (where w2),
                       count(*) filter (where signup_at <= now() - interval '21 days')) as w2_pct,
         pg_temp.k_pct(count(*) filter (where w3),
                       count(*) filter (where signup_at <= now() - interval '28 days')) as w3_pct,
         pg_temp.k_pct(count(*) filter (where w4),
                       count(*) filter (where signup_at <= now() - interval '35 days')) as w4_pct
  from flags
  where signup_week >= date_trunc('week', now())::date - interval '11 weeks'
  group by 1, 2
)
select account, signup_week, cohort_size, w1_pct, w2_pct, w3_pct, w4_pct
from (
  select account, signup_week, cohort_size, w1_pct, w2_pct, w3_pct, w4_pct, 0 as empty_marker
    from cohorts
  union all
  select '(no rows)', null, null, null, null, null, null, 1
   where not exists (select 1 from cohorts)
) t
order by t.empty_marker, t.signup_week desc, t.account;

\echo
\echo '=== 4) Module usage (cbt, meditation, gratitude, act, dbt; distinct users with >=1 record, pct of that account population) ==='
\echo '    `<5` = k=5 suppressed count; `-` = percentage withheld because a contributing cell is suppressed.'
-- A content row is the only adoption signal the schema carries. This table
-- used to add "enabled" and "enabled-but-never-used" columns read from
-- `user_preferences.enabled_modules`, an array that gates nothing (#1672; the
-- history is in docs/analytics.md, under this report).
-- test/analytics-shared-sql.test.ts keeps the column out.
with totals as (
  select l.account, count(a.user_id) as all_users
  from account_labels l
  left join accounts a on a.account = l.account
  group by 1
),
used as (
  select a.account, c.module, count(distinct c.user_id) as used_users
  from content_events c
  join accounts a on a.user_id = c.user_id
  where c.module in (select module from module_labels)
  group by 1, 2
)
select t.account,
       mods.module,
       pg_temp.k_count(coalesce(u.used_users, 0)) as users,
       pg_temp.k_pct(coalesce(u.used_users, 0), t.all_users) as users_pct
from module_labels as mods
cross join totals t
left join used u on u.module = mods.module and u.account = t.account
order by t.account, mods.module;

\echo
\echo '=== 5) Core tool usage (per feature; distinct users with >=1 record, pct of that account population) ==='
\echo '    `<5` = k=5 suppressed count; `-` = percentage withheld because a contributing cell is suppressed.'
\echo '    Ordered by the true user count, as the segment report orders its arms: READ THE ORDERING.'
\echo '    OPEN SHAPE: only what exists prints, so a single (no rows) row means the query ran'
\echo '    and matched nothing. A section printing NO rows at all is a bug, never a reading.'
with section_rows as (
  select a.account,
         c.feature,
         pg_temp.k_count(count(distinct c.user_id)) as users,
         pg_temp.k_pct(count(distinct c.user_id),
                       (select count(*) from accounts x where x.account = a.account)) as users_pct,
         count(distinct c.user_id) as sort_users
  from content_events c
  join accounts a on a.user_id = c.user_id
  where c.module = 'core'
  group by 1, 2
)
select account, feature, users, users_pct
from (
  select account, feature, users, users_pct, sort_users, 0 as empty_marker from section_rows
  union all
  select '(no rows)', null, null, null, null, 1 where not exists (select 1 from section_rows)
) t
order by t.empty_marker, t.sort_users desc, t.feature, t.account;

\echo
\echo '=== 6) Asked, never attested (accounts the age gate scopes as new - created at or after AGE_GATE_INTRODUCED_AT - that never wrote a verdict) ==='
\echo '    `<5` = k=5 suppressed count; `-` = percentage withheld because a contributing cell is suppressed.'
\echo '    `accounts_since_cutoff` is how many accounts the window holds - a whole-population count - and prints raw.'
-- #1978, the evidence #1936 reopens the gate's placement on. The person counted
-- here met the age gate on an account the gate treats as new and did not get
-- past it:
--
--   * `age_floor_met is null` - no verdict was ever written, and
--   * the account was created at or after the cutoff instant (see the `\set`
--     at the top of this file, and read its ☠️ before touching this section).
--     `>=`, because the gate exempts strictly-before and asks everyone else.
--
-- ☠️ The consent column is deliberately NOT a condition (#2241). It used to be
-- - "someone who stopped at the age gate never reached the consent gate behind
-- it" - which is true of an account whose first launch carries the gate and
-- false for the cohort #2227 exists for: an account created on 0.17.0 (consent
-- wall, no age gate) already has a policy version on record, meets the age
-- gate on updating, and is precisely who the gate now asks. The shipped rule
-- exempts only "created before the instant AND already consented"; at or after
-- the instant everyone is asked, whatever the consent column says, so the
-- report asks nothing of it either.
--
-- ⚠️ What stays out, on purpose: an account created BEFORE the instant that has
-- never accepted any policy is asked by the gate too (it has been through
-- neither gate), but it is the pre-gate install base whose null means never
-- asked, and the row cannot tell one that stopped at 0.17.0's consent wall
-- from one that met the age gate on updating. Counting it would put the whole
-- never-consented install base back into a figure meant to answer "how many
-- stop at the first screen of a new account".
--
-- No collection is added: the column already exists, and this is a derived
-- count over it. Under-floor exits are NOT in this number - they delete the
-- account, so they never appear as a null. Platform is not knowable from the
-- row and is deliberately not an axis (#1936 accepted that); this answers "how
-- many stop at the first screen", never "on which platform".
--
-- ⚠️ The left join to user_preferences is load-bearing, not defensive: an
-- account that stopped at the gate may have no preferences row at all, and that
-- person is exactly the one being counted. `count(a.user_id)` ignores nulls, so
-- an account type with nobody in the window prints 0 rather than vanishing.
select l.account,
       :'age_gate_cutoff_source' as cutoff_source,
       :'age_gate_cutoff' as cutoff_at,
       count(a.user_id) as accounts_since_cutoff,
       pg_temp.k_count(count(a.user_id) filter (where p.age_floor_met is null))
         as asked_never_attested,
       pg_temp.k_pct(count(a.user_id) filter (where p.age_floor_met is null),
                     count(a.user_id)) as asked_never_attested_pct
from account_labels l
left join accounts a
       on a.account = l.account
      and a.created_at >= :'age_gate_cutoff'::timestamptz
left join public.user_preferences p on p.user_id = a.user_id
group by 1 order by 1;

\echo
\echo '=== 7) Programme funnel (cbt, act, dbt; how far people get through a programme run) ==='
\echo '    `<5` = k=5 suppressed count; `-` = percentage withheld because a contributing cell is suppressed.'
\echo '    Every step prints for every programme and both account types, zeros included: those zeros are the'
\echo '    watch list, and the month somebody first completes a programme is the month this stops being zero.'
\echo '    `pct_of_starters` is a share of the people whose start is STILL ON RECORD - never of the population.'
\echo '    ☠️ READ THIS BEFORE READING THE NUMBERS. The funnel is a snapshot of runs IN PROGRESS and runs'
\echo '    COMPLETED. Leaving a programme sets started_at back to null, so somebody who started and left is'
\echo '    counted at NO step here and is absent from the denominator too - the drop-off this table shows is'
\echo '    OPTIMISTIC as a funnel. It is no longer the whole picture: the block below counts the people who'
\echo '    left and the phase they left at, from the record a leave keeps (#2530). What nothing here can'
\echo '    show is WHEN a run started that was later left, WHEN it was left, or that a previous run existed'
\echo '    at all - all three refused on purpose, not missing by accident.'
-- #2375. None of this was reported anywhere before, which is an odd gap for the
-- part of the product AGENTS.md names as core MVP alongside the everyday tools.
--
-- ☠️ Read `programme_progress` above before changing anything here: every phase
-- step is conditioned on `started_at is not null`, because `phase_index`
-- defaults to 0 and a report that drops that condition counts the whole
-- population as having reached phase 1.
--
-- ☠️ THE COLUMNS ARE CURRENT STATE, NOT EVENTS, and that bounds what this
-- section can honestly claim - but the bound is narrower than it used to be.
-- `abandonProgram` in src/features/<module>/use-<module>-program.ts writes
-- `started_at = null` and leaves phase_index AND phase_started_at where they
-- were, so a leave is not erased: that pair is the FOSSIL, and block A below
-- reads it. What a leave does not carry is a DATE (#2530, ADR-0012).
--
-- ⚠️ So do not describe THE FUNNEL as a cohort of everyone who ever started -
-- it shows how far the people still in a programme have got, and block A stands
-- beside it for the ones who left. ☠️ And do not fold block A into the funnel:
-- an abandoned run is not FURTHER ALONG, the step table is generated from
-- programme length keyed on min_phase_index, and forcing an exit into it would
-- corrupt a shape that is load-bearing. What the fossil holds is a
-- DISTRIBUTION OVER EXIT PHASE, and it prints as one.
--
-- ⚠️ Stalling is still not measured here. #2553 adds the quiet-duration
-- buckets; this section says nothing about how long anybody has been anywhere.
with reached as (
  select l.account,
         s.programme,
         s.step,
         s.step_order,
         -- ☠️ Computed ONCE. It used to be copied into the count and the
         -- percentage, which put the started_at guard in two places that had to
         -- be kept in step by hand.
         count(pp.user_id) filter (
           where case s.kind
             when 'completed' then pp.completed_at is not null
             when 'graduation_dismissed' then pp.graduation_dismissed_at is not null
             else pp.started_at is not null and pp.phase_index >= s.min_phase_index
           end
         ) as users,
         count(pp.user_id) filter (where pp.started_at is not null) as starters
  from account_labels l
  cross join programme_steps s
  left join programme_progress pp
         on pp.account = l.account
        and pp.programme = s.programme
  group by l.account, s.programme, s.step, s.step_order
)
select account,
       programme,
       step,
       pg_temp.k_count(users) as users,
       pg_temp.k_pct(users, starters) as pct_of_starters
from reached
order by account, programme, step_order;

\echo
\echo '    -- 7a) Programmes people left, by the phase they left at --'
\echo '    `<5` = k=5 suppressed count. Every phase prints for every programme and both account types,'
\echo '    zeros included, exactly as the funnel above does: those zeros are the watch list.'
\echo '    ☠️ This is BESIDE the funnel and is NOT a step in it. A left run is not further along.'
\echo '    It says THAT somebody left and AT WHICH PHASE. It cannot say WHEN, and never will (#2530).'
-- ☠️ BLOCK A (#2552). The first place anywhere in the product that a left
-- programme is visible. Before this, somebody who reached phase 4 and stopped
-- appeared in no number at all - which is the whole of #2386.
--
-- The fossil is `phase_started_at is not null AND started_at is null`:
-- `abandonProgram` nulls the start and leaves the phase pair standing, and
-- #2530 promoted that omission to a contract with a test behind it
-- (test/programme-fossil-contract.test.ts). `phase_index` is the exit phase,
-- 0-based, so it prints as `phase_index + 1`.
--
-- ⚠️ FIXED SHAPE, like everything else in this file: the phase list is
-- generated from `programme_labels.total_phases` and cross-joined against both
-- account labels, so a phase nobody has left still prints a zero. A block that
-- printed only non-empty rows would silently stop mentioning a programme, and
-- the absence would read as "nothing to see" rather than "nobody left".
--
-- ⚠️ There is no percentage here on purpose. A share needs a denominator, and
-- the only honest one would be "everyone who ever started this programme" -
-- which is exactly the number the schema does not keep. Counts only.
with left_at as (
  select l.account,
         pl.programme,
         ph.phase,
         count(pp.user_id) filter (
           where pp.started_at is null and pp.phase_started_at is not null
             and pp.phase_index = ph.phase - 1
         ) as users
  from account_labels l
  cross join programme_labels pl
  cross join lateral generate_series(1, pl.total_phases) as ph(phase)
  left join programme_progress pp
         on pp.account = l.account
        and pp.programme = pl.programme
  group by l.account, pl.programme, ph.phase
)
select account,
       programme,
       'left at phase ' || phase as exit_phase,
       pg_temp.k_count(users) as users
from left_at
order by account, programme, phase;

\echo
\echo '    -- 7b) How long since a run still open last moved --'
\echo '    `<5` = k=5 suppressed count. Every bucket prints for every programme and both account types,'
\echo '    zeros included. Counts runs that are STILL OPEN - not the ones above, which are over.'
\echo '    ☠️ These are durations, not a verdict. The report states how long; it does not say how long is'
\echo '    too long, and no number here is a judgement about any person. Read the buckets yourself.'
select case when :'programme_gate_date' = '' then 'off' else 'on' end
  as programme_gate_annotated \gset
\if :programme_gate_annotated
\echo '    ⚠️ Buckets reaching past the module gate date include a window in which no run COULD advance,'
\echo '    because the door was gone. That part of the wait is the product, not the person.'
\endif
-- ☠️ BLOCK B (#2553, ruled on #2535). The ONE thing this block must never do is
-- classify. #2530 refused to STORE a `stalled` status because a threshold
-- freezes one analyst's judgement into a person's row, as an inference about a
-- mental-health behaviour. A block that printed `stalled: 10` would commit that
-- same error one layer out, in a column heading instead of a column.
--
-- ☠️ SO: no threshold, and the word "stalled" appears NOWHERE in what this
-- prints. Buckets state the record and the reader does the reading - which is
-- `show the record, don't read it` (#711) applied to the instrument itself.
-- test/analytics-quiet-buckets.test.ts fails if that word reaches the output.
--
-- ⚠️ "Last moved" is `coalesce(phase_started_at, started_at)`: the current
-- phase's start, falling back to the programme's for a run that has never
-- advanced. That coalesce is the same read the app itself does, and #2533's
-- guardrail - the product may show WHERE you are, never HOW LONG - binds
-- RENDERING, not reading. This is a maintainer's report, not a surface.
--
-- ⚠️ A run is open when it has a start and is not graduated, and graduated is
-- `completed_at >= started_at` (ADR-0012), never `completed_at is not null` -
-- a completion now outlives the run that earned it. A left run has no
-- `started_at` and is therefore absent here, where it belongs: it is over, and
-- block A above is where it is counted.
with open_runs as (
  select pp.account,
         pp.programme,
         floor(
           extract(epoch from (now() - coalesce(pp.phase_started_at, pp.started_at))) / 86400
         )::bigint as quiet_days
  from programme_progress pp
  where pp.started_at is not null
    and (pp.completed_at is null or pp.completed_at < pp.started_at)
),
bucketed as (
  select l.account,
         pl.programme,
         b.bucket_order,
         b.bucket,
         count(r.account) filter (
           where r.quiet_days >= b.from_days
             and (b.to_days is null or r.quiet_days <= b.to_days)
         ) as users
  from account_labels l
  cross join programme_labels pl
  cross join quiet_buckets b
  left join open_runs r
         on r.account = l.account
        and r.programme = pl.programme
  group by l.account, pl.programme, b.bucket_order, b.bucket
)
select account,
       programme,
       bucket as since_last_phase_move,
       pg_temp.k_count(users) as users
from bucketed
order by account, programme, bucket_order;

\echo '=== 8) Reminder adoption (user_preferences.reminder_consent) ==='
\echo '    `<5` = k=5 suppressed count; `-` = percentage withheld because a contributing cell is suppressed.'
\echo '    `accounts` is a whole-population count and prints raw.'
-- ☠️ THIS SECTION READS `reminder_consent` AND MUST NOT READ
-- `notifications_enabled_global`. This is the section most at risk of being
-- "improved" into uselessness by a later reader who notices the consent number
-- is small and the global number is big, and swaps one for the other.
--
-- `notifications_enabled_global` DEFAULTS TO TRUE and is true for very nearly
-- everyone, so reporting it would measure a default rather than a decision -
-- the `enabled_modules` mistake (#1672) repeated exactly, on a new column.
-- `reminder_consent` defaults to FALSE and is set only by someone choosing it,
-- so it is the column that varies, and it is the figure that evidences the
-- quiet-by-default guardrail in AGENTS.md actually holding.
--
-- test/analytics-shared-sql.test.ts fails any report that reads the global
-- column, so this is not a convention anyone has to remember.
select l.account,
       count(a.user_id) as accounts,
       pg_temp.k_count(count(a.user_id) filter (where p.reminder_consent)) as consented,
       pg_temp.k_pct(count(a.user_id) filter (where p.reminder_consent),
                     count(a.user_id)) as consent_pct
from account_labels l
left join accounts a on a.account = l.account
left join public.user_preferences p on p.user_id = a.user_id
group by 1 order by 1;

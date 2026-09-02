-- Engagement report: activation, retention, module usage. Aggregate-only by
-- policy (docs/analytics.md): no per-user rows, no user ids, no emails.
--
-- Definitions (agreed 2026-07-14, see docs/analytics.md "Phase 1 in use"):
--   activation : first row in any user-content table; setup actions (enabling
--                modules, widget picks, onboarding flags) deliberately excluded.
--   retention  : signup-anchored windows, week N = days 7*N .. 7*(N+1) after the
--                user's own signup; retained = any content row in the window.
--                Percentages use mature users only (window fully elapsed).
--   usage      : per module (cbt, meditation, gratitude, act), % of the account
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

-- The block below is byte-identical in analytics-onboarding.sql and
-- analytics-segment.sql; test/analytics-shared-sql.test.ts fails if they drift.
-- >>> shared:accounts
create temp view accounts as
  select id as user_id,
         created_at,
         case when coalesce(is_anonymous, false) then 'guest' else 'registered' end as account
  from auth.users;

-- Both labels, so section 0 prints the guest population even while it is zero.
create temp view account_labels(account) as values ('registered'), ('guest');
-- <<< shared:accounts

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
  -- meditation module
  union all select user_id, created_at, 'meditation', 'session' from public.meditation_sessions
  -- gratitude module
  union all select user_id, created_at, 'gratitude', 'entry' from public.gratitude_entries
  -- act module
  union all select user_id, created_at, 'act', 'defusion' from public.act_defusion_logs
  union all select user_id, created_at, 'act', 'expansion' from public.act_expansion_logs
  union all select user_id, created_at, 'act', 'urge_surf' from public.act_urge_surf_logs
  union all select user_id, created_at, 'act', 'connection' from public.act_connection_logs
  union all select user_id, created_at, 'act', 'observing_self' from public.act_observing_self_sessions
  union all select user_id, created_at, 'act', 'choice_point' from public.act_choice_points
  union all select user_id, created_at, 'act', 'committed_action' from public.act_committed_actions;
-- <<< shared:content_events

create temp view first_content as
  select a.user_id as id, a.account, a.created_at as signup_at, min(c.created_at) as first_content_at
  from accounts a
  left join content_events c on c.user_id = a.user_id
  group by 1, 2, 3;

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
select l.account,
       count(f.id) as signups,
       count(f.first_content_at) as activated,
       round(100.0 * count(f.first_content_at) / nullif(count(f.id), 0), 1) as activated_pct,
       count(f.id) filter (where f.signup_at <= now() - interval '72 hours') as signups_72h_mature,
       count(f.id) filter (where f.first_content_at <= f.signup_at + interval '72 hours'
                             and f.signup_at <= now() - interval '72 hours') as activated_within_72h,
       round(100.0 * count(f.id) filter (where f.first_content_at <= f.signup_at + interval '72 hours'
                                           and f.signup_at <= now() - interval '72 hours')
             / nullif(count(f.id) filter (where f.signup_at <= now() - interval '72 hours'), 0), 1)
         as activated_72h_pct
from account_labels l
left join first_content f on f.account = l.account
group by 1 order by 1;

\echo
\echo '=== 2) Activation by signup week, last 12 weeks ==='
select account,
       date_trunc('week', signup_at)::date as week,
       count(*) as signups,
       count(first_content_at) as activated,
       round(100.0 * count(first_content_at) / count(*), 1) as activated_pct,
       count(*) filter (where first_content_at <= signup_at + interval '72 hours')
         as activated_within_72h
from first_content
where signup_at >= date_trunc('week', now()) - interval '11 weeks'
group by 1, 2 order by 2 desc, 1;

\echo
\echo '=== 3) Retention cohorts (week N = days 7N..7(N+1) after own signup; pct over mature users) ==='
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
)
select account,
       signup_week,
       count(*) as cohort_size,
       round(100.0 * count(*) filter (where w1)
             / nullif(count(*) filter (where signup_at <= now() - interval '14 days'), 0), 1) as w1_pct,
       round(100.0 * count(*) filter (where w2)
             / nullif(count(*) filter (where signup_at <= now() - interval '21 days'), 0), 1) as w2_pct,
       round(100.0 * count(*) filter (where w3)
             / nullif(count(*) filter (where signup_at <= now() - interval '28 days'), 0), 1) as w3_pct,
       round(100.0 * count(*) filter (where w4)
             / nullif(count(*) filter (where signup_at <= now() - interval '35 days'), 0), 1) as w4_pct
from flags
where signup_week >= date_trunc('week', now())::date - interval '11 weeks'
group by 1, 2 order by 2 desc, 1;

\echo
\echo '=== 4) Module usage (cbt, meditation, gratitude, act; distinct users with >=1 record, pct of that account population) ==='
-- A content row is the only adoption signal the schema carries. This table
-- used to add "enabled" and "enabled-but-never-used" columns read from
-- `user_preferences.enabled_modules`, but that array gates nothing - every
-- module's tools sit on the tools grid regardless, the last write hook went in
-- the May 2026 dead-code sweep (059ae523), and what remains is the column
-- default `['cbt']` plus one write from the meditation wizard. So "cbt enabled
-- 45 of 46" was the default, not a choice, and gratitude read as used-but-never-
-- enabled (#1672). test/analytics-shared-sql.test.ts keeps the column out.
with totals as (
  select l.account, count(a.user_id)::numeric as all_users
  from account_labels l
  left join accounts a on a.account = l.account
  group by 1
),
used as (
  select a.account, c.module, count(distinct c.user_id) as used_users
  from content_events c
  join accounts a on a.user_id = c.user_id
  where c.module in ('cbt', 'meditation', 'gratitude', 'act')
  group by 1, 2
)
select t.account,
       mods.module,
       coalesce(u.used_users, 0) as users,
       round(100.0 * coalesce(u.used_users, 0) / nullif(t.all_users, 0), 1) as users_pct
from (values ('cbt'), ('meditation'), ('gratitude'), ('act')) as mods(module)
cross join totals t
left join used u on u.module = mods.module and u.account = t.account
order by t.account, mods.module;

\echo
\echo '=== 5) Core tool usage (per feature; distinct users with >=1 record, pct of that account population) ==='
select a.account,
       c.feature,
       count(distinct c.user_id) as users,
       round(100.0 * count(distinct c.user_id)
             / nullif((select count(*) from accounts x where x.account = a.account), 0), 1) as users_pct
from content_events c
join accounts a on a.user_id = c.user_id
where c.module = 'core'
group by 1, 2 order by 3 desc, 2, 1;

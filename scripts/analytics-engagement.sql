-- Engagement report: activation, retention, module adoption. Aggregate-only by
-- policy (docs/analytics.md): no per-user rows, no user ids, no emails.
--
-- Definitions (agreed 2026-07-14, see docs/analytics.md "Phase 1 in use"):
--   activation : first row in any user-content table; setup actions (enabling
--                modules, widget picks, onboarding flags) deliberately excluded.
--   retention  : signup-anchored windows, week N = days 7*N .. 7*(N+1) after the
--                user's own signup; retained = any content row in the window.
--                Percentages use mature users only (window fully elapsed).
--   adoption   : per enableable module (cbt, meditation, gratitude, act):
--                % enabled, % with >=1 record, % enabled-but-never-used.
--                Core tools (mood, journal, sleep, habits, mindfulness) are
--                always available, so only usage % is reported for them.
--
-- Content tables are decrypt-on-read views over *_data base tables; we select
-- only user_id/created_at (never encrypted), and closed-test row counts make
-- any decrypt overhead irrelevant.
--
-- The runner pipes this file through a single psql session, so the temp views
-- below live for the run and vanish afterwards.

create temp view content_events as
  -- core tools (always available, not part of enabled_modules)
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

create temp view first_content as
  select u.id, u.created_at as signup_at, min(c.created_at) as first_content_at
  from auth.users u
  left join content_events c on c.user_id = u.id
  group by 1, 2;

\echo
\echo '=== 1) Activation summary (72h metrics count only signups older than 72h) ==='
select count(*) as signups,
       count(first_content_at) as activated,
       round(100.0 * count(first_content_at) / nullif(count(*), 0), 1) as activated_pct,
       count(*) filter (where signup_at <= now() - interval '72 hours') as signups_72h_mature,
       count(*) filter (where first_content_at <= signup_at + interval '72 hours'
                          and signup_at <= now() - interval '72 hours') as activated_within_72h,
       round(100.0 * count(*) filter (where first_content_at <= signup_at + interval '72 hours'
                                        and signup_at <= now() - interval '72 hours')
             / nullif(count(*) filter (where signup_at <= now() - interval '72 hours'), 0), 1)
         as activated_72h_pct
from first_content;

\echo
\echo '=== 2) Activation by signup week, last 12 weeks ==='
select date_trunc('week', signup_at)::date as week,
       count(*) as signups,
       count(first_content_at) as activated,
       round(100.0 * count(first_content_at) / count(*), 1) as activated_pct,
       count(*) filter (where first_content_at <= signup_at + interval '72 hours')
         as activated_within_72h
from first_content
group by 1 order by 1 desc limit 12;

\echo
\echo '=== 3) Retention cohorts (week N = days 7N..7(N+1) after own signup; pct over mature users) ==='
with flags as (
  select date_trunc('week', u.created_at)::date as signup_week,
         u.created_at as signup_at,
         bool_or(c.created_at >= u.created_at + interval '7 days'
             and c.created_at <  u.created_at + interval '14 days') as w1,
         bool_or(c.created_at >= u.created_at + interval '14 days'
             and c.created_at <  u.created_at + interval '21 days') as w2,
         bool_or(c.created_at >= u.created_at + interval '21 days'
             and c.created_at <  u.created_at + interval '28 days') as w3,
         bool_or(c.created_at >= u.created_at + interval '28 days'
             and c.created_at <  u.created_at + interval '35 days') as w4
  from auth.users u
  left join content_events c on c.user_id = u.id
  group by u.id, 1, 2
)
select signup_week,
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
group by 1 order by 1 desc limit 12;

\echo
\echo '=== 4) Module adoption (enableable modules; pct of all users, distinct users only) ==='
with totals as (select count(*)::numeric as all_users from auth.users),
enabled as (
  select m.module, count(distinct p.user_id) as enabled_users
  from public.user_preferences p
  cross join lateral unnest(p.enabled_modules) as m(module)
  where m.module in ('cbt', 'meditation', 'gratitude', 'act')
  group by 1
),
used as (
  select module, count(distinct user_id) as used_users
  from content_events
  where module in ('cbt', 'meditation', 'gratitude', 'act')
  group by 1
),
enabled_used as (
  select m.module, count(distinct p.user_id) as enabled_used_users
  from public.user_preferences p
  cross join lateral unnest(p.enabled_modules) as m(module)
  where exists (select 1 from content_events c
                where c.user_id = p.user_id and c.module = m.module)
  group by 1
)
select mods.module,
       coalesce(e.enabled_users, 0) as enabled_users,
       round(100.0 * coalesce(e.enabled_users, 0) / nullif(t.all_users, 0), 1) as enabled_pct,
       coalesce(u.used_users, 0) as used_users,
       round(100.0 * coalesce(u.used_users, 0) / nullif(t.all_users, 0), 1) as used_pct,
       round(100.0 * (coalesce(e.enabled_users, 0) - coalesce(eu.enabled_used_users, 0))
             / nullif(coalesce(e.enabled_users, 0), 0), 1) as enabled_never_used_pct
from (values ('cbt'), ('meditation'), ('gratitude'), ('act')) as mods(module)
cross join totals t
left join enabled e on e.module = mods.module
left join used u on u.module = mods.module
left join enabled_used eu on eu.module = mods.module
order by mods.module;

\echo
\echo '=== 5) Core tool usage (always available; pct of all users) ==='
select feature,
       count(distinct user_id) as users,
       round(100.0 * count(distinct user_id)
             / nullif((select count(*) from auth.users), 0), 1) as users_pct
from content_events
where module = 'core'
group by 1 order by 2 desc, 1;

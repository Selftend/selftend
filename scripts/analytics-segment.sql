-- Segment report: W4 retention cohorted by the concern someone declared on
-- arrival. Aggregate-only by policy (docs/analytics.md): no per-user rows, no
-- user ids, no emails.
--
-- This is the Dunford Step-1 instrument (decided in #1605, built in #1613): how
-- Selftend learns who loves it, without ever profiling an individual. It
-- collects nothing new — every column it reads already exists.
--
-- HOW TO READ IT — the short version; the reasoning is on #1605 and the summary
-- is in docs/analytics.md:
--
--   * Read ORDERINGS, never percentages, until the gate opens. Section 2 is
--     ordered by W4 retention rate for exactly that reason.
--   * The gate is 30 W4-retained users (#1598's warrant-to-continue number,
--     deliberately reused rather than inventing a second constant). Section 1
--     prints how far off it is. ☠️ That puts the segment question on the
--     2027-08-31 clock, not the 2027-02-28 frame-review clock: the February
--     read is informational only, and the segment slot in docs/positioning.md
--     cannot be filled there.
--   * A FLAT READING IS A FINDING, not a failure. If every arm retains alike,
--     the concern axis is not the segment axis, and the next axes to look at
--     are module adoption (cbt/meditation/gratitude/act), platform, and locale
--     (EN/BG). Decided in advance so the standing interpretation cannot quietly
--     become "not enough data yet", permanently.
--
-- 📌 A measurement is not a judgement. This file is the instrument; the segment
-- decision stays a judgement someone makes while looking at it.
--
-- Cadence: quarterly by hand, mandatory at both dates above, no third clock.
-- Only the owner can run it (SUPABASE_DB_URL from the Supabase dashboard); there
-- is no CI job and no schedule.

-- The block below is byte-identical in analytics-onboarding.sql and
-- analytics-engagement.sql; test/analytics-shared-sql.test.ts fails if they drift.
-- >>> shared:accounts
create temp view accounts as
  select id as user_id,
         created_at,
         case when coalesce(is_anonymous, false) then 'guest' else 'registered' end as account
  from auth.users;

-- Both labels, so section 0 prints the guest population even while it is zero.
create temp view account_labels(account) as values ('registered'), ('guest');
-- <<< shared:accounts

-- The block below is byte-identical in analytics-engagement.sql;
-- test/analytics-shared-sql.test.ts fails if they drift. A new content table
-- must be added to both, or this report silently under-counts retention.
-- >>> shared:content_events
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
-- <<< shared:content_events

-- k=5 cell suppression. ☠️ This is a FALSE-PRECISION control first and a privacy
-- control second: a printed "67%" that means two users out of three is the
-- number that gets believed. A count of 1..4 prints `<5`; a percentage whose
-- numerator or denominator is suppressed prints `-`. Zero prints as 0 — an
-- empty arm is information, and it discloses nothing.
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

-- The arms. The first six are the onboarding concern keys
-- (src/features/onboarding/concerns.ts); the last four are the users who
-- declared no concern, plus the users who predate the column.
--
-- ☠️ `skipped` and `finished-with-none` are distinguishable ONLY via
-- `app_onboarding_completed_via`: `apply_widget_recommendations` coalesces a
-- null concern list to `array[]`, so `initial_concerns` itself cannot tell a
-- skip from a finish with nothing ticked.
--
-- `zero-concerns-no-mode` is the residue: an empty `initial_concerns` written by
-- a call that passed no completion mode (the empty-Home suggestion flow,
-- `useApplyWidgetSuggestions`). It exists so those users are never silently
-- counted as either of the two real zero arms.
--
-- `unknown` is `initial_concerns IS NULL` — a row predating #1612, or an account
-- with no `user_preferences` row at all. It shrinks over time; there is no
-- backfill, deliberately (#1605: filling it from today's `selected_concerns`
-- would import exactly the survivorship bias the column exists to remove).
-- ⚠️ Accounts grandfathered by 20260705_grandfather_widget_onboarding.sql have
-- `app_onboarding_completed = true` but `app_onboarding_completed_at = null`, so
-- #1612's write-once guard does not hold them back: if such a user re-runs the
-- wizard from Home, their `initial_concerns` gets filled from a LATER choice and
-- they leave `unknown` for a concern arm. Small and shrinking, but it means a
-- concern arm can hold a few rows that are re-run values rather than intake
-- values. Tracked separately; do not read a difference of a few users as signal.
create temp view arm_labels(arm, arm_order) as values
  ('anxious-thoughts', 1),
  ('low-mood', 2),
  ('stress-overwhelm', 3),
  ('sleep', 4),
  ('habits', 5),
  ('reflection', 6),
  ('skipped', 7),
  ('finished-with-none', 8),
  ('zero-concerns-no-mode', 9),
  ('unknown', 10);

-- One row per (user, arm). ☠️ ARMS OVERLAP — they are not a partition. Concerns
-- are multi-select, so a user with three picks appears in three arms and the
-- rows sum past 100%; section 3 prints that overlap so it stays visible.
-- Partitioning by concern-set (64 cells) is dead on arrival at this N, and
-- first-pick-only was rejected because wizard pick order is a UI artefact, not a
-- stated priority (#1605).
create temp view user_arms as
  select a.user_id, a.account, arms.arm
  from accounts a
  left join public.user_preferences p on p.user_id = a.user_id
  cross join lateral (
    select c.concern as arm
      from unnest(p.initial_concerns) as c(concern)
    union all
    select case
             when p.initial_concerns is null then 'unknown'
             when p.app_onboarding_completed_via = 'skip' then 'skipped'
             when p.app_onboarding_completed_via = 'finish' then 'finished-with-none'
             else 'zero-concerns-no-mode'
           end
     where p.initial_concerns is null or cardinality(p.initial_concerns) = 0
  ) as arms(arm);

-- W4 retention, using the canonical definition from analytics-engagement.sql §3
-- and no other: signup-anchored, week 4 = days 28..35 after the user's own
-- signup, retained = any content row in that window, and the rate is taken over
-- MATURE users only (those whose window has fully elapsed). There is exactly one
-- definition of retention in this repo; do not fork a second one here.
create temp view user_w4 as
  select a.user_id,
         a.account,
         (a.created_at <= now() - interval '35 days') as w4_mature,
         coalesce(bool_or(c.created_at >= a.created_at + interval '28 days'
                      and c.created_at <  a.created_at + interval '35 days'), false) as w4_retained
  from accounts a
  left join content_events c on c.user_id = a.user_id
  group by a.user_id, a.account, a.created_at;

\echo
\echo '=== 0) Population split (every table below carries this axis) ==='
select l.account,
       count(a.user_id) as users,
       round(100.0 * count(a.user_id) / nullif((select count(*) from accounts), 0), 1) as pct
from account_labels l
left join accounts a on a.account = l.account
group by 1 order by 2 desc, 1;

\echo
\echo '=== 1) Gate status — section 2 is not readable until 30 W4-retained users exist ==='
\echo '    (whole-population counts, deliberately not k-suppressed: the point is to see how far off the gate is)'
select l.account,
       count(w.user_id) as users,
       count(w.user_id) filter (where w.w4_mature) as w4_mature_users,
       count(w.user_id) filter (where w.w4_mature and w.w4_retained) as w4_retained_users
from account_labels l
left join user_w4 w on w.account = l.account
group by 1 order by 1;

select count(*) filter (where w4_mature and w4_retained) as w4_retained_total,
       30 as gate,
       count(*) filter (where w4_mature and w4_retained) >= 30 as gate_open
from user_w4;

\echo
\echo '=== 2) W4 retention by concern-at-intake arm (ARMS OVERLAP; rows sum past 100% by design) ==='
\echo '    Ordered by retention rate: READ THE ORDERING, not the percentages.'
\echo '    `<5` = k=5 suppressed count; `-` = percentage withheld because a contributing cell is suppressed.'
select l.account,
       al.arm,
       pg_temp.k_count(count(ua.user_id)) as users,
       pg_temp.k_count(count(ua.user_id) filter (where w.w4_mature)) as w4_mature,
       pg_temp.k_count(count(ua.user_id) filter (where w.w4_mature and w.w4_retained)) as w4_retained,
       pg_temp.k_pct(count(ua.user_id) filter (where w.w4_mature and w.w4_retained),
                     count(ua.user_id) filter (where w.w4_mature)) as w4_pct
from account_labels l
cross join arm_labels al
left join user_arms ua on ua.account = l.account and ua.arm = al.arm
left join user_w4 w on w.user_id = ua.user_id
group by l.account, al.arm, al.arm_order
order by l.account,
         (count(ua.user_id) filter (where w.w4_mature and w.w4_retained))::numeric
           / nullif(count(ua.user_id) filter (where w.w4_mature), 0) desc nulls last,
         al.arm_order;

\echo
\echo '=== 3) Overlap check — arm rows sum past the population, by design ==='
select l.account,
       count(distinct ua.user_id) as users,
       count(ua.user_id) as arm_rows,
       round(count(ua.user_id)::numeric / nullif(count(distinct ua.user_id), 0), 2) as arms_per_user
from account_labels l
left join user_arms ua on ua.account = l.account
group by 1 order by 1;

\echo
\echo '=== 4) Guard: concern keys outside the known arms (should always be empty) ==='
\echo '    `apply_widget_recommendations` does not validate concern keys, so a client'
\echo '    change could write one section 2 would silently drop. This is where it shows up.'
select ua.arm as unexpected_key, count(*) as user_rows
from user_arms ua
where not exists (select 1 from arm_labels al where al.arm = ua.arm)
group by 1 order by 2 desc, 1;

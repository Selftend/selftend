-- Onboarding funnel report. Aggregate-only by policy (docs/analytics.md):
-- no per-user rows, no user ids, no emails.
--
-- Column types verified against migrations:
--   selected_concerns : text[]  (20260514_cbt_phase1.sql)
--   initial_concerns  : text[]  (20260901000000_initial_concerns.sql)
--   shown_button_tours: text[]  (20260543_button_tours.sql)
-- All use unnest() / array_length() as written below (no jsonb variant needed).
--
-- ☠️ Every table below is split by account type (#1613). `useStartAsGuest`
-- (src/features/auth/use-start-as-guest.ts) calls `signInAnonymously`, minting
-- one `auth.users` row per tap of the landing CTA, and
-- `cleanup_dormant_guest_accounts` only purges after 12 months of dormancy. On
-- the day the Supabase anonymous-sign-in toggle is switched on, an unsplit
-- "signups" silently becomes "visitors who tapped a button", and every
-- percentage here collapses toward zero with nothing on screen to say why. The
-- split landed while the toggle was still off, so the report changes shape
-- visibly on that day instead of changing meaning silently.
--
-- The shape rule, applied in all three reports: a FIXED-shape table (a known row
-- set — the two account types, the four modules, the ten concern arms) prints
-- both populations always, zeros included, so the axis is visible before it is
-- load-bearing. An OPEN-shape table (weeks, widget ids, feature names) prints
-- only what exists. Section 0 carries the axis unconditionally either way.
--
-- ☠️ The split reads CURRENT account state, not state at signup. Signing up
-- from a guest session converts the same `auth.users` row in place
-- (`isConversion` in src/components/app/sign-up-form.tsx), so a converted guest
-- counts as `registered` for their whole history, retroactively. The `guest`
-- rows are therefore unconverted guests only, and conversion is invisible here
-- by construction.

-- The block below is byte-identical in analytics-engagement.sql and
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

\echo
\echo '=== 0) Population split (every table below carries this axis) ==='
select l.account,
       count(a.user_id) as users,
       round(100.0 * count(a.user_id) / nullif((select count(*) from accounts), 0), 1) as pct
from account_labels l
left join accounts a on a.account = l.account
group by 1 order by 2 desc, 1;

\echo
\echo '=== 1) Weekly signups, last 12 weeks ==='
select account, date_trunc('week', created_at)::date as week, count(*) as signups
from accounts
where created_at >= date_trunc('week', now()) - interval '11 weeks'
group by 1, 2 order by 2 desc, 1;

\echo
\echo '=== 2) Onboarding conversion by signup week (completed vs not) ==='
select a.account,
       date_trunc('week', a.created_at)::date as week,
       count(*) as signups,
       count(*) filter (where p.app_onboarding_completed) as completed,
       round(100.0 * count(*) filter (where p.app_onboarding_completed) / count(*), 1)
         as completion_pct
from accounts a
left join public.user_preferences p on p.user_id = a.user_id
where a.created_at >= date_trunc('week', now()) - interval '11 weeks'
group by 1, 2 order by 2 desc, 1;

\echo
\echo '=== 3) Finish vs skip split (null = completed before via tracking existed) ==='
select a.account,
       coalesce(p.app_onboarding_completed_via, 'legacy/unknown') as via,
       count(*) as users
from public.user_preferences p
join accounts a on a.user_id = p.user_id
where p.app_onboarding_completed
group by 1, 2 order by 3 desc, 1, 2;

\echo
\echo '=== 4a) Concern distribution — CURRENT concerns, not concerns at intake ==='
--
-- ☠️ This reads CURRENT concerns. `selected_concerns` is last-write-wins:
-- `apply_widget_recommendations` overwrites it, and Home re-runs the wizard
-- through the same RPC. Only a RETURNING user re-runs it, so reading this as
-- "what people arrived wanting" is biased in the flattering direction by
-- construction (#1612).
--
-- `user_preferences.initial_concerns` is the immutable intake record, written
-- once at a first onboarding completion. Anything cohorted by what someone
-- declared on arrival belongs in `scripts/analytics-segment.sql` (#1613), which
-- reads that column and reports a NULL there as an explicit `unknown` arm,
-- never as zero concerns.
select a.account, concern, count(*) as picks
from public.user_preferences p
join accounts a on a.user_id = p.user_id
cross join lateral unnest(p.selected_concerns) as concern
group by 1, 2 order by 3 desc, 1, 2;

\echo
\echo '=== 4b) Picks-per-user histogram (0-6) ==='
select a.account,
       coalesce(array_length(p.selected_concerns, 1), 0) as picks_count,
       count(*) as users
from public.user_preferences p
join accounts a on a.user_id = p.user_id
where p.app_onboarding_completed
group by 1, 2 order by 2, 1;

\echo
\echo '=== 5) Current Home widget selection (the wizard never adds hidden defaults) ==='
select a.account, w.widget_id, count(*) as users
from public.widget_preferences w
join accounts a on a.user_id = w.user_id
group by 1, 2 order by 3 desc, 2, 1;

\echo
\echo '=== 6) Home tour engagement: how many of the 3 current Home stops each user has seen ==='
select a.account,
       ( select count(*) from unnest(p.shown_button_tours) k
         where k in ('home:checkin','home:edit','home:navigation') )
         as home_stops_seen,
       count(*) as users
from public.user_preferences p
join accounts a on a.user_id = p.user_id
where p.app_onboarding_completed
group by 1, 2 order by 2, 1;

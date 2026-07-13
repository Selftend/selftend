-- Onboarding funnel report. Aggregate-only by policy (docs/analytics.md):
-- no per-user rows, no user ids, no emails.
--
-- Column types verified against migrations:
--   selected_concerns : text[]  (20260514_cbt_phase1.sql)
--   shown_button_tours: text[]  (20260543_button_tours.sql)
-- Both use unnest() / array_length() as written below (no jsonb variant needed).

-- 1) Weekly signups, last 12 weeks
select date_trunc('week', created_at)::date as week, count(*) as signups
from auth.users group by 1 order by 1 desc limit 12;

-- 2) Onboarding conversion by signup week (completed vs not)
select date_trunc('week', u.created_at)::date as week,
       count(*) as signups,
       count(*) filter (where p.app_onboarding_completed) as completed,
       round(100.0 * count(*) filter (where p.app_onboarding_completed) / count(*), 1)
         as completion_pct
from auth.users u
left join public.user_preferences p on p.user_id = u.id
group by 1 order by 1 desc limit 12;

-- 3) Finish vs skip split (null = completed before via tracking existed)
select coalesce(app_onboarding_completed_via, 'legacy/unknown') as via, count(*)
from public.user_preferences
where app_onboarding_completed
group by 1 order by 2 desc;

-- 4a) Concern distribution (each user may pick several)
select concern, count(*) as picks
from public.user_preferences p, unnest(p.selected_concerns) as concern
group by 1 order by 2 desc;

-- 4b) Picks-per-user histogram (0-6)
select coalesce(array_length(selected_concerns, 1), 0) as picks_count,
       count(*) as users
from public.user_preferences
where app_onboarding_completed
group by 1 order by 1;

-- 5) Current Home widget selection (the wizard never adds hidden defaults)
select widget_id, count(*) as users
from public.widget_preferences
group by 1 order by 2 desc, 1;

-- 6) Home tour engagement: how many of the 3 current Home stops each user has seen
select ( select count(*) from unnest(shown_button_tours) k
         where k in ('home:checkin','home:edit','home:navigation') )
         as home_stops_seen,
       count(*) as users
from public.user_preferences
where app_onboarding_completed
group by 1 order by 1;

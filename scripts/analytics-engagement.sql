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
         -- reads auth.users exactly once; test/analytics-shared-sql.test.ts
         -- allows exactly one such line per file, and this is it.
         email,
         case when coalesce(is_anonymous, false) then 'guest' else 'registered' end as account
  from auth.users;

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
-- ☠️ WHAT IS A SLICE, AND WHAT IS NOT (docs/analytics.md, "Small cells print as
-- `<5`"). The rule governs any cell that SLICES the population — a cell that
-- counts the people who did something (activated, completed, retained, used a
-- module, picked a widget) or who carry some property (a concern arm, a
-- completion mode) — and every percentage taken over such a cell.
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
  union all select user_id, created_at, 'act', 'committed_action' from public.act_committed_actions
  union all select user_id, created_at, 'act', 'bulls_eye' from public.act_bulls_eye_snapshots
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
select account,
       date_trunc('week', signup_at)::date as week,
       count(*) as signups,
       pg_temp.k_count(count(first_content_at)) as activated,
       pg_temp.k_pct(count(first_content_at), count(*)) as activated_pct,
       pg_temp.k_count(count(*) filter (where first_content_at <= signup_at + interval '72 hours'))
         as activated_within_72h
from first_content
where signup_at >= date_trunc('week', now()) - interval '11 weeks'
group by 1, 2 order by 2 desc, 1;

\echo
\echo '=== 3) Retention cohorts (week N = days 7N..7(N+1) after own signup; pct over mature users) ==='
\echo '    `-` = percentage withheld because a contributing cell rests on fewer than five users.'
\echo '    `cohort_size` is how many people arrived that week - a whole-population count - and prints raw.'
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
group by 1, 2 order by 2 desc, 1;

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
  where c.module in ('cbt', 'meditation', 'gratitude', 'act', 'dbt')
  group by 1, 2
)
select t.account,
       mods.module,
       pg_temp.k_count(coalesce(u.used_users, 0)) as users,
       pg_temp.k_pct(coalesce(u.used_users, 0), t.all_users) as users_pct
from (values ('cbt'), ('meditation'), ('gratitude'), ('act'), ('dbt')) as mods(module)
cross join totals t
left join used u on u.module = mods.module and u.account = t.account
order by t.account, mods.module;

\echo
\echo '=== 5) Core tool usage (per feature; distinct users with >=1 record, pct of that account population) ==='
\echo '    `<5` = k=5 suppressed count; `-` = percentage withheld because a contributing cell is suppressed.'
\echo '    Ordered by the true user count, as section 2 of the segment report is: READ THE ORDERING.'
select a.account,
       c.feature,
       pg_temp.k_count(count(distinct c.user_id)) as users,
       pg_temp.k_pct(count(distinct c.user_id),
                     (select count(*) from accounts x where x.account = a.account)) as users_pct
from content_events c
join accounts a on a.user_id = c.user_id
where c.module = 'core'
group by 1, 2 order by count(distinct c.user_id) desc, 2, 1;

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

-- Onboarding funnel report. Aggregate-only by policy (docs/analytics.md):
-- no per-user rows, no user ids, no emails.
--
-- Home tour engagement (the old §6) is GONE with the tour itself (#2109,
-- following #2106): the panel it pointed at holds neither a tool row nor a
-- module row, so the last stop was retired and the machinery with it. The
-- `shown_button_tours` COLUMN stays - `export_user_data()` bakes it in and ~18
-- migrations re-emit that function verbatim - but nothing writes it now, so a
-- section reporting it would report a frozen residue as though it were current.
--
-- Concern distribution (the old §4a/4b) is GONE with the `selected_concerns`
-- column (#1958, 20260909000000_onboarding_one_panel.sql): the one-panel
-- introduction asks no concern, so nothing writes it. Anything cohorted by
-- what someone declared on arrival lives in scripts/analytics-segment.sql,
-- which reads the immutable `initial_concerns` - a pre-redesign cohort the app
-- never writes again.
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
\set owner_email 'vasil.yoshev@gmail.com'

\echo
\echo '=== Population provenance (how much of this population belongs to the project itself; raw counts, exempt from k=5 - the SQL comment says why) ==='
\echo '    owner_exact          EXACT. Accounts on the owner address, plus-tags of it included. A stranger cannot hold it.'
\echo '    internal_upper_bound AN UPPER BOUND, never a point estimate: plus-tagged, or carrying a demo or test string.'
\echo '                         A real person may plus-tag their own mail, and demo and test are ordinary words.'
\echo '    guest_accounts       NOT IDENTIFIABLE AT ALL. A guest account has no email, by construction, so nothing'
\echo '                         separates a guest minted by a user test from a stranger who tapped the button.'
\echo '    AGENTS.md requires deleting throwaway test accounts, so a large bound is a record of cleanup left undone.'
select count(*) filter (where p.owner_address)                              as owner_exact,
       count(*) filter (where p.owner_address or p.plus_tagged or p.marked) as internal_upper_bound,
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
              or lower(a.email) like '%test%'))                       as marked
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
\echo '=== 1) Weekly signups, last 12 weeks ==='
select account, date_trunc('week', created_at)::date as week, count(*) as signups
from accounts
where created_at >= date_trunc('week', now()) - interval '11 weeks'
group by 1, 2 order by 2 desc, 1;

\echo
\echo '=== 2) Onboarding conversion by signup week (completed vs not) ==='
\echo '    `<5` = k=5 suppressed count; `-` = percentage withheld because a contributing cell is suppressed.'
\echo '    `signups` is the weekly arrival trend, a whole-population count, and prints raw.'
select a.account,
       date_trunc('week', a.created_at)::date as week,
       count(*) as signups,
       pg_temp.k_count(count(*) filter (where p.app_onboarding_completed)) as completed,
       pg_temp.k_pct(count(*) filter (where p.app_onboarding_completed), count(*))
         as completion_pct
from accounts a
left join public.user_preferences p on p.user_id = a.user_id
where a.created_at >= date_trunc('week', now()) - interval '11 weeks'
group by 1, 2 order by 2 desc, 1;

\echo
\echo '=== 3) Finish vs skip split (null = completed before via tracking existed) ==='
\echo '    `<5` = k=5 suppressed count. Which mode someone chose is a property they carry, so these cells are slices.'
\echo '    Ordered by the true user count, as section 2 of the segment report is: READ THE ORDERING.'
select a.account,
       coalesce(p.app_onboarding_completed_via, 'legacy/unknown') as via,
       pg_temp.k_count(count(*)) as users
from public.user_preferences p
join accounts a on a.user_id = p.user_id
where p.app_onboarding_completed
group by 1, 2 order by count(*) desc, 1, 2;

\echo
\echo '=== 5) Home widget selection still written by pre-Favourites native builds (#1958: the current app neither reads nor seeds this table) ==='
\echo '    `<5` = k=5 suppressed count. A widget pick is a property someone carries, so these cells are slices.'
\echo '    Ordered by the true user count, as section 2 of the segment report is: READ THE ORDERING.'
select a.account, w.widget_id, pg_temp.k_count(count(*)) as users
from public.widget_preferences w
join accounts a on a.user_id = w.user_id
group by 1, 2 order by count(*) desc, 2, 1;

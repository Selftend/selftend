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
-- rows are therefore unconverted guests only.
--
-- ⚠️ That makes the ACCOUNT AXIS blind to conversion - it is not, and never
-- was, unmeasurable. Section 4 measures it directly from the identity clock,
-- which records the instant the account stopped being a guest. So read a
-- guest-versus-registered gap in the tables above knowing the guest arm is a
-- residue and the registered arm is what absorbs its successes, and read
-- section 4 for the movement between them.

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

-- >>> shared:partition_caveat
-- Route 1 of docs/analytics.md, "What the floor does not guarantee": the caveat
-- printed beside every section whose arms partition a population.
-- Byte-identical in analytics-onboarding.sql and analytics-segment.sql;
-- test/analytics-shared-sql.test.ts fails if they drift. analytics-engagement.sql
-- deliberately does NOT carry it - no section there partitions a population, and
-- a partition warning printed beside a table that has no partitioned arms would
-- be one more false sentence in a file family whose comments have already
-- asserted the opposite of this one twice.
--
-- ☠️ A RAW TOTAL BESIDE A SUPPRESSED CELL IS NOT THE DEFECT - AN EXHAUSTIVELY
-- PRINTED PARTITION IS. Three conditions, and they hold together or not at all:
-- the arms partition a population EXHAUSTIVELY; EVERY arm prints; and that
-- population's total prints RAW somewhere in the same report. Every other
-- suppressed cell in these reports has a complement that is never printed, so
-- there is nothing to subtract it from.
--
-- ⚠️ The test is STRUCTURAL, so a future section classifies ITSELF against it:
-- there is no list of qualifying sections kept here, and no review gate to
-- remember. One variable, echoed once per qualifying section, so the sentence
-- cannot drift between the sections that print it.
\set partition_caveat '    WHAT `<5` DOES NOT HIDE HERE. These arms partition a population exhaustively, every arm prints,'
\set partition_caveat :partition_caveat '\n    and that population\'s total prints raw elsewhere in this report - so the arms that DID print, taken'
\set partition_caveat :partition_caveat '\n    from that total, bound the ones that did not. `<5` publishes the interval 1..4, so a hidden cell is at'
\set partition_caveat :partition_caveat '\n    most FOUR VALUES WIDE - however many cells are hidden - and EXACTLY ONE whenever the remainder left'
\set partition_caveat :partition_caveat '\n    over sits at either end of its range. Four is a maximum, not a guarantee: a small raw base printed'
\set partition_caveat :partition_caveat '\n    beside a suppressed cell caps it lower still. The guards against this were priced and refused - see'
\set partition_caveat :partition_caveat '\n    docs/analytics.md, What the floor does not guarantee.'
-- <<< shared:partition_caveat

-- The identity clock (#2366, #2376). One row per account, carrying the instant
-- its first sign-in identity was attached - which is what makes a conversion
-- visible at all. Read the ☠️ notes on section 4 before touching the threshold.
--
-- ⚠️ `auth.identities` is a different table from `auth.users`, which every
-- report reads exactly once through the shared `accounts` view; this join does
-- not disturb that.
--
-- ⚠️ `user_id` and `first_identity_at` are carried per row so the arms can be
-- computed and so a test can assert which arm one fixture lands in. Neither is
-- ever selected into a printed row - every section below counts them and prints
-- the count, because the reports are aggregate-only (docs/analytics.md).
--
-- ⚠️ NO PROVIDER FILTER, deliberately, and this is the line to revisit if the
-- arms ever look wrong: today GoTrue writes no identity row for an anonymous
-- sign-in, so "holds an identity" and "is registered" mean the same thing. If
-- that ever changes, every guest acquires an identity at mint, the guest arm
-- empties into `registered at mint`, and the contradiction arm stays at zero
-- while saying nothing is wrong.
create temp view conversion_arms as
  select a.user_id,
         a.account,
         a.created_at,
         fi.first_identity_at,
         (a.created_at <= now() - interval '7 days') as mature,
         -- Was this account minted WITHOUT an identity, with both definitions
         -- agreeing that it was? That is the cohort the rate is taken over, and
         -- it is a fact about the row rather than a string match on an arm's
         -- printed label.
         --
         -- ⚠️ Both halves are required. "No identity yet" alone would sweep in
         -- an account that claims to be registered while holding none - the
         -- contradiction shape - and put a row into the denominator on the
         -- strength of a disagreement nobody has looked at.
         ((fi.first_identity_at is null and a.account = 'guest')
            or (fi.first_identity_at is not null and a.account = 'registered'
                and fi.first_identity_at > a.created_at + interval '1 second'))
           as guest_origin,
         (fi.first_identity_at is not null
            and fi.first_identity_at > a.created_at + interval '1 second'
            and fi.first_identity_at <= a.created_at + interval '7 days') as converted_within_window,
         -- ☠️ THE CONTRADICTION ARM CATCHES BOTH DIRECTIONS, and the arms are
         -- written to fall through to it rather than into a plausible-looking
         -- neighbour. An account claiming to be registered while holding no
         -- identity is the obvious drift; a GUEST that holds one is the mirror
         -- of it, and an earlier shape of this case silently filed that one as
         -- `converted guest` - a disagreement absorbed into a normal arm is
         -- exactly what this arm exists to prevent.
         case
           when fi.first_identity_at is null and a.account = 'guest'
             then 'guest (unconverted)'
           when fi.first_identity_at is not null and a.account = 'registered'
                and fi.first_identity_at > a.created_at + interval '1 second'
             then 'converted guest'
           when fi.first_identity_at is not null and a.account = 'registered'
             then 'registered at mint'
           else 'is_anonymous disagrees with the identity record (CONTRADICTION)'
         end as arm
  from accounts a
  left join (
    select user_id, min(created_at) as first_identity_at
    from public.digest_auth_identities
    group by 1
  ) fi on fi.user_id = a.user_id;

-- Fixed shape: all four arms print, zeros included, so the contradiction arm is
-- visible as a zero rather than absent as a row.
create temp view conversion_arm_labels(arm, arm_order) as values
  ('guest (unconverted)', 1),
  ('converted guest', 2),
  ('registered at mint', 3),
  ('is_anonymous disagrees with the identity record (CONTRADICTION)', 4);


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
\echo '=== 1) Weekly signups, last 12 weeks ==='
\echo '    OPEN SHAPE: only what exists prints, so a single (no rows) row means the query ran'
\echo '    and matched nothing. A section printing NO rows at all is a bug, never a reading.'
with section_rows as (
  select account, date_trunc('week', created_at)::date as week, count(*) as signups
  from accounts
  where created_at >= date_trunc('week', now()) - interval '11 weeks'
  group by 1, 2
)
select account, week, signups
from (
  select account, week, signups, 0 as empty_marker from section_rows
  union all
  select '(no rows)', null, null, 1 where not exists (select 1 from section_rows)
) t
order by t.empty_marker, t.week desc, t.account;

\echo
\echo '=== 2) Introduction completion by signup week (completed vs not) ==='
\echo '    COMPLETION means finishing the one-panel introduction, and nothing else. The guest-to-registered'
\echo '    funnel is section 4, and CONTEXT.md reserves its own word for it: one word over two funnel steps'
\echo '    is how the two got confused, in the one report that measures both.'
\echo '    `<5` = k=5 suppressed count; `-` = percentage withheld because a contributing cell is suppressed.'
\echo '    `signups` is the weekly arrival trend, a whole-population count, and prints raw.'
\echo '    OPEN SHAPE: only what exists prints, so a single (no rows) row means the query ran'
\echo '    and matched nothing. A section printing NO rows at all is a bug, never a reading.'
with section_rows as (
  select a.account,
         date_trunc('week', a.created_at)::date as week,
         count(*) as signups,
         pg_temp.k_count(count(*) filter (where p.app_onboarding_completed)) as completed,
         pg_temp.k_pct(count(*) filter (where p.app_onboarding_completed), count(*))
           as completion_pct
  from accounts a
  left join public.user_preferences p on p.user_id = a.user_id
  where a.created_at >= date_trunc('week', now()) - interval '11 weeks'
  group by 1, 2
)
select account, week, signups, completed, completion_pct
from (
  select account, week, signups, completed, completion_pct, 0 as empty_marker from section_rows
  union all
  select '(no rows)', null, null, null, null, 1 where not exists (select 1 from section_rows)
) t
order by t.empty_marker, t.week desc, t.account;

\echo
\echo '=== 3) Finish vs skip split (null = completed before via tracking existed) ==='
\echo '    `<5` = k=5 suppressed count. Which mode someone chose is a property they carry, so these cells are slices.'
\echo '    Ordered by the true user count, as the segment report orders its arms: READ THE ORDERING.'
\echo '    OPEN SHAPE: only what exists prints, so a single (no rows) row means the query ran'
\echo '    and matched nothing. A section printing NO rows at all is a bug, never a reading.'
with section_rows as (
  select a.account,
         coalesce(p.app_onboarding_completed_via, 'legacy/unknown') as via,
         pg_temp.k_count(count(*)) as users,
         count(*) as sort_users
  from public.user_preferences p
  join accounts a on a.user_id = p.user_id
  where p.app_onboarding_completed
  group by 1, 2
)
select account, via, users
from (
  select account, via, users, sort_users, 0 as empty_marker from section_rows
  union all
  select '(no rows)', null, null, null, 1 where not exists (select 1 from section_rows)
) t
order by t.empty_marker, t.sort_users desc, t.account, t.via;

\echo
\echo '=== 4) Guest-to-registered conversion (the identity clock; 7-day maturity window) ==='
\echo '    `<5` = k=5 suppressed count; `-` = percentage withheld because a contributing cell is suppressed.'
\echo '    STANDING NOTE: a conversion count below five is withheld and prints `<5`. That is the floor doing its'
\echo '    job, not an absence - read it as AT MOST FOUR, and never as more than the base printed beside it: a'
\echo '    numerator cannot exceed its denominator, so a small raw base caps the withheld cell below four and'
\echo '    at a base of one defeats it outright. A true zero prints as 0, so `<5` never means none.'
\echo '    The four arms partition the whole population: every account is in exactly one.'
\echo '    ☠️ The last arm must always be EMPTY. An entry means `is_anonymous` and the identity record disagree'
\echo '    about who is a guest - EITHER WAY ROUND: registered while holding no identity, or a guest holding'
\echo '    one. That is a drift between two definitions of the same word, never a count of people to read as'
\echo '    behaviour. Everyone else is in exactly one of the three arms above it.'
\echo :partition_caveat
-- ☠️ THIS IS THE PROJECT'S OWN DEFINITION EXECUTED, NOT A PROXY (#2366).
-- CONTEXT.md defines conversion as attaching the first sign-in identity, and a
-- registered account as one holding at least one. `auth.identities` records
-- exactly that, with its own `created_at`: `auth.users.is_anonymous` is the bit,
-- the identity row is the bit PLUS the instant it flipped.
--
-- ☠️ THE THRESHOLD IS ONE SECOND, and it separates "same transaction" from "a
-- separate act" - not "fast" from "slow". Measured: a born-registered identity
-- lands within 0.080s of its user row, every time, across email, google and
-- apple. A conversion needs a form submit or an OAuth round trip after a human
-- decision, so it cannot land inside a second. Do NOT widen this to a minute: a
-- guest who arrives by the web CTA can convert within seconds of being minted,
-- and a wide threshold eats precisely those.
--
-- `min(created_at)` and not any identity, so that linking a second provider
-- years later - on either kind of account - is never read as a conversion.
--
-- ☠️ It reads the whole population retroactively, so there is no start date and
-- no unmeasured backlog: conversions before anonymous sign-in went live are
-- STRUCTURALLY ZERO, not missing. `account_origin` is not the key and is not
-- needed here - which door somebody arrived through is an arrivals question and
-- belongs to docs/measurement.md.
--
-- ⚠️ THIS RESTS ON `enable_confirmations = false` (#489). If confirmations are
-- ever switched on, RE-VERIFY whether the email identity is written at signup
-- or at confirmation before trusting a single number here: if it moves to
-- confirmation, every ordinary signup starts reading as a conversion.
--
-- ⚠️ Deliberately in this report and not the engagement one, and deliberately
-- not in the shared `accounts` view - that keeps the shared block byte-identical
-- across all three files and leaves the segment report untouched.
select l.arm,
       pg_temp.k_count(count(o.user_id)) as users
from conversion_arm_labels l
left join conversion_arms o on o.arm = l.arm
group by l.arm, l.arm_order
order by l.arm_order;

\echo
\echo '    The rate, over guest-origin accounts old enough to have had the whole 7 days:'
-- The denominator is every account that was minted WITHOUT an identity and has
-- since had a full seven days - a whole-population count, so it prints raw. The
-- numerator counts the people who did something, so it goes through the floor.
--
-- ⚠️ Converting on day nine is a real conversion and is NOT in this numerator:
-- the window asks how many convert within a week, which is the only version of
-- the question that can be answered at a fixed age. The arms above hold the
-- lifetime count.
--
-- ☠️ THIS RATE DRIFTS UPWARD OVER TIME, AND NOTHING IN IT WILL SAY SO.
-- `cleanup_dormant_guest_accounts` (20260826010000) deletes accounts `where
-- u.is_anonymous` after 12 months of dormancy - that is, it deletes UNCONVERTED
-- guests and never converted ones. So the denominator loses its non-converters
-- as they age out while the numerator keeps everything, and a rising rate may
-- be the cleanup rather than the product. Compare cohorts of similar age before
-- reading a trend here.
--
-- ⚠️ An account in the contradiction arm is in neither the numerator nor the
-- denominator: `guest_origin` asks about the identity record, and that arm is
-- precisely where the identity record and `is_anonymous` disagree. While the
-- arm is empty - which it must be - this changes nothing.
select count(*) filter (where mature) as guest_origin_mature,
       pg_temp.k_count(count(*) filter (where mature and converted_within_window))
         as converted_within_7d,
       pg_temp.k_pct(count(*) filter (where mature and converted_within_window),
                     count(*) filter (where mature)) as conversion_pct
from conversion_arms
where guest_origin;

\echo
\echo '=== 5) Favourites (kind and key; the live successor to the retired widget picks) ==='
\echo '    `<5` = k=5 suppressed count. Which tool somebody pinned is a property they carry, so these are slices.'
\echo '    Ordered by the true user count, as section 2 of the segment report is: READ THE ORDERING.'
-- ☠️ This slot used to report `widget_preferences`, and that section is GONE
-- rather than moved (#1958). The table fails the same test `enabled_modules`
-- failed: the current app neither reads nor seeds it. ⚠️ It is NOT frozen
-- residue, which would be the safer failure - pre-Favourites native builds still
-- write it, so a section over it would print LIVE data about a removed feature
-- as though it were current behaviour, which is worse than printing nothing.
--
-- Favourites is the live successor and was reported nowhere until now. Open
-- shape: kinds and keys come and go with the product, so only what exists
-- prints.
\echo '    OPEN SHAPE: only what exists prints, so a single (no rows) row means the query ran'
\echo '    and matched nothing. A section printing NO rows at all is a bug, never a reading.'
with section_rows as (
  select a.account,
         f.kind,
         f.key,
         pg_temp.k_count(count(distinct f.user_id)) as users,
         count(distinct f.user_id) as sort_users
  from public.favorites f
  join accounts a on a.user_id = f.user_id
  group by 1, 2, 3
)
select account, kind, key, users
from (
  select account, kind, key, users, sort_users, 0 as empty_marker from section_rows
  union all
  select '(no rows)', null, null, null, null, 1 where not exists (select 1 from section_rows)
) t
order by t.empty_marker, t.sort_users desc, t.kind, t.key, t.account;

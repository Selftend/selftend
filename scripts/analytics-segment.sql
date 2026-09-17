-- Segment report: W4 retention cohorted by LOCALE and by MODULE USAGE.
-- Aggregate-only by policy (docs/analytics.md): no per-user rows, no user ids,
-- no emails.
--
-- This is the Dunford Step-1 instrument (decided in #1605, built in #1613): how
-- Selftend learns who loves it, without ever profiling an individual. It
-- collects nothing new — every column it reads already exists.
--
-- ☠️ IT WAS COHORTED BY CONCERN-AT-INTAKE UNTIL #2365 MEASURED THAT THE
-- CONCERN COLUMN HAD NEVER HELD A VALUE FOR A SINGLE ACCOUNT, EVER. The
-- migration that added `initial_concerns` and the commit that removed the code
-- writing it are both contained in tag v0.18.0 — the column reached users in the
-- very build that stopped asking, so the arms were dead on arrival rather than
-- closed later. All NINE non-`unknown` arms died together: `skipped` and
-- `finished-with-none` needed the column non-null-but-empty, and with it null
-- everywhere the `unknown` branch shadowed them. ⚠️ `unknown` is the tenth and
-- it did not die - it is the arm that held every account, which is precisely
-- what made the table look populated while carrying no axis at all.
--
-- The COLUMN IS KEPT — dropping it changes nothing observable and would cost an
-- INTENTIONALLY_DROPPED entry in the export gate.
-- It is simply not an axis, and its schema comment was corrected in the same
-- change (20260916000000_initial_concerns_comment_correction.sql) so the next
-- reader measures the column rather than believing what the comment claims.
--
-- ☠️ WHAT THAT HID WAS WORSE THAN AN UNREADABLE REPORT, and section 2 exists
-- because of it. The gate counts W4-retained users across the WHOLE population,
-- never across axis-bearing users, so it could open on users who all sat in a
-- single arm and declare the cross-tab readable OVER AN EMPTY TABLE — a false
-- green. An unreachable gate is at least honestly silent. Both conditions are
-- now checked, and they are different conditions: the gate says there is enough
-- retention to read, section 2 says there is an axis to read it along. Neither
-- implies the other.
--
-- HOW TO READ IT — the short version; the reasoning is on #1605 and #2365, and
-- the summary is in docs/analytics.md:
--
--   * Read ORDERINGS, never percentages, until the gate opens. Sections 3 and 4
--     are ordered by W4 retention rate for exactly that reason.
--   * The gate is 30 W4-retained users (#1598's warrant-to-continue number,
--     deliberately reused rather than inventing a second constant). Section 1
--     prints how far off it is. ☠️ That puts the segment question on the
--     2027-08-31 clock, not the 2027-02-28 frame-review clock: the February
--     read is informational only, and the segment slot in docs/positioning.md
--     cannot be filled there.
--   * Section 2 is the precondition, and it is checked BEFORE an ordering is
--     printed rather than read as a caveat beside one.
--   * A FLAT READING IS A FINDING, and it now TERMINATES rather than
--     redirecting. If retention is alike across locale and across module usage,
--     the finding is that the data Selftend collects reveals no segment, and it
--     is reported as such on 2027-08-31. ☠️ NO FOURTH AXIS IS NAMED, and that
--     is deliberate: the old rule pointed at three fallbacks, platform is struck
--     (below) and the other two are the axes here, so a rule that redirected
--     would now point at nothing and become the bottomless "try another axis"
--     it was written to prevent.
--
-- ☠️ PLATFORM IS STRUCK AS AN AXIS, and the obvious reason is the wrong one. A
-- platform column DOES exist — `device_push_tokens.platform`, with
-- `web_push_subscriptions` marking the web side — so this is not a case of
-- missing data, and a note claiming otherwise has already been corrected once.
-- It is struck because a push row exists only for an account that opted into
-- notifications, a small and self-selected slice: cohorting by it would compare
-- notification-adopters to everyone else rather than platform to platform. Do
-- not restore it on the strength of having noticed the column.
--
-- 📌 A measurement is not a judgement. This file is the instrument; the
-- segment decision stays a judgement someone makes while looking at it.
--
-- ☠️ "Quarterly by hand, only the owner can run it, there is no CI job and no
-- schedule" is STRUCK, not replaced (docs/analytics.md). Its mechanism half
-- rested on a premise that is simply false: these reports run read-only against
-- production from an agent session, and SUPABASE_DB_URL with psql on PATH was
-- always A documented path rather than the only one. The two dates above are
-- obligations, not a cadence, and they stand on their own.

-- The block below is byte-identical in analytics-onboarding.sql and
-- analytics-engagement.sql; test/analytics-shared-sql.test.ts fails if they drift.
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

-- The block below is byte-identical in analytics-engagement.sql;
-- test/analytics-shared-sql.test.ts fails if they drift. A new content table
-- must be added to both, or this report silently under-counts retention - and
-- since #2377 it also under-counts module BREADTH, so a missing table can move
-- an account between arms of section 4 as well as out of the retained count.
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

-- THE TWO AXES. Both PARTITION the population - every account lands in exactly
-- one arm of each, and the arm lists below are total by construction, so no
-- account can be dropped by a join. That is the structural replacement for the
-- two sections #2377 retired with the concern arms: an overlap check (concerns
-- were multi-select, so arm rows summed past the population) and an
-- unknown-keys guard (`apply_widget_recommendations` did not validate what it
-- wrote). Neither has anything to police here, and
-- test/integration/analytics-reports.integration.test.ts asserts the partition
-- directly instead - a stronger claim than either section made.

-- ⚠️ `language` is NOT NULL DEFAULT 'en', so `en` is also what an account
-- reads as when nobody ever touched the setting. It is NOT the `enabled_modules`
-- mistake (#1672) - the app pushes the locale it is actually running in, from
-- device detection on a fresh install or an explicit pick, so `en` does mean the
-- app is in English for that person - but it IS the arm a default falls into,
-- and `bg` is the only arm carrying an unambiguous affirmative signal. Read the
-- axis as bg-versus-the-rest. docs/positioning.md names Bulgarian the strongest
-- segment candidate, which is the question this shape actually answers.
--
-- ⚠️ The column is CURRENT state, not state at signup: someone who switches
-- language rewrites it, and there is no history to recover the earlier value
-- from.
--
-- `other locale` and `no preferences row` are residues, and they exist so that
-- neither a language added to the check constraint nor an account with no
-- preferences row can be silently counted as English.
create temp view locale_labels(arm, arm_order) as values
  ('en', 1),
  ('bg', 2),
  ('other locale', 3),
  ('no preferences row', 4);

create temp view user_locale as
  select a.user_id,
         a.account,
         case
           when p.user_id is null then 'no preferences row'
           when p.language in ('en', 'bg') then p.language
           else 'other locale'
         end as arm
  from accounts a
  left join public.user_preferences p on p.user_id = a.user_id;

-- Module usage, the behavioural axis. It reads the `content_events` view this
-- report already builds, so it collects nothing new, and being behavioural it
-- does not have to answer docs/positioning.md's warning that an attribute is not
-- a segment.
--
-- ☠️ THE WINDOW IS LOAD-BEARING, AND IT IS NOT DECORATION. Retention IS a
-- content row in days 28..35, and module usage IS content rows - so an axis
-- measured over all time would be partly the same measurement as the outcome,
-- and `several modules` would out-retain `no content` almost mechanically. The
-- axis is therefore measured over each account's FIRST 28 DAYS, the window that
-- ends exactly where the W4 window begins: the axis is then strictly prior to
-- the outcome, and `no content` becomes a real arm rather than a tautological
-- zero (somebody silent for four weeks can still return in week four).
--
-- ⚠️ An account younger than 28 days therefore carries a PROVISIONAL arm,
-- measured over a window that has not elapsed. This is the same clock `w4_mature`
-- already runs on and it is handled the same way: the rate is taken over mature
-- users only.
--
-- Someone who used two or more modules cannot be attributed to one of them, and
-- picking their most-used would be a tie-break rule, which is an artefact rather
-- than a stated priority - the reason #1605 refused first-pick-only on the
-- concern axis. They get their own arm instead. `core` is not a module: it is
-- the tools grid every account has, so it is an arm of its own and never counts
-- toward breadth.
create temp view module_labels(arm, arm_order) as values
  ('cbt only', 1),
  ('meditation only', 2),
  ('gratitude only', 3),
  ('act only', 4),
  ('dbt only', 5),
  ('other module only', 6),
  ('several modules', 7),
  ('core tools only', 8),
  ('no content', 9);

create temp view user_modules as
  select a.user_id,
         a.account,
         case
           when u.modules_used > 1 then 'several modules'
           -- ⚠️ The named modules are NOT listed again here. `module_labels`
           -- above is the single place this file writes them down, and this
           -- asks that list whether it has an arm for the module rather than
           -- repeating its contents - a second copy is how the two would drift
           -- and start filing a real module under the residue below.
           when u.modules_used = 1
             and exists (select 1 from module_labels ml
                          where ml.arm = u.single_module || ' only')
             then u.single_module || ' only'
           when u.modules_used = 1 then 'other module only'
           when u.core_rows > 0 then 'core tools only'
           else 'no content'
         end as arm
  from accounts a
  cross join lateral (
    select count(distinct c.module) filter (where c.module <> 'core') as modules_used,
           min(c.module) filter (where c.module <> 'core') as single_module,
           count(*) filter (where c.module = 'core') as core_rows
    from content_events c
    where c.user_id = a.user_id
      and c.created_at >= a.created_at
      and c.created_at < a.created_at + interval '28 days'
  ) u;

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

-- THE PRECONDITION ON SECTIONS 3 AND 4, and the thing whose absence made the
-- concern axis a false green rather than an honest silence.
--
-- ☠️ AN AXIS CARRIES VALUES ONLY WHEN AT LEAST TWO OF ITS ARMS HOLD A MATURE
-- USER. One arm is not a cross-tab, it is the population with a label on it, and
-- an ordering over it is a ranking of one thing. Mature is the right population
-- to count over because the rate printed in sections 3 and 4 is taken over
-- mature users: an arm with none of them prints `-` and can order nothing.
--
-- This is what the concern axis failed. With `initial_concerns` null on every
-- row, every account landed in `unknown`, one arm held everybody, and the gate -
-- which counts retention across the whole population and knows nothing about
-- arms - could still open.
--
-- The arms are joined to their label list on purpose, so coverage counts only
-- arms a section can actually print.
create temp view axis_coverage(axis, arms_total, arms_with_mature_users, readable) as
  select 'locale'::text,
         (select count(*) from locale_labels),
         c.arms,
         c.arms >= 2
    from (select count(distinct ul.arm) as arms
            from user_locale ul
            join locale_labels ll on ll.arm = ul.arm
            join user_w4 w on w.user_id = ul.user_id
           where w.w4_mature) c
  union all
  select 'module usage'::text,
         (select count(*) from module_labels),
         c.arms,
         c.arms >= 2
    from (select count(distinct um.arm) as arms
            from user_modules um
            join module_labels ml on ml.arm = um.arm
            join user_w4 w on w.user_id = um.user_id
           where w.w4_mature) c;

-- >>> shared:series_caveat
-- Route 2 of docs/analytics.md, "What the floor does not guarantee". Printed
-- ONCE PER REPORT, ahead of the first table and under no heading of its own,
-- because this census has nothing to exempt: every suppressed cell in all three
-- reports can move between publications. Byte-identical in all three files;
-- test/analytics-shared-sql.test.ts fails if they drift.
--
-- ⚠️ It prints ABOVE the population block deliberately. A note that qualifies
-- every table has to arrive before them, and trailing the population block
-- would attach it to the one block EXEMPT from the k=5 rule - the section it
-- has the least to say about.
--
-- ⚠️ Plain `\echo` lines here, where shared:partition_caveat uses a psql
-- variable. That block is echoed at three call sites and would drift between
-- them; this one prints once per file, so a variable would buy nothing.
--
-- ☠️ KEPT SEPARATE FROM shared:partition_caveat DELIBERATELY. Merging the two
-- would print a partition warning on analytics-engagement.sql, which has no
-- partitioned arm table - one more false sentence in a file family whose
-- comments have already asserted the opposite twice.
--
-- ⚠️ The k=5 rule is written, reasoned and tested as a property of ONE RUN of
-- one report. Since the monthly digest it is not: the same tables accumulate as
-- a series on one standing issue, and each run computes its suppression from
-- its own month alone. Nothing is guarded, and what ships is the statement -
-- docs/analytics.md does not travel with the table, and the digest comment
-- carries only the legend.
--
-- ☠️ The refusal below names the MARKER reason first and the statelessness
-- second, and that order is the finding rather than a style choice: an
-- architectural objection can be engineered around, and the marker one cannot.
\echo
\echo '    REPORT-WIDE NOTE, TRUE OF EVERY TABLE BELOW - THE SERIES IS THE RELEASE, NOT EACH COMMENT. This'
\echo '    report is republished monthly onto one standing issue, and each run computes its suppression from'
\echo '    its own month alone. So a cell can print `<5` in one publication and a real count in a later one,'
\echo '    and what that pair discloses is the MOVEMENT between them - which is time-localised in a way a'
\echo '    level is not, and which the four-value bound does not speak to at all. A republished cell is safe'
\echo '    exactly when it CANNOT MOVE, and nothing suppressed in these reports is immutable.'
\echo '    NOTHING IS GUARDED. CROSS-RELEASE SUPPRESSION CONSISTENCY - holding a cell suppressed once it has'
\echo '    passed four, so that it never crosses the floor in public - is REFUSED, because it means'
\echo '    suppressing a LARGE cell, which can print neither `<5` (false) nor a distinct marker (which cracks'
\echo '    the suppression) - the same wall complementary suppression hits. That these reports are'
\echo '    deliberately stateless is the SECOND reason and not the first. See docs/analytics.md, What the'
\echo '    floor does not guarantee, route 2.'
-- <<< shared:series_caveat

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
\echo '=== 1) Gate status - 30 W4-retained users, the first of TWO conditions on sections 3 and 4 ==='
\echo '    (whole-population counts, deliberately not k-suppressed: the point is to see how far off the gate is)'
\echo '    This is ONE of the two conditions. Section 2 carries the other, and an open gate does'
\echo '    not imply a readable cross-tab: see the comment above the axis_coverage view.'
-- ☠️ The carve-out here is NAMED, not assumed - see the k=5 rule in the shared
-- block above, which lists "retained" among the things a slice counts. This
-- section is the one place a retained count prints raw, for two reasons that
-- have to hold together:
--
--   * It is the DISTANCE TO A THRESHOLD this repo has already committed to in
--     writing (30, #1598's number), which is the one quantity docs/analytics.md
--     allows to be printed beside a threshold. A gate you cannot see the
--     distance to is not a gate.
--   * Suppressing only the per-account split would not suppress anything. The
--     axis has exactly two arms and `w4_retained_total` below is their sum, so
--     one printed arm and the total recover the other arm exactly. Half-
--     suppressing a two-arm split is arithmetic theatre, not a control.
--
-- Sections 3 and 4, where retention is cut by ARM, are k-suppressed as the rule
-- says - there the arms are many and the total does not give them away.
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
\echo '=== 2) Axis coverage - the precondition on sections 3 and 4 ==='
\echo '    CHECKED BEFORE AN ORDERING IS PRINTED, NOT READ AS A CAVEAT BESIDE ONE. An axis carries'
\echo '    values only when at least TWO of its arms hold a mature user. Where readable is false,'
\echo '    the ordering in that section is withheld entirely: it prints one (ordering withheld) row'
\echo '    naming the reason, and nothing rankable. Readability is decided PER AXIS, so one of the'
\echo '    two sections below can print its ordering while the other is withheld.'
\echo '    This is the check whose absence made the retired concern axis a FALSE GREEN rather than'
\echo '    an honest silence: the gate in section 1 counts retention across the whole population,'
\echo '    so it can open while every one of those users sits in a single arm.'
\echo '    Counts ARMS, never people, so there is no cell here for the k=5 rule to suppress.'
\echo '    Coverage is computed over the WHOLE population, not per account type, while sections 3'
\echo '    and 4 print both. So an account half may hold ZERO OR ONE arm with mature users while the'
\echo '    axis is population-readable, and what prints for that half is not an ordering.'
\echo '    That scope is deliberate and decided: the segment question is about the population, and'
\echo '    forking this precondition per account type would give readable a second meaning, which is'
\echo '    how two conditions drift apart. The mismatch it leaves is closed by a LABEL, not by a'
\echo '    second gate - such a half still prints IN FULL, with one row naming the reason, computed'
\echo '    from the per-account form of the test above. See docs/analytics.md, Everything is split'
\echo '    by account type.'
select axis, arms_total, arms_with_mature_users, readable
from axis_coverage order by axis;

\echo
-- ☠️ WHAT THE k=5 FLOOR DOES AND DOES NOT GUARANTEE IN SECTIONS 3 AND 4, so
-- that a later reader neither mistakes it for a guarantee nor tears it out as
-- theatre. Both are wrong; the truth is in between, and the part a reader of
-- the OUTPUT needs is printed beside both sections by the shared
-- partition_caveat block above.
--
-- These arms PARTITION the population, and section 1 prints `users`,
-- `w4_mature_users` and `w4_retained_users` RAW per account type (its carve-out,
-- with its own reasons recorded beside it). So the arms that printed, taken
-- from that total, bound the arms that did not. The bound is the one the caveat
-- prints, said again here because this is where it was once said wrongly: `<5`
-- publishes the interval 1..4, so a hidden cell is AT MOST FOUR VALUES WIDE
-- however many arms are hidden, and EXACTLY ONE whenever the remainder sits at
-- either end of its range. ☠️ TWO FALSE SENTENCES STOOD HERE - that a
-- multi-arm suppression leaves only a SUM recoverable, and that the floor holds
-- wherever more than one arm is small. Do not restore either: what bounds the
-- cell is the interval, never the number of arms that happened to be hidden.
--
-- ⚠️ THE LOCALE AXIS IS THE BAD CASE, and it is the ordinary case rather than a
-- corner. `other locale` is unreachable while the CHECK constraint allows only
-- en and bg, and an empty arm prints `0` rather than `<5` by deliberate design
-- of the shared block above - so the axis typically has two populated arms and
-- two visible zeros, and a suppressed `bg` is recoverable exactly. That is the
-- same arithmetic the section 1 carve-out calls theatre.
--
-- It is recorded rather than fixed, and that is now a DECISION rather than a
-- tracking note: every guard anyone proposed was priced and refused, and the
-- prices are written out in docs/analytics.md, "What the floor does not
-- guarantee". The three that bear on this section: section 1 cannot be
-- suppressed without blinding the gate; an empty arm may not print `<5` without
-- forking the shared rule; and dropping the count columns would leave an
-- ordering with no weight beside it AND make an empty arm indistinguishable
-- from a suppressed one, since `k_pct(0, 0)` prints the same `-` a withheld
-- percentage does. ⚠️ NONE OF THIS IS SPECIFIC TO THIS FILE - section 4 of
-- analytics-onboarding.sql partitions the population the same way, which is why
-- the caveat above is a shared block rather than a sentence written here.
\echo '=== 3) W4 retention by locale (arms partition the population; every account appears exactly once) ==='
\echo '    Ordered by retention rate: READ THE ORDERING, not the percentages.'
\echo '    `<5` = k=5 suppressed count; `-` = percentage withheld because a contributing cell is suppressed.'
\echo '    A single (ordering withheld) row means section 2 found THIS axis carries no values; it does'
\echo '    NOT mean nobody is retained, and it says nothing about the other axis. NO rows at all is a'
\echo '    bug, never a reading.'
\echo '    A (not an ordering) row heads ONE account half when that half holds fewer than two arms with'
\echo '    mature users, so the rows BENEATH IT, for that half, rank nothing. The half still prints in'
\echo '    full - the row annotates it, it does not withhold it - and BOTH halves can carry one at once.'
\echo '    user_preferences.language is NOT NULL DEFAULT en, so the en arm holds both people using'
\echo '    Selftend in English and people who never touched the setting. bg is the arm carrying an'
\echo '    unambiguous affirmative signal - read the axis as bg-versus-the-rest.'
\echo :partition_caveat
with section_rows as (
  select l.account,
         ll.arm,
         pg_temp.k_count(count(ul.user_id)) as users,
         pg_temp.k_count(count(ul.user_id) filter (where w.w4_mature)) as w4_mature,
         pg_temp.k_count(count(ul.user_id) filter (where w.w4_mature and w.w4_retained)) as w4_retained,
         pg_temp.k_pct(count(ul.user_id) filter (where w.w4_mature and w.w4_retained),
                       count(ul.user_id) filter (where w.w4_mature)) as w4_pct,
         (count(ul.user_id) filter (where w.w4_mature and w.w4_retained))::numeric
           / nullif(count(ul.user_id) filter (where w.w4_mature), 0) as sort_rate,
         ll.arm_order as sort_arm
  from account_labels l
  cross join locale_labels ll
  left join user_locale ul on ul.account = l.account and ul.arm = ll.arm
  left join user_w4 w on w.user_id = ul.user_id
  where (select ac.readable from axis_coverage ac where ac.axis = 'locale')
  group by l.account, ll.arm, ll.arm_order
),
-- ☠️ SECTION 2'S OWN TEST, APPLIED PER ACCOUNT TYPE - one definition of NOT AN
-- ORDERING at a second scope, with gating authority at only one of them.
-- `readable` stays population-wide and remains the only thing deciding whether
-- an ordering PRINTS; this decides only whether a row naming the reason appears
-- beside a half that prints either way. The subquery below is the axis_coverage
-- subquery with `and ul.account = l.account` added and nothing else
-- changed, so the two cannot drift into two definitions of the same word.
half_coverage as (
  select l.account,
         (select count(distinct ul.arm)
            from user_locale ul
            join locale_labels lb on lb.arm = ul.arm
            join user_w4 w on w.user_id = ul.user_id
           where w.w4_mature and ul.account = l.account) as arms_with_mature_users
  from account_labels l
)
select account, arm, users, w4_mature, w4_retained, w4_pct
from (
  select account, arm, users, w4_mature, w4_retained, w4_pct, sort_rate, sort_arm,
         0 as empty_marker, 1 as row_kind
    from section_rows
  union all
  -- ⚠️ The half still prints IN FULL: this removes no count and no arm, so the
  -- exposed-section census is unchanged. BOTH halves can take it at once -
  -- `readable` is true when one arm holds a mature registered user and a
  -- DIFFERENT arm holds a mature guest, which is two arms population-wide and
  -- one in each half.
  select hc.account,
         '(not an ordering) fewer than two arms in this account type hold a mature user',
         null, null, null, null, null, null, 0, 0
    from half_coverage hc
   where hc.arms_with_mature_users < 2
     and exists (select 1 from section_rows)
  union all
  select '(ordering withheld)', 'section 2 found fewer than two arms holding a mature user',
         null, null, null, null, null, null, 1, 1
   where not exists (select 1 from section_rows)
) t
order by t.empty_marker, t.account, t.row_kind, t.sort_rate desc nulls last, t.sort_arm;

\echo
\echo '=== 4) W4 retention by module usage (arms partition the population; every account appears exactly once) ==='
\echo '    Ordered by retention rate: READ THE ORDERING, not the percentages.'
\echo '    `<5` = k=5 suppressed count; `-` = percentage withheld because a contributing cell is suppressed.'
\echo '    A single (ordering withheld) row means section 2 found THIS axis carries no values; it does'
\echo '    NOT mean nobody is retained, and it says nothing about the other axis. NO rows at all is a'
\echo '    bug, never a reading.'
\echo '    A (not an ordering) row heads ONE account half when that half holds fewer than two arms with'
\echo '    mature users, so the rows BENEATH IT, for that half, rank nothing. The half still prints in'
\echo '    full - the row annotates it, it does not withhold it - and BOTH halves can carry one at once.'
\echo '    The arm is measured over THE FIRST 28 DAYS AFTER SIGNUP, the window ending where the W4'
\echo '    window begins, so the axis is prior to the outcome instead of partly being it. An account'
\echo '    younger than 28 days carries a provisional arm and is excluded from the rate by maturity.'
\echo '    other module only should always be empty: it means content_events grew a module the arm'
\echo '    list above does not name.'
\echo :partition_caveat
with section_rows as (
  select l.account,
         ml.arm,
         pg_temp.k_count(count(um.user_id)) as users,
         pg_temp.k_count(count(um.user_id) filter (where w.w4_mature)) as w4_mature,
         pg_temp.k_count(count(um.user_id) filter (where w.w4_mature and w.w4_retained)) as w4_retained,
         pg_temp.k_pct(count(um.user_id) filter (where w.w4_mature and w.w4_retained),
                       count(um.user_id) filter (where w.w4_mature)) as w4_pct,
         (count(um.user_id) filter (where w.w4_mature and w.w4_retained))::numeric
           / nullif(count(um.user_id) filter (where w.w4_mature), 0) as sort_rate,
         ml.arm_order as sort_arm
  from account_labels l
  cross join module_labels ml
  left join user_modules um on um.account = l.account and um.arm = ml.arm
  left join user_w4 w on w.user_id = um.user_id
  where (select ac.readable from axis_coverage ac where ac.axis = 'module usage')
  group by l.account, ml.arm, ml.arm_order
),
-- ☠️ SECTION 2'S OWN TEST, APPLIED PER ACCOUNT TYPE - one definition of NOT AN
-- ORDERING at a second scope, with gating authority at only one of them.
-- `readable` stays population-wide and remains the only thing deciding whether
-- an ordering PRINTS; this decides only whether a row naming the reason appears
-- beside a half that prints either way. The subquery below is the axis_coverage
-- subquery with `and um.account = l.account` added and nothing else
-- changed, so the two cannot drift into two definitions of the same word.
half_coverage as (
  select l.account,
         (select count(distinct um.arm)
            from user_modules um
            join module_labels lb on lb.arm = um.arm
            join user_w4 w on w.user_id = um.user_id
           where w.w4_mature and um.account = l.account) as arms_with_mature_users
  from account_labels l
)
select account, arm, users, w4_mature, w4_retained, w4_pct
from (
  select account, arm, users, w4_mature, w4_retained, w4_pct, sort_rate, sort_arm,
         0 as empty_marker, 1 as row_kind
    from section_rows
  union all
  -- ⚠️ The half still prints IN FULL: this removes no count and no arm, so the
  -- exposed-section census is unchanged. BOTH halves can take it at once -
  -- `readable` is true when one arm holds a mature registered user and a
  -- DIFFERENT arm holds a mature guest, which is two arms population-wide and
  -- one in each half.
  select hc.account,
         '(not an ordering) fewer than two arms in this account type hold a mature user',
         null, null, null, null, null, null, 0, 0
    from half_coverage hc
   where hc.arms_with_mature_users < 2
     and exists (select 1 from section_rows)
  union all
  select '(ordering withheld)', 'section 2 found fewer than two arms holding a mature user',
         null, null, null, null, null, null, 1, 1
   where not exists (select 1 from section_rows)
) t
order by t.empty_marker, t.account, t.row_kind, t.sort_rate desc nulls last, t.sort_arm;

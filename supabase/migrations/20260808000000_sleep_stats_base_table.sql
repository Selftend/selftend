-- sleep_stats(): read the base table, not the decrypting view (#706).
--
-- `20260731100000_sleep_stats.sql` reasoned about this and got it wrong, in a way
-- that reads as obviously correct. Its header says:
--
--   "`duration_minutes`, `quality`, `logged_at` and `logged_offset_minutes` are
--    plaintext columns on `sleep_logs_data`; the encrypted `notes` column is
--    never selected here."
--
-- The projection is indeed clean. The planner ignores it. `app.decrypt_text` is
-- declared with no volatility marker (`20260586_app_crypto_helpers.sql:36`), so
-- PostgreSQL defaults it to VOLATILE, and two independent planner guards then
-- refuse to remove a volatile output expression from a subquery:
--
--   * `is_simple_subquery()` will not flatten a subquery whose output list
--     contains volatile expressions;
--   * `remove_unused_subquery_outputs()` explicitly declines to drop an unused
--     volatile output column - the comment in REL_17_STABLE reads "we daren't
--     remove it".
--
-- `public.sleep_logs` computes `app.decrypt_text(notes_enc) as notes` as an
-- output expression (`20260708_shared_tool_occurrence_time.sql:59-64`). So every
-- call to `sleep_stats` ran `pgp_sym_decrypt` once per night, on a column it
-- never reads, to return eight numbers. A user with 900 logged nights paid 900
-- decrypts per call, on a screen that calls it on every focus.
--
-- The fix is one identifier: read `public.sleep_logs_data`. Nothing else changes.
--
-- Ownership is unaffected. The function is still `security invoker`, and the RLS
-- policy the original header names - `sleep_logs_select_own`, `auth.uid() =
-- user_id` - lives on `sleep_logs_data` itself; the view only ever reached it by
-- being `security_invoker`. Reading the table addresses that policy directly
-- rather than through one more hop, so the confinement is if anything more
-- obvious. The `user_id = uid` filter stays as belt and braces on top of it.
--
-- Results are identical by construction: every column the query touches exists on
-- the base table with the same name, type and values, and the view adds no
-- filtering, ordering or computation to any of them. The parity test
-- (`test/integration/sleep-stats.integration.test.ts`) pins that.
--
-- The general rule this instance motivated is now written into ADR-0001: use a
-- decrypting view when the plaintext is actually needed, and the `*_data` base
-- table when it is not. `journal_word_total()` is the counter-example that must
-- keep the view - it counts words in `body`, which only exists decrypted.
create or replace function public.sleep_stats(p_time_zone text)
returns table (
  avg_duration_minutes_7 numeric,
  avg_quality_7 numeric,
  avg_duration_minutes_30 numeric,
  avg_quality_30 numeric,
  quality_counts_30 bigint[],
  longest_minutes integer,
  shortest_minutes integer,
  weekday_avg_minutes numeric[]
)
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_time_zone is null then
    raise exception 'Time zone is required' using errcode = 'invalid_parameter_value';
  end if;
  -- Reject an unknown zone here rather than letting it surface as a bare Postgres error
  -- from somewhere in the middle of the query below.
  begin
    perform now() at time zone p_time_zone;
  exception
    when invalid_parameter_value then
      raise exception 'Unknown time zone: %', p_time_zone using errcode = 'invalid_parameter_value';
  end;

  return query
  with night as (
    -- One row per logged night, carrying the civil day it belongs to. Mirrors
    -- `entryDayKey()` in src/lib/occurrence-time.ts, including its fallback.
    select
      sleep_log.duration_minutes,
      sleep_log.quality,
      case
        when sleep_log.logged_offset_minutes is null
          then (sleep_log.logged_at at time zone p_time_zone)::date
        else (
          (sleep_log.logged_at at time zone 'UTC')
            + make_interval(mins => sleep_log.logged_offset_minutes)
        )::date
      end as civil_day
      -- The base table, not `public.sleep_logs`: see the header. Every column
      -- here is plaintext, so the view would only add a per-row decrypt of
      -- `notes_enc` that nothing below consumes.
      from public.sleep_logs_data as sleep_log
     where sleep_log.user_id = uid
  ),
  bounds as (
    -- Mirrors `dayRangeEndKey()`: today unless a later day was captured. `greatest`
    -- ignores nulls, so a user with no logs still gets today and the windows come back
    -- empty rather than null-bounded.
    select greatest(max(night.civil_day), (now() at time zone p_time_zone)::date) as end_day
      from night
  ),
  -- `end_day - 6` / `end_day - 29` are the inclusive starts of the 7- and 30-day windows,
  -- matching `addDaysToKey(endKey, -(days - 1))` in summaries.ts.
  win7 as (
    select night.*
      from night, bounds
     where night.civil_day between bounds.end_day - 6 and bounds.end_day
  ),
  win30 as (
    select night.*
      from night, bounds
     where night.civil_day between bounds.end_day - 29 and bounds.end_day
  )
  select
    (select avg(win7.duration_minutes) from win7),
    (select avg(win7.quality) from win7),
    (select avg(win30.duration_minutes) from win30),
    (select avg(win30.quality) from win30),
    -- counts[1..5] for quality 1..5, dense: `generate_series` supplies the empty buckets
    -- so the array is always five long, and out-of-range qualities are dropped exactly as
    -- `qualityDistribution()` drops them.
    (select array_agg(bucket.n order by bucket.q)
       from (
         select q.q, count(win30.quality) as n
           from generate_series(1, 5) as q(q)
           left join win30 on win30.quality = q.q
          group by q.q
       ) as bucket),
    -- Longest and shortest are lifetime figures on the screen (the labels name no window),
    -- so they are taken over every night rather than a window.
    (select max(night.duration_minutes) from night),
    (select min(night.duration_minutes) from night),
    -- Seven averages, Monday first, null where that weekday has no nights - the shape
    -- `weekdayAverages()` returns. ISO day-of-week is 1=Mon..7=Sun, which is already the
    -- Monday-first ordering the chart draws, and it is taken from the captured civil day
    -- so travel cannot move a night into another column.
    (select array_agg(weekday.avg_minutes order by weekday.idx)
       from (
         select d.idx, avg(night.duration_minutes) as avg_minutes
           from generate_series(1, 7) as d(idx)
           left join night on extract(isodow from night.civil_day)::int = d.idx
          group by d.idx
       ) as weekday);
end;
$$;

revoke all on function public.sleep_stats(text) from public;
-- Older Supabase images granted execute to `anon` directly, where `revoke ... from public`
-- does not reach it (see 20260718_security_advisor_hardening.sql).
revoke execute on function public.sleep_stats(text) from anon;
grant execute on function public.sleep_stats(text) to authenticated;

notify pgrst, 'reload schema';

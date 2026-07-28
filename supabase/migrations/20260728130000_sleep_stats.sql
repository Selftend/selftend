-- Exact sleep summary stats for the sleep tracker (#256).
--
-- Every aggregate on the tracker - the 7- and 30-day duration and quality averages, the
-- quality mix, the weekday averages, the longest/shortest night - was computed on the
-- device from `useSleepLogs(userId, 50)`. That list is capped at 50 rows, so each of
-- those figures was really "over the newest 50 nights": the lifetime longest/shortest and
-- the weekday averages truncate the moment a user passes 50 logs, and the 7- and 30-day
-- windows truncate as soon as more than 50 logs fall inside the window (naps and
-- multi-segment nights get there quickly). The header count beside them is already exact
-- - `countSleepLogs()` in src/features/sleep/repository.ts is a PostgREST head count - so
-- the same hero could show an exact lifetime night count next to truncated summaries.
--
-- Same defect class as the journal word total (#293, `journal_word_total()`), the Home
-- journal-week stats (#323) and the meditation median (#337,
-- `meditation_median_minutes()`). This follows that established precedent rather than
-- setting a new rule; the general question of when a stat may be row-derived versus
-- server-aggregated is still open in #335.
--
-- Nothing new is persisted. The figures are derived per call from the same
-- `security_invoker` decrypting view the client already reads, so no derived column lands
-- on an encrypted content table and no write path is touched. `duration_minutes`,
-- `quality`, `logged_at` and `logged_offset_minutes` are plaintext columns on
-- `sleep_logs_data`; the encrypted `notes` column is never selected here.
--
-- Ownership. `security invoker` means the function runs as the calling role, so the
-- table's own RLS policy (`sleep_logs_select_own`, `auth.uid() = user_id` on
-- `sleep_logs_data`, reached through the `security_invoker` view) is enforced against
-- every row the aggregates touch - the database, not this function body, is what confines
-- them to one user. A `security definer` copy would run as the owner with that policy
-- switched off, leaving the hand-written filter below as the only thing standing between
-- two users' nights, in a function whose whole output is a handful of plausible-looking
-- numbers. The `user_id = uid` filter is belt and braces on top of RLS, and an
-- unauthenticated caller is rejected outright rather than silently aggregating zero rows.
--
-- Rounding deliberately stays in TypeScript. The averages come back as exact `numeric`
-- and `sleepStats()` applies the same `Math.round` / `roundTo1` the client-side
-- `summaries.ts` helpers did, so the two implementations cannot drift on a `.5` tie -
-- `round(numeric)` in Postgres rounds half away from zero but `round(double precision)`
-- breaks ties to even, and neither is guaranteed to agree with `Math.round`, which breaks
-- them upward. A 7.5-minute difference is invisible; a summary that disagrees with itself
-- across a refresh is not.
--
-- Time zone. Sleep is day-scoped: since #250 every log carries the UTC offset captured
-- when it was logged, and `entryDayKey()` buckets it by the civil day it was at the place
-- it was logged, so travel cannot move a night into another day. The windows here are
-- walked in civil days for the same reason (#401). Two things the server cannot know on
-- its own follow from that, and both are exactly what `p_time_zone` supplies:
--   * rows whose offset was never captured (every row predating 20260726, where a stored
--     `0` was indistinguishable from the default and was cleared to null) fall back to the
--     viewer's local day, precisely as `entryDayKey` does on the device;
--   * the window's end day is the later of the newest captured day and the viewer's today,
--     matching `dayRangeEndKey()`, so a night logged east of here still counts.
-- An IANA zone name rather than a fixed offset, because Postgres resolves it against the
-- tz database at each row's own instant - a fixed offset would misbucket rows logged on
-- the other side of a DST boundary, which is the bug #401 fixed. Nothing about the zone is
-- stored; it is an argument, used and discarded.
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
      from public.sleep_logs as sleep_log
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

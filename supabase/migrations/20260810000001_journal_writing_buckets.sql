-- Exact, bounded writing-chart totals for the journal range control (#770).
--
-- Daily bars stay useful for 7d/30d. Ninety days becomes thirteen consecutive
-- seven-day buckets, while All time becomes calendar months (or years after two
-- years) so the client never renders an unbounded number of views. Every shape
-- is exact: only the bucket size changes, never the covered range or total.
create or replace function public.journal_writing_buckets(
  p_time_zone text,
  p_days integer default 30
)
returns table (
  bucket_start_key text,
  bucket_end_key text,
  word_count bigint,
  bucket_unit text,
  range_start_key text,
  range_end_key text
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
  if p_days is not null and p_days not in (7, 30, 90) then
    raise exception 'Days must be 7, 30, 90, or null for all time'
      using errcode = 'invalid_parameter_value';
  end if;

  begin
    perform now() at time zone p_time_zone;
  exception
    when invalid_parameter_value then
      raise exception 'Unknown time zone: %', p_time_zone using errcode = 'invalid_parameter_value';
  end;

  return query
  with entry_days as (
    -- Mirrors entryDayKey(): captured offset owns the civil day; legacy rows
    -- without one fall back to the viewer's current zone.
    select
      entry.id,
      case
        when entry.occurred_offset_minutes is null
          then (entry.occurred_at at time zone p_time_zone)::date
        else (
          (entry.occurred_at at time zone 'UTC')
            + make_interval(mins => entry.occurred_offset_minutes)
        )::date
      end as civil_day
      from public.journal_entries_data as entry
     where entry.user_id = uid
  ),
  raw_bounds as (
    select
      greatest(max(entry_days.civil_day), (now() at time zone p_time_zone)::date) as end_day,
      min(entry_days.civil_day) as first_day
      from entry_days
  ),
  bounds as (
    select
      case
        when p_days is null then coalesce(raw_bounds.first_day, raw_bounds.end_day)
        else raw_bounds.end_day - (p_days - 1)
      end as start_day,
      raw_bounds.end_day,
      case
        when p_days is null and raw_bounds.end_day - coalesce(raw_bounds.first_day, raw_bounds.end_day) > 730
          then 'year'
        when p_days is null then 'month'
        when p_days = 90 then 'week'
        else 'day'
      end as unit
      from raw_bounds
  ),
  bucket_bounds as (
    select generated.day::date as bucket_start, generated.day::date as bucket_end
      from bounds
      cross join lateral generate_series(bounds.start_day, bounds.end_day, interval '1 day')
        as generated(day)
     where bounds.unit = 'day'

    union all

    select
      bounds.start_day + (generated.index * 7),
      least(bounds.start_day + (generated.index * 7) + 6, bounds.end_day)
      from bounds
      cross join lateral generate_series(0, ((bounds.end_day - bounds.start_day) / 7)::integer)
        as generated(index)
     where bounds.unit = 'week'

    union all

    select
      greatest(generated.month::date, bounds.start_day),
      least((generated.month + interval '1 month - 1 day')::date, bounds.end_day)
      from bounds
      cross join lateral generate_series(
        date_trunc('month', bounds.start_day)::date,
        date_trunc('month', bounds.end_day)::date,
        interval '1 month'
      ) as generated(month)
     where bounds.unit = 'month'

    union all

    select
      greatest(generated.year::date, bounds.start_day),
      least((generated.year + interval '1 year - 1 day')::date, bounds.end_day)
      from bounds
      cross join lateral generate_series(
        date_trunc('year', bounds.start_day)::date,
        date_trunc('year', bounds.end_day)::date,
        interval '1 year'
      ) as generated(year)
     where bounds.unit = 'year'
  ),
  window_entries as (
    -- Read the encrypted base table so bucketing decrypts nothing. Only bodies
    -- inside the selected range reach decrypt_text(), and no body is returned.
    select
      entry_days.civil_day,
      regexp_replace(app.decrypt_text(entry.body_enc), '^\s+|\s+$', '', 'g') as body
      from entry_days
      join bounds on true
      join public.journal_entries_data as entry on entry.id = entry_days.id
     where entry_days.civil_day between bounds.start_day and bounds.end_day
  )
  select
    to_char(bucket_bounds.bucket_start, 'YYYY-MM-DD'),
    to_char(bucket_bounds.bucket_end, 'YYYY-MM-DD'),
    coalesce(
      sum(
        case
          when window_entries.body is null or window_entries.body = '' then 0
          else coalesce(array_length(regexp_split_to_array(window_entries.body, '\s+'), 1), 0)
        end
      ),
      0
    )::bigint,
    bounds.unit,
    to_char(bounds.start_day, 'YYYY-MM-DD'),
    to_char(bounds.end_day, 'YYYY-MM-DD')
    from bucket_bounds
    join bounds on true
    left join window_entries
      on window_entries.civil_day between bucket_bounds.bucket_start and bucket_bounds.bucket_end
   group by bucket_bounds.bucket_start, bucket_bounds.bucket_end, bounds.unit, bounds.start_day, bounds.end_day
   order by bucket_bounds.bucket_start;
end;
$$;

revoke all on function public.journal_writing_buckets(text, integer) from public;
revoke execute on function public.journal_writing_buckets(text, integer) from anon;
grant execute on function public.journal_writing_buckets(text, integer) to authenticated;

notify pgrst, 'reload schema';

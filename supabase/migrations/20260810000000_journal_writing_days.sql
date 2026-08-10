-- Exact daily word totals for the journal overview's 14-day writing chart (#768).
--
-- The ordinary journal list is capped at 50 entries. Building the chart from that
-- cache would silently under-count a busy day once the window held more than 50
-- entries, repeating the lifetime-total defect fixed by journal_word_total(). This
-- RPC returns only fourteen day keys and totals; journal bodies never cross the wire.
create or replace function public.journal_writing_days(
  p_time_zone text,
  p_days integer default 14
)
returns table (
  day_key text,
  word_count bigint
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
  if p_days is null or p_days < 1 or p_days > 90 then
    raise exception 'Days must be between 1 and 90' using errcode = 'invalid_parameter_value';
  end if;

  begin
    perform now() at time zone p_time_zone;
  exception
    when invalid_parameter_value then
      raise exception 'Unknown time zone: %', p_time_zone using errcode = 'invalid_parameter_value';
  end;

  return query
  with entry_days as (
    -- Mirrors entryDayKey(): a captured offset owns the civil day; legacy rows
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
  bounds as (
    -- Mirrors dayRangeEndKey(): today unless the user already holds an entry
    -- captured on a later civil day after travelling.
    select greatest(max(entry_days.civil_day), (now() at time zone p_time_zone)::date) as end_day
      from entry_days
  ),
  days as (
    select generated.day::date as civil_day
      from bounds
      cross join lateral generate_series(
        bounds.end_day - (p_days - 1),
        bounds.end_day,
        interval '1 day'
      ) as generated(day)
  ),
  window_entries as (
    -- Read the encrypted base table so day bucketing itself decrypts nothing.
    -- Only bodies inside the requested window reach decrypt_text().
    select
      entry_days.civil_day,
      regexp_replace(app.decrypt_text(entry.body_enc), '^\s+|\s+$', '', 'g') as body
      from entry_days
      join bounds on true
      join public.journal_entries_data as entry on entry.id = entry_days.id
     where entry_days.civil_day between bounds.end_day - (p_days - 1) and bounds.end_day
  )
  select
    to_char(days.civil_day, 'YYYY-MM-DD') as day_key,
    coalesce(
      sum(
        case
          when window_entries.body is null or window_entries.body = '' then 0
          else coalesce(array_length(regexp_split_to_array(window_entries.body, '\s+'), 1), 0)
        end
      ),
      0
    )::bigint as word_count
    from days
    left join window_entries on window_entries.civil_day = days.civil_day
   group by days.civil_day
   order by days.civil_day;
end;
$$;

revoke all on function public.journal_writing_days(text, integer) from public;
revoke execute on function public.journal_writing_days(text, integer) from anon;
grant execute on function public.journal_writing_days(text, integer) to authenticated;

notify pgrst, 'reload schema';

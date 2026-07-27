-- Day-scoped surfaces are about to bucket entries by the civil day captured at
-- logging time (#250) instead of the viewer's current local day. That makes the
-- occurrence offset load-bearing for the first time, and exposes a flaw in how
-- it was introduced: `not null default 0` means every row predating
-- 20260708_shared_tool_occurrence_time claims UTC, and the triggers coalesce a
-- missing value to 0, so an older client that never sends the column also
-- claims UTC. A guess is indistinguishable from a fact.
--
-- Make the offset nullable, where null means "not captured — fall back to the
-- viewer's local day". Every existing 0 is cleared, not just the pre-migration
-- ones: at this instant no stored 0 can be told apart from the default, and the
-- fallback renders those rows exactly where they render today, so no entry
-- moves. A user genuinely at UTC loses nothing — their viewer-local day is UTC.
-- From here on a 0 is only ever written by a client that explicitly sent it, so
-- it means what it says.

alter table public.mood_logs_data
  alter column logged_offset_minutes drop not null,
  alter column logged_offset_minutes drop default;
alter table public.gratitude_entries_data
  alter column logged_offset_minutes drop not null,
  alter column logged_offset_minutes drop default;
alter table public.sleep_logs_data
  alter column logged_offset_minutes drop not null,
  alter column logged_offset_minutes drop default;
alter table public.journal_entries_data
  alter column occurred_offset_minutes drop not null,
  alter column occurred_offset_minutes drop default;

-- The existing `between -840 and 840` checks stay: a CHECK is satisfied by null,
-- so they keep constraining real values without blocking "unknown".
--
-- The `set_*_updated_at` BEFORE-UPDATE triggers are disabled across the backfill.
-- Without that, this housekeeping UPDATE stamps `updated_at` with the deployment
-- time on every row it touches, and `updated_at` is read as genuine user activity
-- - journal-list-screen.tsx surfaces max(updatedAt) as "Last journaled", so every
-- affected user would appear to have journaled the moment this shipped. Clearing a
-- defaulted offset is not an edit, so it must not look like one.
-- `mood_logs_data` carries no such trigger, so its backfill needs no guard.
alter table public.gratitude_entries_data disable trigger set_gratitude_entries_updated_at;
alter table public.sleep_logs_data disable trigger set_sleep_logs_updated_at;
alter table public.journal_entries_data disable trigger set_journal_entries_updated_at;

update public.mood_logs_data set logged_offset_minutes = null
 where logged_offset_minutes = 0;
update public.gratitude_entries_data set logged_offset_minutes = null
 where logged_offset_minutes = 0;
update public.sleep_logs_data set logged_offset_minutes = null
 where logged_offset_minutes = 0;
update public.journal_entries_data set occurred_offset_minutes = null
 where occurred_offset_minutes = 0;

alter table public.gratitude_entries_data enable trigger set_gratitude_entries_updated_at;
alter table public.sleep_logs_data enable trigger set_sleep_logs_updated_at;
alter table public.journal_entries_data enable trigger set_journal_entries_updated_at;

-- Null is now a legitimate offset meaning "not captured". The occurrence
-- timestamp itself is still required.
create or replace function public.validate_occurrence_time(
  p_occurred_at timestamptz,
  p_offset_minutes integer
) returns void
language plpgsql
stable
set search_path = pg_catalog, public
as $$
begin
  if p_occurred_at is null then
    raise exception 'Occurrence time is required' using errcode = 'check_violation';
  end if;
  -- Small clock-skew allowance; the client picker itself disallows future values.
  if p_occurred_at > timezone('utc', now()) + interval '5 minutes' then
    raise exception 'Occurrence time cannot be in the future' using errcode = 'check_violation';
  end if;
  if p_offset_minutes is not null and (p_offset_minutes < -840 or p_offset_minutes > 840) then
    raise exception 'Invalid occurrence offset' using errcode = 'check_violation';
  end if;
end;
$$;

-- Drop the coalesce-to-0 from each occurrence trigger. A client that omits the
-- column now records "unknown" instead of asserting UTC, which is both truthful
-- and self-healing: the row picks up the viewer's local day until an updated
-- client rewrites it with a real offset.
create or replace function public.zz_mood_logs_occurrence() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.validate_occurrence_time(new.logged_at, new.logged_offset_minutes);
  update public.mood_logs_data
     set logged_offset_minutes = new.logged_offset_minutes
   where id = new.id;
  return new;
end;
$$;

create or replace function public.zz_gratitude_entries_occurrence() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.validate_occurrence_time(new.logged_at, new.logged_offset_minutes);
  update public.gratitude_entries_data
     set logged_offset_minutes = new.logged_offset_minutes
   where id = new.id
   returning updated_at into new.updated_at;
  return new;
end;
$$;

create or replace function public.zz_sleep_logs_occurrence() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.validate_occurrence_time(new.logged_at, new.logged_offset_minutes);
  update public.sleep_logs_data
     set logged_offset_minutes = new.logged_offset_minutes
   where id = new.id
   returning updated_at into new.updated_at;
  return new;
end;
$$;

create or replace function public.zz_journal_entries_occurrence() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  -- occurred_at stays required; only the offset may be unknown.
  new.occurred_at := coalesce(new.occurred_at, new.created_at, timezone('utc', now()));
  perform public.validate_occurrence_time(new.occurred_at, new.occurred_offset_minutes);
  update public.journal_entries_data
     set occurred_at = new.occurred_at,
         occurred_offset_minutes = new.occurred_offset_minutes
   where id = new.id
   returning updated_at into new.updated_at;
  return new;
end;
$$;

notify pgrst, 'reload schema';

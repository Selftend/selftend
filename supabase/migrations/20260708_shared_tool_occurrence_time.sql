-- Separate user-chosen occurrence time from immutable audit timestamps for the
-- shared daily tools. Existing rows preserve their current visible time and use
-- UTC (offset 0) when the original device offset is unknowable.
alter table public.mood_logs_data
  add column if not exists logged_offset_minutes smallint not null default 0
    check (logged_offset_minutes between -840 and 840);
alter table public.gratitude_entries_data
  add column if not exists logged_offset_minutes smallint not null default 0
    check (logged_offset_minutes between -840 and 840);
alter table public.sleep_logs_data
  add column if not exists logged_offset_minutes smallint not null default 0
    check (logged_offset_minutes between -840 and 840);
alter table public.journal_entries_data
  add column if not exists occurred_at timestamptz,
  add column if not exists occurred_offset_minutes smallint not null default 0
    check (occurred_offset_minutes between -840 and 840);

update public.journal_entries_data
   set occurred_at = created_at
 where occurred_at is null;
alter table public.journal_entries_data alter column occurred_at set not null;
-- The existing encrypted-view INSERT trigger writes the base row before the
-- supplemental occurrence trigger runs. Keep older clients (which do not send
-- occurred_at) compatible and let the supplemental trigger replace this value
-- when an updated client supplies an explicit occurrence time.
alter table public.journal_entries_data
  alter column occurred_at set default timezone('utc', now());

create or replace view public.mood_logs with (security_invoker = true) as
  select id, user_id, mood_score, emotions,
         app.decrypt_text(notes_enc) as notes,
         linked_strategy, logged_at, created_at,
         app.decrypt_text(situation_enc) as situation,
         app.decrypt_text(thoughts_enc) as thoughts,
         app.decrypt_text(behaviours_enc) as behaviours,
         app.decrypt_text(bodily_sensations_enc) as bodily_sensations,
         logged_offset_minutes
    from public.mood_logs_data;

create or replace view public.gratitude_entries with (security_invoker = true) as
  select id, user_id,
         app.decrypt_text(item_1_enc) as item_1,
         app.decrypt_text(item_2_enc) as item_2,
         app.decrypt_text(item_3_enc) as item_3,
         app.decrypt_text(item_4_enc) as item_4,
         app.decrypt_text(item_5_enc) as item_5,
         app.decrypt_text(events_enc)::text[] as events,
         app.decrypt_text(good_moment_enc) as good_moment,
         app.decrypt_text(miss_if_gone_enc) as miss_if_gone,
         app.decrypt_text(hidden_good_enc) as hidden_good,
         app.decrypt_text(life_item_1_enc) as life_item_1,
         app.decrypt_text(life_item_2_enc) as life_item_2,
         app.decrypt_text(life_item_3_enc) as life_item_3,
         app.decrypt_text(note_enc) as note,
         logged_at, level, starred, created_at, updated_at,
         logged_offset_minutes
    from public.gratitude_entries_data;

create or replace view public.sleep_logs with (security_invoker = true) as
  select id, user_id, duration_minutes, quality,
         app.decrypt_text(notes_enc) as notes,
         logged_at, created_at, updated_at,
         logged_offset_minutes
    from public.sleep_logs_data;

create or replace view public.journal_entries with (security_invoker = true) as
  select id, user_id,
         app.decrypt_text(title_enc) as title,
         app.decrypt_text(body_enc) as body,
         created_at, updated_at,
         occurred_at, occurred_offset_minutes
    from public.journal_entries_data;

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
  if p_offset_minutes is null or p_offset_minutes < -840 or p_offset_minutes > 840 then
    raise exception 'Invalid occurrence offset' using errcode = 'check_violation';
  end if;
end;
$$;

-- These run after the existing encrypted-view writers (trigger names sort after
-- `*_ins` / `*_upd`) and attach only the non-sensitive occurrence metadata.
create or replace function public.zz_mood_logs_occurrence() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  -- Older app versions do not send this newly introduced view column.
  new.logged_offset_minutes := coalesce(new.logged_offset_minutes, 0);
  perform public.validate_occurrence_time(new.logged_at, new.logged_offset_minutes);
  update public.mood_logs_data
     set logged_offset_minutes = new.logged_offset_minutes
   where id = new.id;
  return new;
end;
$$;
drop trigger if exists zz_mood_logs_occurrence_ins on public.mood_logs;
create trigger zz_mood_logs_occurrence_ins instead of insert on public.mood_logs
  for each row execute function public.zz_mood_logs_occurrence();
drop trigger if exists zz_mood_logs_occurrence_upd on public.mood_logs;
create trigger zz_mood_logs_occurrence_upd instead of update on public.mood_logs
  for each row execute function public.zz_mood_logs_occurrence();

create or replace function public.zz_gratitude_entries_occurrence() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  new.logged_offset_minutes := coalesce(new.logged_offset_minutes, 0);
  perform public.validate_occurrence_time(new.logged_at, new.logged_offset_minutes);
  update public.gratitude_entries_data
     set logged_offset_minutes = new.logged_offset_minutes
   where id = new.id
   returning updated_at into new.updated_at;
  return new;
end;
$$;
drop trigger if exists zz_gratitude_entries_occurrence_ins on public.gratitude_entries;
create trigger zz_gratitude_entries_occurrence_ins instead of insert on public.gratitude_entries
  for each row execute function public.zz_gratitude_entries_occurrence();
drop trigger if exists zz_gratitude_entries_occurrence_upd on public.gratitude_entries;
create trigger zz_gratitude_entries_occurrence_upd instead of update on public.gratitude_entries
  for each row execute function public.zz_gratitude_entries_occurrence();

create or replace function public.zz_sleep_logs_occurrence() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  new.logged_offset_minutes := coalesce(new.logged_offset_minutes, 0);
  perform public.validate_occurrence_time(new.logged_at, new.logged_offset_minutes);
  update public.sleep_logs_data
     set logged_offset_minutes = new.logged_offset_minutes
   where id = new.id
   returning updated_at into new.updated_at;
  return new;
end;
$$;
drop trigger if exists zz_sleep_logs_occurrence_ins on public.sleep_logs;
create trigger zz_sleep_logs_occurrence_ins instead of insert on public.sleep_logs
  for each row execute function public.zz_sleep_logs_occurrence();
drop trigger if exists zz_sleep_logs_occurrence_upd on public.sleep_logs;
create trigger zz_sleep_logs_occurrence_upd instead of update on public.sleep_logs
  for each row execute function public.zz_sleep_logs_occurrence();

create or replace function public.zz_journal_entries_occurrence() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  new.occurred_at := coalesce(new.occurred_at, new.created_at, timezone('utc', now()));
  new.occurred_offset_minutes := coalesce(new.occurred_offset_minutes, 0);
  perform public.validate_occurrence_time(new.occurred_at, new.occurred_offset_minutes);
  update public.journal_entries_data
     set occurred_at = new.occurred_at,
         occurred_offset_minutes = new.occurred_offset_minutes
   where id = new.id
   returning updated_at into new.updated_at;
  return new;
end;
$$;
drop trigger if exists zz_journal_entries_occurrence_ins on public.journal_entries;
create trigger zz_journal_entries_occurrence_ins instead of insert on public.journal_entries
  for each row execute function public.zz_journal_entries_occurrence();
drop trigger if exists zz_journal_entries_occurrence_upd on public.journal_entries;
create trigger zz_journal_entries_occurrence_upd instead of update on public.journal_entries
  for each row execute function public.zz_journal_entries_occurrence();

notify pgrst, 'reload schema';

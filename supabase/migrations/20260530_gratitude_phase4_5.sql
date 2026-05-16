-- Gratitude Phases 4 and 5: Level 3 five-item entries and favorite moments.
alter table public.gratitude_entries
  add column if not exists item_4 text not null default '',
  add column if not exists item_5 text not null default '',
  add column if not exists starred boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gratitude_entries_item_4_not_blank_if_set'
  ) then
    alter table public.gratitude_entries
      add constraint gratitude_entries_item_4_not_blank_if_set
      check (item_4 = '' or length(btrim(item_4)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gratitude_entries_item_5_not_blank_if_set'
  ) then
    alter table public.gratitude_entries
      add constraint gratitude_entries_item_5_not_blank_if_set
      check (item_5 = '' or length(btrim(item_5)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gratitude_entries_item_4_length'
  ) then
    alter table public.gratitude_entries
      add constraint gratitude_entries_item_4_length
      check (length(item_4) <= 240);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gratitude_entries_item_5_length'
  ) then
    alter table public.gratitude_entries
      add constraint gratitude_entries_item_5_length
      check (length(item_5) <= 240);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gratitude_entries_events_count'
  ) then
    alter table public.gratitude_entries
      add constraint gratitude_entries_events_count
      check (cardinality(events) <= 3);
  end if;
end;
$$;

create index if not exists gratitude_entries_user_starred_logged_idx
  on public.gratitude_entries (user_id, starred, logged_at desc)
  where starred = true;

alter function public.export_user_data() rename to export_user_data_before_gratitude_phase4_5;
revoke execute on function public.export_user_data_before_gratitude_phase4_5() from public;
revoke execute on function public.export_user_data_before_gratitude_phase4_5() from authenticated;

create or replace function public.export_user_data()
returns json
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  result := public.export_user_data_before_gratitude_phase4_5()::jsonb;
  result := result || jsonb_build_object(
    'gratitudeEntries', (
      select coalesce(jsonb_agg(to_jsonb(ge)), '[]'::jsonb)
      from (
        select
          id,
          level,
          events,
          good_moment,
          miss_if_gone,
          hidden_good,
          item_1,
          item_2,
          item_3,
          item_4,
          item_5,
          life_item_1,
          life_item_2,
          life_item_3,
          note,
          starred,
          logged_at,
          created_at,
          updated_at
        from public.gratitude_entries
        where user_id = uid
        order by logged_at asc
      ) ge
    )
  );

  return result::json;
end;
$$;

grant execute on function public.export_user_data() to authenticated;

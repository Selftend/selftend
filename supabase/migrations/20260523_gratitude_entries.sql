-- Lightweight gratitude log: private one-to-three item entries, separate from
-- journaling and CBT self-care logs. No reminders, no streaks, no required
-- daily cadence. See docs/modules/gratitude-log.md.

create table if not exists public.gratitude_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_1 text not null,
  item_2 text not null default '',
  item_3 text not null default '',
  note text not null default '',
  logged_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint gratitude_entries_item_1_not_blank check (length(btrim(item_1)) > 0),
  constraint gratitude_entries_item_2_not_blank_if_set check (
    item_2 = '' or length(btrim(item_2)) > 0
  ),
  constraint gratitude_entries_item_3_not_blank_if_set check (
    item_3 = '' or length(btrim(item_3)) > 0
  ),
  constraint gratitude_entries_item_1_length check (length(item_1) <= 240),
  constraint gratitude_entries_item_2_length check (length(item_2) <= 240),
  constraint gratitude_entries_item_3_length check (length(item_3) <= 240),
  constraint gratitude_entries_note_length check (length(note) <= 2000)
);

create index if not exists gratitude_entries_user_logged_idx
  on public.gratitude_entries (user_id, logged_at desc);

drop trigger if exists set_gratitude_entries_updated_at on public.gratitude_entries;
create trigger set_gratitude_entries_updated_at
before update on public.gratitude_entries
for each row execute function public.set_current_timestamp_updated_at();

alter table public.gratitude_entries enable row level security;

drop policy if exists "gratitude_entries_select_own" on public.gratitude_entries;
create policy "gratitude_entries_select_own" on public.gratitude_entries
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "gratitude_entries_insert_own" on public.gratitude_entries;
create policy "gratitude_entries_insert_own" on public.gratitude_entries
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "gratitude_entries_update_own" on public.gratitude_entries;
create policy "gratitude_entries_update_own" on public.gratitude_entries
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "gratitude_entries_delete_own" on public.gratitude_entries;
create policy "gratitude_entries_delete_own" on public.gratitude_entries
  for delete to authenticated using (auth.uid() = user_id);

-- Extend account data export without rewriting the existing full export query.
alter function public.export_user_data() rename to export_user_data_before_gratitude_entries;
revoke execute on function public.export_user_data_before_gratitude_entries() from public;
revoke execute on function public.export_user_data_before_gratitude_entries() from authenticated;

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

  result := public.export_user_data_before_gratitude_entries()::jsonb;
  result := result || jsonb_build_object(
    'gratitudeEntries', (
      select coalesce(jsonb_agg(to_jsonb(ge)), '[]'::jsonb)
      from (
        select
          id,
          item_1,
          item_2,
          item_3,
          note,
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

-- Migration: Add profile avatar metadata and private profile-picture storage.

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists avatar_storage_path text,
  add column if not exists avatar_source text,
  add column if not exists avatar_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_avatar_source_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_avatar_source_check
      check (avatar_source is null or avatar_source in ('oauth', 'upload'));
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-pics',
  'profile-pics',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile_pics_select_own" on storage.objects;
create policy "profile_pics_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-pics'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile_pics_insert_own" on storage.objects;
create policy "profile_pics_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-pics'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile_pics_update_own" on storage.objects;
create policy "profile_pics_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-pics'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-pics'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile_pics_delete_own" on storage.objects;
create policy "profile_pics_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-pics'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.export_user_data()
returns json
language plpgsql
security definer
as $$
declare
  result json;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select json_build_object(
    'exportDate', timezone('utc', now()),
    'profile', (
      select row_to_json(p)
      from (
        select
          email,
          avatar_url,
          avatar_storage_path,
          avatar_source,
          avatar_updated_at,
          created_at,
          updated_at
        from public.profiles
        where user_id = uid
      ) p
    ),
    'preferences', (
      select row_to_json(pr)
      from (
        select
          enabled_modules,
          reminder_consent,
          cbt_reminders_enabled,
          cbt_reminder_hour,
          cbt_reminder_minute,
          privacy_policy_accepted_at,
          terms_accepted_at,
          policy_version_accepted,
          cookie_consent,
          created_at,
          updated_at
        from public.user_preferences
        where user_id = uid
      ) pr
    ),
    'thoughtRecords', (
      select coalesce(json_agg(row_to_json(tr)), '[]'::json)
      from (
        select
          id,
          situation,
          automatic_thought,
          emotions,
          distortions,
          balanced_thought,
          archived_at,
          created_at,
          updated_at
        from public.thought_records
        where user_id = uid
        order by created_at asc
      ) tr
    )
  ) into result;

  return result;
end;
$$;

notify pgrst, 'reload schema';

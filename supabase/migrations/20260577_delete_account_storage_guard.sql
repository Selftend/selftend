-- Fix delete_user_account() against newer Supabase storage images.
--
-- Recent storage images install a BEFORE DELETE trigger (storage.protect_delete) on
-- storage.objects that raises 42501 ("Direct deletion from storage tables is not allowed.
-- Use the Storage API instead.") unless the session-local GUC storage.allow_delete_query
-- is set to 'true'. Migration 20260569 deletes the user's avatar objects directly from
-- storage.objects, so on the latest storage image the whole RPC now aborts and account
-- deletion fails (and the integration test for it fails in CI).
--
-- Opt into the documented escape hatch for the function's transaction only. set_config(...,
-- true) is transaction-local, so it never affects other sessions or statements.

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Permit direct deletes from storage.objects for this transaction only (see header).
  perform set_config('storage.allow_delete_query', 'true', true);

  -- Authoritative storage cleanup: every object under the user's own {uid}/ folder in the
  -- private profile-pics bucket (covers current + any historical/orphaned avatar files).
  delete from storage.objects
  where bucket_id = 'profile-pics'
    and (storage.foldername(name))[1] = uid::text;

  delete from public.emotion_preferences where user_id = uid;
  delete from public.web_push_subscriptions where user_id = uid;
  delete from public.thought_records where user_id = uid;
  delete from public.user_preferences where user_id = uid;
  delete from public.profiles where user_id = uid;
  -- Remaining user-owned tables cascade via their FK ON DELETE CASCADE to auth.users.
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_user_account() from public;
revoke execute on function public.delete_user_account() from anon;
grant execute on function public.delete_user_account() to authenticated;

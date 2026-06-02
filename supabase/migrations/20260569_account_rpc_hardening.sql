-- Hardening for the two account-management SECURITY DEFINER RPCs.
--
-- 1. delete_user_account() now performs authoritative, server-side storage cleanup of the
--    user's private avatar objects. FK ON DELETE CASCADE only touches table rows, never
--    storage.objects, and the client-side avatar delete is best-effort (it never runs on a
--    failed/skipped path, e.g. native), so uploaded avatars were orphaned after erasure
--    (GDPR Art. 17). Doing it inside the RPC makes it unskippable and folder-scoped, so it
--    also reclaims historical files from interrupted/re-uploaded avatars.
--
-- 2. Both functions retained PostgreSQL's default PUBLIC EXECUTE grant (only TO authenticated
--    was ever added), leaving them reachable by anon via PostgREST /rpc. Not exploitable today
--    (they raise on auth.uid() IS NULL), but every other SECURITY DEFINER RPC in the schema is
--    explicitly revoked from public - bring these two in line (least privilege).

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

revoke execute on function public.export_user_data() from public;
revoke execute on function public.export_user_data() from anon;
grant execute on function public.export_user_data() to authenticated;

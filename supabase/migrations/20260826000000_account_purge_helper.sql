-- Purge helper - factor account deletion into a shared helper (#1448, spec on #1439 §7).
--
-- The guest dormancy cleanup job (#1449) must delete accounts EXACTLY the way
-- delete_user_account() does. A raw `delete from auth.users` is never acceptable: it
-- strands the user's objects in the private profile-pics storage bucket and skips the
-- explicit per-table deletes below. So the purge body moves out of the RPC into one
-- shared security-definer helper, purge_user_account(uuid), and delete_user_account()
-- now delegates to it. Behaviour is unchanged from 20260577.
--
-- Not client-callable: execute is revoked from public, anon and authenticated, so
-- PostgREST returns 42501 for client roles. Callers are the function owner (postgres -
-- the role pg_cron jobs run as) and service_role, granted explicitly below (the same
-- end state as the send-web-reminders cron RPCs; the service key never ships to
-- clients). The grant is explicit rather than inherited because the local default ACL
-- for postgres-created functions in public no longer includes service_role.
--
-- Shared-function warning: from this migration on, purge_user_account() is the single
-- source of truth for what account deletion removes. A later migration that adds a table
-- needing an explicit delete must redeclare purge_user_account() copied from the NEWEST
-- declaration on dev (redeclarations are last-writer-wins across concurrent PRs - see
-- supabase/README.md), and must never inline deletes back into delete_user_account().

create or replace function public.purge_user_account(target_user uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if target_user is null then
    raise exception 'purge_user_account: target_user is null';
  end if;

  -- Permit direct deletes from storage.objects for this transaction only. Newer storage
  -- images install a BEFORE DELETE trigger (storage.protect_delete) that aborts direct
  -- deletes unless this transaction-local GUC is set (see 20260577).
  perform set_config('storage.allow_delete_query', 'true', true);

  -- Authoritative storage cleanup: every object under the user's own {uid}/ folder in the
  -- private profile-pics bucket (covers current + any historical/orphaned avatar files).
  delete from storage.objects
  where bucket_id = 'profile-pics'
    and (storage.foldername(name))[1] = target_user::text;

  delete from public.emotion_preferences where user_id = target_user;
  delete from public.web_push_subscriptions where user_id = target_user;
  delete from public.thought_records where user_id = target_user;
  delete from public.user_preferences where user_id = target_user;
  delete from public.profiles where user_id = target_user;
  -- Remaining user-owned tables cascade via their FK ON DELETE CASCADE to auth.users.
  delete from auth.users where id = target_user;
end;
$$;

revoke execute on function public.purge_user_account(uuid) from public;
revoke execute on function public.purge_user_account(uuid) from anon;
revoke execute on function public.purge_user_account(uuid) from authenticated;
grant execute on function public.purge_user_account(uuid) to service_role;

-- The client-facing RPC keeps its exact contract (auth guard + grants) and delegates the
-- purge itself to the helper.
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

  perform public.purge_user_account(uid);
end;
$$;

revoke execute on function public.delete_user_account() from public;
revoke execute on function public.delete_user_account() from anon;
grant execute on function public.delete_user_account() to authenticated;

-- Bug-hunt fixes:
--   1. mood_logs had no DELETE RLS policy, so deleting a mood log silently affected 0 rows.
--   2. delete_user_account() was SECURITY DEFINER without a pinned search_path.
--   3. web_push_subscriptions.endpoint was globally UNIQUE, so an endpoint shared across
--      accounts (same browser) made one user's upsert collide with another user's row.

-- 1) Allow a user to delete their own mood logs.
drop policy if exists "mood_logs_delete_own" on public.mood_logs;
create policy "mood_logs_delete_own" on public.mood_logs
  for delete to authenticated using (auth.uid() = user_id);

-- 2) Pin the search_path on the SECURITY DEFINER account-deletion RPC (matches
--    export_user_data and every later function) to close the search-path-injection surface.
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

  delete from public.web_push_subscriptions where user_id = uid;
  delete from public.thought_records where user_id = uid;
  delete from public.user_preferences where user_id = uid;
  delete from public.profiles where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

-- 3) Make web-push subscription uniqueness per-user so a shared endpoint can't make one
--    user's upsert target (and fail RLS against) another user's row.
alter table public.web_push_subscriptions
  drop constraint if exists web_push_subscriptions_endpoint_key;
alter table public.web_push_subscriptions
  add constraint web_push_subscriptions_user_endpoint_key unique (user_id, endpoint);

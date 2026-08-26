-- Guest dormancy cleanup (#1449, spec on #1439 §7).
--
-- Guest accounts (auth.users.is_anonymous = true) are deleted after 12 months of
-- inactivity. Activity is the GREATEST of three timestamps - account creation,
-- last sign-in, and the newest session refresh - never age alone: refresh tokens
-- never expire, so an age-only gate would delete accounts that are still alive on
-- a device and brick it. GREATEST ignores NULL arguments, and a row where every
-- candidate is NULL compares as NULL (not dormant), so missing timestamps always
-- fail safe toward keeping the account. Registered-account dormancy is out of
-- scope.
--
-- Deletion goes through the shared purge_user_account(uuid) helper
-- (20260826000000) - never a raw `delete from auth.users`, which would strand
-- profile-pics storage objects and skip the explicit table deletes.
--
-- Not client-callable: execute revoked from public/anon/authenticated (42501 via
-- PostgREST). service_role is granted explicitly - the local default ACL for
-- postgres-created functions grants nothing - which is how the integration tests
-- exercise it; the daily pg_cron job runs as the function owner (postgres) and
-- needs no grant. Unlike the send-web-reminders cron (20260508), which stays
-- unscheduled until Vault secrets exist, this job is pure SQL with no external
-- configuration, so the migration schedules it directly.

create or replace function public.cleanup_dormant_guest_accounts(batch_size integer default 100)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  purged integer := 0;
  guest record;
begin
  if batch_size is null or batch_size <= 0 then
    raise exception 'cleanup_dormant_guest_accounts: batch_size must be positive';
  end if;

  for guest in
    select u.id
    from auth.users u
    where u.is_anonymous
      and greatest(
            u.created_at,
            u.last_sign_in_at,
            (
              -- Newest session refresh across the account's sessions. updated_at
              -- joins refreshed_at defensively: any write GoTrue makes to a
              -- session row is proof the account is alive on a device.
              select max(greatest(s.refreshed_at, s.updated_at))
              from auth.sessions s
              where s.user_id = u.id
            )
          ) < timezone('utc', now()) - interval '12 months'
    order by u.created_at
    limit batch_size
  loop
    perform public.purge_user_account(guest.id);
    purged := purged + 1;
  end loop;

  return purged;
end;
$$;

revoke execute on function public.cleanup_dormant_guest_accounts(integer) from public;
revoke execute on function public.cleanup_dormant_guest_accounts(integer) from anon;
revoke execute on function public.cleanup_dormant_guest_accounts(integer) from authenticated;
grant execute on function public.cleanup_dormant_guest_accounts(integer) to service_role;

-- Daily at 03:30 UTC, one small batch per day. pg_cron runs the command as the
-- role that scheduled it (postgres, via `db push`/`db reset`). unschedule first
-- so re-running the migration never duplicates the job; it raises when the job
-- does not exist yet, hence the swallowed exception.
do $$
begin
  begin
    perform cron.unschedule('selftend-cleanup-dormant-guests');
  exception
    when others then
      null;
  end;

  perform cron.schedule(
    'selftend-cleanup-dormant-guests',
    '30 3 * * *',
    'select public.cleanup_dormant_guest_accounts();'
  );
end;
$$;

notify pgrst, 'reload schema';

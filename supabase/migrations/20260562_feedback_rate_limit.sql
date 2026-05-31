-- Per-user rate limiting for the send-feedback edge function (prevents authenticated
-- email-bomb / Resend quota abuse). The edge function calls record_feedback_submission()
-- before sending; the SECURITY DEFINER function counts the caller's recent submissions and
-- inserts a record, returning false when the limit is exceeded. The table has no RLS
-- policies, so only the definer function (not a user's JWT) can read/write it.

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists feedback_submissions_user_created_idx
  on public.feedback_submissions (user_id, created_at desc);

alter table public.feedback_submissions enable row level security;
-- Intentionally no policies: only the SECURITY DEFINER RPC below may touch this table.

create or replace function public.record_feedback_submission(
  max_per_window integer default 5,
  window_minutes integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  recent_count integer;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select count(*) into recent_count
  from public.feedback_submissions
  where user_id = uid
    and created_at > timezone('utc', now()) - make_interval(mins => window_minutes);

  if recent_count >= max_per_window then
    return false;
  end if;

  insert into public.feedback_submissions (user_id) values (uid);
  return true;
end;
$$;

revoke execute on function public.record_feedback_submission(integer, integer) from public;
grant execute on function public.record_feedback_submission(integer, integer) to authenticated;

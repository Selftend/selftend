-- Security fix: record_feedback_submission(max_per_window, window_minutes) was granted to
-- authenticated WITH the threshold parameters exposed, so a caller could invoke it as
-- record_feedback_submission(max_per_window => 1000000) and bypass the rate limit entirely.
-- Drop the parameterized signature and replace it with a zero-arg function whose thresholds
-- are hard-coded. The send-feedback edge function calls it with no arguments, so no function
-- code change is needed.

drop function if exists public.record_feedback_submission(integer, integer);

create or replace function public.record_feedback_submission()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  recent_count integer;
  max_per_window constant integer := 5;
  window_minutes constant integer := 60;
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

revoke execute on function public.record_feedback_submission() from public;
grant execute on function public.record_feedback_submission() to authenticated;

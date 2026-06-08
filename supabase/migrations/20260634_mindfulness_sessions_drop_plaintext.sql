-- Drop the now-unused plaintext columns from mindfulness_sessions_data. The encrypted view
-- (20260633) has served reads/writes from reflection_enc / feeling_after_enc since it was applied
-- and the mindfulness_sessions encryption integration test (incl. the null feeling_after case) is
-- green. Plain drop (no CASCADE): the table has no length CHECK on either column.

alter table public.mindfulness_sessions_data drop column if exists reflection;
alter table public.mindfulness_sessions_data drop column if exists feeling_after;

notify pgrst, 'reload schema';

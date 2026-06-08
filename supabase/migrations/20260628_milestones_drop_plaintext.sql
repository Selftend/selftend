-- Drop the now-unused plaintext column from milestones_data. The encrypted view (20260627) has
-- served reads/writes from description_enc since it was applied and the milestones encryption
-- integration test is green. Plain drop (no CASCADE): milestones has no length CHECK on description.

alter table public.milestones_data drop column if exists description;

notify pgrst, 'reload schema';

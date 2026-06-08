-- Drop the now-unused plaintext column from stage_practice_notes_data. The encrypted view
-- (20260631) has served reads/writes from note_enc since it was applied and the
-- stage_practice_notes encryption integration test is green. Plain drop (no CASCADE): the table
-- has no length CHECK on note (the stage CHECK is on the pass-through `stage` column, unaffected).

alter table public.stage_practice_notes_data drop column if exists note;

notify pgrst, 'reload schema';

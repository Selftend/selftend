-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext
-- procrastination-task free-text remains at rest. Plain DROP (no CASCADE): fails loudly if
-- anything unexpected still depends on these columns. The *_len CHECK constraints
-- (task_description/fear_thought/challenged_thought) reference these columns and drop with them;
-- the caps now live in the procrastination_tasks_ins/upd INSTEAD OF triggers.
alter table public.procrastination_tasks_data drop column if exists task_description;
alter table public.procrastination_tasks_data drop column if exists avoidance_reason;
alter table public.procrastination_tasks_data drop column if exists fear_thought;
alter table public.procrastination_tasks_data drop column if exists challenged_thought;
alter table public.procrastination_tasks_data drop column if exists reward;
notify pgrst, 'reload schema';

-- Defense-in-depth: bound the unbounded free-text columns on the older sensitive-data
-- tables. supabase-js talks straight to PostgREST, so the UI maxLength is not a real
-- guard - an authenticated user can POST a multi-megabyte value into their own row,
-- bloating the table and stressing export_user_data() (which json_aggs every row). Newer
-- modules already cap their text (gratitude.note <= 2000, habits.name <= 120); this brings
-- the earlier CBT/worry/anger/journal/mood/exposure tables and profiles.display_name in line.
--
-- Constraints are NOT VALID so the migration never fails on any pre-existing oversized row;
-- they are still enforced on every INSERT/UPDATE going forward, which is the point. Caps are
-- generous (well above any legitimate entry). Idempotent via pg_constraint existence check.

do $$
declare
  c record;
  cname text;
begin
  for c in
    select * from (values
      ('profiles', 'display_name', 100),
      ('mood_logs', 'notes', 4000),
      ('mood_logs', 'situation', 4000),
      ('mood_logs', 'thoughts', 4000),
      ('mood_logs', 'behaviours', 4000),
      ('mood_logs', 'bodily_sensations', 4000),
      ('thought_records', 'situation', 4000),
      ('thought_records', 'balanced_thought', 4000),
      ('thought_records', 'outcome_notes', 4000),
      ('core_beliefs', 'belief_statement', 4000),
      ('core_beliefs', 'alternative_belief', 4000),
      ('core_beliefs', 'reinforcement_plan', 4000),
      ('worry_entries', 'worry_statement', 4000),
      ('worry_entries', 'coping_statement', 4000),
      ('anger_logs', 'trigger_text', 4000),
      ('anger_logs', 'interpretation', 4000),
      ('anger_logs', 'alternative_interpretation', 4000),
      ('anger_logs', 'notes', 4000),
      ('journal_entries', 'title', 300),
      ('journal_entries', 'body', 20000),
      ('exposure_hierarchies', 'title', 300),
      ('exposure_items', 'description', 2000),
      ('goals', 'title', 300),
      ('goals', 'description', 4000),
      ('activity_logs', 'activity_name', 300),
      ('activity_logs', 'notes', 2000),
      ('procrastination_tasks', 'task_description', 2000),
      ('procrastination_tasks', 'fear_thought', 2000),
      ('procrastination_tasks', 'challenged_thought', 2000),
      ('self_care_logs', 'social_notes', 2000),
      ('recovery_plans', 'personal_slogan', 500)
    ) as t(tbl, col, maxlen)
  loop
    cname := c.tbl || '_' || c.col || '_len';
    if not exists (select 1 from pg_constraint where conname = cname) then
      execute format(
        'alter table public.%I add constraint %I check (char_length(%I) <= %s) not valid',
        c.tbl, cname, c.col, c.maxlen
      );
    end if;
  end loop;
end $$;

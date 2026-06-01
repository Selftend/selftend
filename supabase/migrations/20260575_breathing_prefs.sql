-- Two breathing-preference tweaks.
--
-- 1. Default the breath sound to the guided voice so sessions have sound out of the box.
--    The column was introduced (20260573) with default 'none', which silenced existing rows;
--    flip the default and backfill the rows still on that initial 'none' (no user has chosen
--    'none' deliberately yet — the column is a day old).
alter table public.user_preferences alter column breath_sound_id set default 'guided';
update public.user_preferences set breath_sound_id = 'guided' where breath_sound_id = 'none';

-- 2. Globally-remembered cycle count (not per pattern). Null until the user sets one, then the
--    session restores it across patterns and sessions.
alter table public.user_preferences add column if not exists breathing_cycles integer;

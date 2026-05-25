-- Rename the Observing Self "observingFromBoard" (Chessboard) technique to
-- "skyAndWeather" to align with The Happiness Trap (Russ Harris). The book's
-- self-as-context metaphor is the sky and the weather, not the chessboard.

-- Drop the old CHECK before rewriting rows (the old constraint forbids the new value).
ALTER TABLE act_observing_self_sessions
  DROP CONSTRAINT IF EXISTS act_observing_self_sessions_technique_used_check;

UPDATE act_observing_self_sessions
  SET technique_used = 'skyAndWeather'
  WHERE technique_used = 'observingFromBoard';

ALTER TABLE act_observing_self_sessions
  ADD CONSTRAINT act_observing_self_sessions_technique_used_check
  CHECK (technique_used IN ('tenDeepBreaths', 'skyAndWeather', 'bodyAwareness'));

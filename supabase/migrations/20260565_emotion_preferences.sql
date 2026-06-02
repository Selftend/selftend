-- Add emotion_preferences table so users can customise, reorder, or remove emotions.
-- Mirrors the widget_preferences table and RLS convention (policy scoped TO authenticated).
-- Includes updated_at trigger (shared fn: public.set_current_timestamp_updated_at()).
-- Extends GDPR export/delete to cover the new table.

-- === Table ===

CREATE TABLE emotion_preferences (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emotion_id  TEXT        NOT NULL,
  name        TEXT,
  emoji       TEXT,
  position    INTEGER     NOT NULL DEFAULT 0,
  removed     BOOLEAN     NOT NULL DEFAULT FALSE,
  is_custom   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, emotion_id)
);

ALTER TABLE emotion_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own emotion preferences"
  ON emotion_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX emotion_preferences_user_position ON emotion_preferences (user_id, position);

DROP TRIGGER IF EXISTS set_emotion_preferences_updated_at ON public.emotion_preferences;
CREATE TRIGGER set_emotion_preferences_updated_at
  BEFORE UPDATE ON emotion_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- === GDPR export - wrap the current function and append emotionPreferences ===

ALTER FUNCTION public.export_user_data() RENAME TO export_user_data_before_emotion_prefs;
REVOKE EXECUTE ON FUNCTION public.export_user_data_before_emotion_prefs() FROM public;
REVOKE EXECUTE ON FUNCTION public.export_user_data_before_emotion_prefs() FROM authenticated;

CREATE OR REPLACE FUNCTION public.export_user_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  result jsonb;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  result := public.export_user_data_before_emotion_prefs()::jsonb;

  -- Emotion preferences
  result := result || jsonb_build_object(
    'emotionPreferences', (
      SELECT COALESCE(jsonb_agg(TO_JSONB(ep)), '[]'::jsonb)
      FROM (
        SELECT
          id,
          emotion_id,
          name,
          emoji,
          position,
          removed,
          is_custom,
          created_at,
          updated_at
        FROM public.emotion_preferences
        WHERE user_id = uid
        ORDER BY position ASC, created_at ASC
      ) ep
    )
  );

  RETURN result::json;
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_user_data() TO authenticated;

-- === GDPR delete - re-declare with explicit emotion_preferences deletion ===
-- (Mirrors the explicit delete pattern used for web_push_subscriptions; the FK ON DELETE
-- CASCADE would also handle this, but explicit deletes make the function self-documenting.)

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.emotion_preferences WHERE user_id = uid;
  DELETE FROM public.web_push_subscriptions WHERE user_id = uid;
  DELETE FROM public.thought_records WHERE user_id = uid;
  DELETE FROM public.user_preferences WHERE user_id = uid;
  DELETE FROM public.profiles WHERE user_id = uid;
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

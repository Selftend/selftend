-- Global breathing audio preferences. Four optional columns on user_preferences holding the
-- one audio profile applied to every breathing exercise (spec: settings are global, not
-- per-exercise). Additive + idempotent (add column if not exists). The app degrades gracefully
-- if these are not yet deployed (see omitOptionalPreferenceColumns in settings/repository.ts).
-- Defaults are 'none' / 'none' so the out-of-the-box experience is silent until the user picks
-- a sound (placeholder audio assets ship until real loops are supplied).

alter table public.user_preferences
  add column if not exists breath_sound_id text not null default 'none',
  add column if not exists ambient_sound_id text not null default 'none',
  add column if not exists breath_volume numeric not null default 0.7,
  add column if not exists ambient_volume numeric not null default 0.5;

-- Per-session breathing metrics so history can show cycles completed and the exact elapsed
-- time (even when finished early). Breathing reuses mindfulness_sessions; both columns are
-- nullable and left null by the other session types (mindfulness, grounding).
alter table public.mindfulness_sessions
  add column if not exists cycles integer,
  add column if not exists duration_seconds integer;

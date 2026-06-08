-- Encrypt mindfulness_sessions free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT:
--   reflection     (text, NOT NULL)
--   feeling_after  (text, NULLABLE) -- NULL semantics preserved: app.encrypt_text(NULL)=NULL and
--                                       app.decrypt_text(NULL)=NULL, so NULL round-trips. The
--                                       trigger encrypts feeling_after AS-IS (no '' coalesce).
-- PASS-THROUGH: id, user_id, exercise_name (text), duration_minutes (int, CHECK>=0),
--   mood_after (int NULLABLE, CHECK 1..5), completed_at (timestamptz), created_at, cycles (int),
--   duration_seconds (int).
-- NO updated_at column on this table; NO set_*_updated_at trigger.
-- RLS: only INSERT/SELECT policies exist (no UPDATE, no DELETE) — verified in pg_policies. The
--   client only ever inserts (saveMindfulnessSession) and reads. The INSTEAD OF update/delete
--   triggers are created for consistency + the service-role cleanup path, but a regular user's
--   UPDATE/DELETE through the view is an RLS no-op (pre-existing behavior, intentionally
--   preserved). No length cap exists on either column.
-- completed_at is DB-defaulted (timezone('utc',now())) and the client may omit it, so the INSTEAD
--   OF INSERT trigger RETURNs the stored completed_at back into NEW (alongside id/user_id/created_at)
--   so the view's INSERT response reflects the defaulted value instead of the omitted NULL.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.mindfulness_sessions add column if not exists reflection_enc    bytea;
alter table public.mindfulness_sessions add column if not exists feeling_after_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (NULL feeling_after stays NULL).
update public.mindfulness_sessions
  set reflection_enc    = app.encrypt_text(reflection),
      feeling_after_enc = app.encrypt_text(feeling_after)
  where reflection_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.mindfulness_sessions rename to mindfulness_sessions_data;
alter table public.mindfulness_sessions_data enable row level security;

alter table public.mindfulness_sessions_data alter column reflection drop not null;
-- feeling_after is already nullable.

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.mindfulness_sessions with (security_invoker = true) as
  select id,
         user_id,
         exercise_name,
         duration_minutes,
         app.decrypt_text(reflection_enc)    as reflection,
         mood_after,
         completed_at,
         created_at,
         app.decrypt_text(feeling_after_enc) as feeling_after,
         cycles,
         duration_seconds
  from public.mindfulness_sessions_data;

create or replace function public.mindfulness_sessions_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.mindfulness_sessions_data (
    id, user_id, exercise_name, duration_minutes, reflection_enc, mood_after,
    completed_at, created_at, feeling_after_enc, cycles, duration_seconds)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    new.exercise_name, new.duration_minutes,
    app.encrypt_text(coalesce(new.reflection, '')),
    new.mood_after,
    coalesce(new.completed_at, timezone('utc', now())),
    coalesce(new.created_at, timezone('utc', now())),
    app.encrypt_text(new.feeling_after),   -- NULL stays NULL
    new.cycles, new.duration_seconds)
  returning id, user_id, completed_at, created_at
    into new.id, new.user_id, new.completed_at, new.created_at;
  return new;
end; $$;
drop trigger if exists mindfulness_sessions_ins on public.mindfulness_sessions;
create trigger mindfulness_sessions_ins instead of insert on public.mindfulness_sessions
  for each row execute function public.mindfulness_sessions_ins();

create or replace function public.mindfulness_sessions_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.mindfulness_sessions_data set
    exercise_name     = new.exercise_name,
    duration_minutes  = new.duration_minutes,
    reflection_enc    = app.encrypt_text(coalesce(new.reflection, '')),
    mood_after        = new.mood_after,
    completed_at      = new.completed_at,
    created_at        = new.created_at,
    feeling_after_enc = app.encrypt_text(new.feeling_after),   -- NULL stays NULL
    cycles            = new.cycles,
    duration_seconds  = new.duration_seconds
   where id = old.id;
  return new;
end; $$;
drop trigger if exists mindfulness_sessions_upd on public.mindfulness_sessions;
create trigger mindfulness_sessions_upd instead of update on public.mindfulness_sessions
  for each row execute function public.mindfulness_sessions_upd();

create or replace function public.mindfulness_sessions_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.mindfulness_sessions_data where id = old.id;
  return old;
end; $$;
drop trigger if exists mindfulness_sessions_del on public.mindfulness_sessions;
create trigger mindfulness_sessions_del instead of delete on public.mindfulness_sessions
  for each row execute function public.mindfulness_sessions_del();

grant select, insert, update, delete on public.mindfulness_sessions to authenticated;
notify pgrst, 'reload schema';

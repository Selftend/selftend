-- Capture the civil day breathing and grounding sessions were completed on (#330).
--
-- Both tools persist into mindfulness_sessions, split only by exercise_name, so a
-- single column on the shared table serves both tool ids.
--
-- Nullable, no default, no backfill. This is the shape 20260726_occurrence_offset_nullable
-- had to retrofit onto the first four tables after `not null default 0` made every
-- pre-existing row claim UTC; here it is the starting point. A stored value is only
-- ever one a client explicitly sent. Rows written before this migration - and writes
-- from clients that predate the column - record "unknown" and keep falling back to the
-- viewer's local day, which is exactly where they render today, so no session moves.
alter table public.mindfulness_sessions_data
  add column if not exists completed_offset_minutes smallint
    check (completed_offset_minutes between -840 and 840);

-- The view is the client's only handle on this table - PostgREST cannot see a column
-- that is missing here. Re-list every column the view already exposes (20260633, less
-- the plaintext pair dropped in 20260634) and append the new one.
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
         duration_seconds,
         completed_offset_minutes
    from public.mindfulness_sessions_data;

-- The offset is written by the encrypted-view writers themselves rather than by a
-- supplemental UPDATE from the occurrence trigger, which is how the first four tables
-- do it (20260708:98-115). That pattern cannot work here: mindfulness_sessions_data
-- carries only SELECT and INSERT policies (20260516000000:109-112, re-pointed at the
-- _data table by 20260667:91-92) and no UPDATE policy, so a security-invoker UPDATE
-- run by the owning user matches zero rows and silently drops the offset. Verified
-- against a local database - the follow-up UPDATE reports `UPDATE 0`.
--
-- Adding an UPDATE policy would make it work, but mindfulness sessions are a
-- deliberately append-only log: 20260633 records that a regular user's UPDATE through
-- the view is an intentional RLS no-op. Loosening RLS to accommodate a trigger is the
-- wrong trade, so the INSERT path - the only write a user is allowed - carries the
-- column instead.
create or replace function public.mindfulness_sessions_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.mindfulness_sessions_data (
    id, user_id, exercise_name, duration_minutes, reflection_enc, mood_after,
    completed_at, created_at, feeling_after_enc, cycles, duration_seconds,
    completed_offset_minutes)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    new.exercise_name, new.duration_minutes,
    app.encrypt_text(coalesce(new.reflection, '')),
    new.mood_after,
    coalesce(new.completed_at, timezone('utc', now())),
    coalesce(new.created_at, timezone('utc', now())),
    app.encrypt_text(new.feeling_after),   -- NULL stays NULL
    new.cycles, new.duration_seconds,
    -- No `coalesce(..., 0)` (20260726:81-84): a client that omits the column records
    -- "unknown", not an assertion that it was standing at UTC.
    new.completed_offset_minutes)
  returning id, user_id, completed_at, created_at
    into new.id, new.user_id, new.completed_at, new.created_at;
  return new;
end; $$;

-- Kept in step with the INSERT writer. For a regular user this remains the RLS no-op
-- it has always been; it is the service-role cleanup path that sees the effect.
create or replace function public.mindfulness_sessions_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.mindfulness_sessions_data set
    exercise_name            = new.exercise_name,
    duration_minutes         = new.duration_minutes,
    reflection_enc           = app.encrypt_text(coalesce(new.reflection, '')),
    mood_after               = new.mood_after,
    completed_at             = new.completed_at,
    created_at               = new.created_at,
    feeling_after_enc        = app.encrypt_text(new.feeling_after),   -- NULL stays NULL
    cycles                   = new.cycles,
    duration_seconds         = new.duration_seconds,
    completed_offset_minutes = new.completed_offset_minutes
   where id = old.id;
  return new;
end; $$;

-- The `zz_` prefix is load-bearing, not style. PostgreSQL fires row-level INSTEAD OF
-- triggers in name order, so this sorts after `mindfulness_sessions_ins` / `_upd` and
-- runs once they have resolved NEW. That matters here because completed_at is
-- server-defaulted and the client may omit it: only after the INSERT writer has
-- returned the stored value into NEW is there an occurrence time to validate at all.
-- Renaming this to sort earlier would reject every legacy insert as
-- "Occurrence time is required".
--
-- validate_occurrence_time has tolerated a null offset since 20260726:59-79, so
-- "unknown" passes while an out-of-range value still raises.
create or replace function public.zz_mindfulness_sessions_occurrence() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.validate_occurrence_time(new.completed_at, new.completed_offset_minutes);
  return new;
end;
$$;
drop trigger if exists zz_mindfulness_sessions_occurrence_ins on public.mindfulness_sessions;
create trigger zz_mindfulness_sessions_occurrence_ins instead of insert on public.mindfulness_sessions
  for each row execute function public.zz_mindfulness_sessions_occurrence();
drop trigger if exists zz_mindfulness_sessions_occurrence_upd on public.mindfulness_sessions;
create trigger zz_mindfulness_sessions_occurrence_upd instead of update on public.mindfulness_sessions
  for each row execute function public.zz_mindfulness_sessions_occurrence();

notify pgrst, 'reload schema';

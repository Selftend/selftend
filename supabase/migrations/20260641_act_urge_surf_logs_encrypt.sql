-- Encrypt act_urge_surf_logs free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (all text, NOT NULL, default ''; no length cap, no not-blank constraint):
--   urge_description, trigger, surfing_notes
-- PASS-THROUGH (plaintext, stay on the base table): id, user_id, peak_intensity,
--   urge_acted_on (NOT NULL default false), completed_at (NOT NULL default now()),
--   created_at, updated_at.
-- NOTE: "trigger" is a reserved word — quoted everywhere it appears as a column.
-- NO set_act_urge_surf_logs_updated_at trigger exists; the triggers set updated_at explicitly.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.act_urge_surf_logs add column if not exists urge_description_enc bytea;
alter table public.act_urge_surf_logs add column if not exists trigger_enc          bytea;
alter table public.act_urge_surf_logs add column if not exists surfing_notes_enc    bytea;

-- Step B: backfill ciphertext from existing plaintext.
update public.act_urge_surf_logs
  set urge_description_enc = app.encrypt_text(urge_description),
      trigger_enc          = app.encrypt_text("trigger"),
      surfing_notes_enc    = app.encrypt_text(surfing_notes)
  where urge_description_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.act_urge_surf_logs rename to act_urge_surf_logs_data;
alter table public.act_urge_surf_logs_data enable row level security;

alter table public.act_urge_surf_logs_data alter column urge_description drop not null;
alter table public.act_urge_surf_logs_data alter column "trigger"        drop not null;
alter table public.act_urge_surf_logs_data alter column surfing_notes    drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.act_urge_surf_logs with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(urge_description_enc) as urge_description,
         app.decrypt_text(trigger_enc)          as trigger,
         peak_intensity,
         app.decrypt_text(surfing_notes_enc)    as surfing_notes,
         urge_acted_on,
         completed_at,
         created_at,
         updated_at
  from public.act_urge_surf_logs_data;

create or replace function public.act_urge_surf_logs_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.act_urge_surf_logs_data (
    id, user_id, urge_description_enc, trigger_enc, peak_intensity, surfing_notes_enc,
    urge_acted_on, completed_at, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.urge_description, '')),
    app.encrypt_text(coalesce(new.trigger, '')),
    new.peak_intensity,
    app.encrypt_text(coalesce(new.surfing_notes, '')),
    coalesce(new.urge_acted_on, false),
    coalesce(new.completed_at, timezone('utc', now())),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, urge_acted_on, completed_at, created_at, updated_at
    into new.id, new.user_id, new.urge_acted_on, new.completed_at, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists act_urge_surf_logs_ins on public.act_urge_surf_logs;
create trigger act_urge_surf_logs_ins instead of insert on public.act_urge_surf_logs
  for each row execute function public.act_urge_surf_logs_ins();

create or replace function public.act_urge_surf_logs_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.act_urge_surf_logs_data set
    urge_description_enc = app.encrypt_text(coalesce(new.urge_description, '')),
    trigger_enc          = app.encrypt_text(coalesce(new.trigger, '')),
    peak_intensity       = new.peak_intensity,
    surfing_notes_enc    = app.encrypt_text(coalesce(new.surfing_notes, '')),
    urge_acted_on        = new.urge_acted_on,
    completed_at         = new.completed_at,
    created_at           = new.created_at,
    updated_at           = timezone('utc', now())
   where id = old.id;
  return new;
end; $$;
drop trigger if exists act_urge_surf_logs_upd on public.act_urge_surf_logs;
create trigger act_urge_surf_logs_upd instead of update on public.act_urge_surf_logs
  for each row execute function public.act_urge_surf_logs_upd();

create or replace function public.act_urge_surf_logs_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.act_urge_surf_logs_data where id = old.id;
  return old;
end; $$;
drop trigger if exists act_urge_surf_logs_del on public.act_urge_surf_logs;
create trigger act_urge_surf_logs_del instead of delete on public.act_urge_surf_logs
  for each row execute function public.act_urge_surf_logs_del();

grant select, insert, update, delete on public.act_urge_surf_logs to authenticated;
notify pgrst, 'reload schema';

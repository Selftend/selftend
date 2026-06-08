-- Encrypt act_defusion_logs free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (all text, NOT NULL, default ''; no length cap, no not-blank constraint):
--   fused_thought, defused_version, notes
-- PASS-THROUGH (plaintext, stay on the base table): id, user_id,
--   thought_category (enum CHECK), fusion_level_before, technique_used (enum CHECK),
--   fusion_level_after, created_at, updated_at.
-- NO set_act_defusion_logs_updated_at trigger exists; the triggers set updated_at explicitly.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.act_defusion_logs add column if not exists fused_thought_enc   bytea;
alter table public.act_defusion_logs add column if not exists defused_version_enc bytea;
alter table public.act_defusion_logs add column if not exists notes_enc           bytea;

-- Step B: backfill ciphertext from existing plaintext.
update public.act_defusion_logs
  set fused_thought_enc   = app.encrypt_text(fused_thought),
      defused_version_enc = app.encrypt_text(defused_version),
      notes_enc           = app.encrypt_text(notes)
  where fused_thought_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.act_defusion_logs rename to act_defusion_logs_data;
alter table public.act_defusion_logs_data enable row level security;

alter table public.act_defusion_logs_data alter column fused_thought   drop not null;
alter table public.act_defusion_logs_data alter column defused_version drop not null;
alter table public.act_defusion_logs_data alter column notes           drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.act_defusion_logs with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(fused_thought_enc)   as fused_thought,
         thought_category,
         fusion_level_before,
         technique_used,
         app.decrypt_text(defused_version_enc) as defused_version,
         fusion_level_after,
         app.decrypt_text(notes_enc)           as notes,
         created_at,
         updated_at
  from public.act_defusion_logs_data;

create or replace function public.act_defusion_logs_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.act_defusion_logs_data (
    id, user_id, fused_thought_enc, thought_category, fusion_level_before,
    technique_used, defused_version_enc, fusion_level_after, notes_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.fused_thought, '')),
    coalesce(new.thought_category, 'other'),
    new.fusion_level_before,
    coalesce(new.technique_used, 'havingTheThoughtThat'),
    app.encrypt_text(coalesce(new.defused_version, '')),
    new.fusion_level_after,
    app.encrypt_text(coalesce(new.notes, '')),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, thought_category, technique_used, created_at, updated_at
    into new.id, new.user_id, new.thought_category, new.technique_used, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists act_defusion_logs_ins on public.act_defusion_logs;
create trigger act_defusion_logs_ins instead of insert on public.act_defusion_logs
  for each row execute function public.act_defusion_logs_ins();

create or replace function public.act_defusion_logs_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.act_defusion_logs_data set
    fused_thought_enc   = app.encrypt_text(coalesce(new.fused_thought, '')),
    thought_category    = new.thought_category,
    fusion_level_before = new.fusion_level_before,
    technique_used      = new.technique_used,
    defused_version_enc = app.encrypt_text(coalesce(new.defused_version, '')),
    fusion_level_after  = new.fusion_level_after,
    notes_enc           = app.encrypt_text(coalesce(new.notes, '')),
    created_at          = new.created_at,
    updated_at          = timezone('utc', now())
   where id = old.id;
  return new;
end; $$;
drop trigger if exists act_defusion_logs_upd on public.act_defusion_logs;
create trigger act_defusion_logs_upd instead of update on public.act_defusion_logs
  for each row execute function public.act_defusion_logs_upd();

create or replace function public.act_defusion_logs_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.act_defusion_logs_data where id = old.id;
  return old;
end; $$;
drop trigger if exists act_defusion_logs_del on public.act_defusion_logs;
create trigger act_defusion_logs_del instead of delete on public.act_defusion_logs
  for each row execute function public.act_defusion_logs_del();

grant select, insert, update, delete on public.act_defusion_logs to authenticated;
notify pgrst, 'reload schema';

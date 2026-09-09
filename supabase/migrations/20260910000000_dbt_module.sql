-- DBT module data layer (map #1980; spec docs/modules/dbt-mckay-skills-workbook.md §5–§6).
--
-- Seven tables, every one born encrypted on the routines template (20260715 - the
-- only non-retrofit encrypted table): a `dbt_<t>_data` base holding ciphertext
-- behind a same-named security_invoker view with INSTEAD OF triggers through
-- app.encrypt_text / app.decrypt_text, a `<t>_guard` per free-text field, and RLS
-- in the sub-select form. `user_id … on delete cascade` so purge_user_account()
-- needs no edit.
--
-- The plaintext rule (spec §5.1), stated once: an id, an enum, a number a list
-- orders on, a timestamp, an offset or a boolean is a plaintext column with a
-- CHECK; every free-text field is `*_enc`. Nothing plaintext is ever the person's
-- words. Emotion ids ride plaintext `text[]` on the check-in's id space, exactly as
-- `mood_logs.emotions` does; body sensations are the check-in's free-text chips and
-- are encrypted.
--
-- Every dated column carries a `<ts>_offset_minutes` twin (nullable, no default):
-- the module is born in the captured frame (#1904), so every DBT record names its
-- own civil day and `record_days` gains six legs below.
--
-- What is deliberately NOT here (spec §5.6): no table for Pause and choose (it
-- records nothing), no `archived_at` anywhere (an archive with no restore UI is
-- retention without a purpose), no rating on any record, no outcome column on the
-- wise mind check-in, no `note_enc` on sessions yet (reserved for the post-MVP
-- sessions and added by their migration), no onboarding singleton.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. dbt_coping_plans - one row per person, one encrypted document
-- ═══════════════════════════════════════════════════════════════════════════════
-- The plan is stored whole as jsonb-as-text (the `thought_records.nats_enc` shape):
-- `{ items: [{ id, section, kind, pickKey?, text?, homeOnly, position }], fallback: [itemId…] }`.
-- Picks store a registry key, never a label, so copy can change under a saved plan
-- and the export still reads. A normalised child table was refused (#1992): a child
-- write does not bump the parent's `updated_at`, and `updated_at` IS the programme's
-- "touched since the phase began" fact (#1990).

create table if not exists public.dbt_coping_plans_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_enc bytea,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint dbt_coping_plans_data_user_unique unique (user_id),
  constraint dbt_coping_plans_data_plan_enc_size check (octet_length(plan_enc) <= 131072)
);

create index if not exists dbt_coping_plans_data_user_created_idx
  on public.dbt_coping_plans_data (user_id, created_at desc);

drop trigger if exists set_dbt_coping_plans_updated_at on public.dbt_coping_plans_data;
create trigger set_dbt_coping_plans_updated_at
before update on public.dbt_coping_plans_data
for each row execute function public.set_current_timestamp_updated_at();

alter table public.dbt_coping_plans_data enable row level security;

drop policy if exists dbt_coping_plans_manage_own on public.dbt_coping_plans_data;
create policy dbt_coping_plans_manage_own on public.dbt_coping_plans_data
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace view public.dbt_coping_plans with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(plan_enc)::jsonb as plan,
         created_at,
         updated_at
  from public.dbt_coping_plans_data;

-- The document guard re-checks what the client's zod schema enforces (#1986's item
-- model): at most 60 items; every item has an id, a known section and kind; an own
-- line is 1–120 characters; the fallback list is 3–6 ids and every one is an item.
create or replace function public.dbt_coping_plans_guard(p_plan jsonb) returns void
language plpgsql immutable set search_path = pg_catalog, public as $$
declare
  item jsonb;
  fallback_id jsonb;
  item_ids text[];
begin
  if p_plan is null or jsonb_typeof(p_plan) <> 'object' then
    raise exception 'coping plan must be an object' using errcode='check_violation';
  end if;
  if jsonb_typeof(p_plan -> 'items') <> 'array' or jsonb_typeof(p_plan -> 'fallback') <> 'array' then
    raise exception 'coping plan needs items and fallback arrays' using errcode='check_violation';
  end if;
  if jsonb_array_length(p_plan -> 'items') > 60 then
    raise exception 'coping plan exceeds 60 items' using errcode='check_violation';
  end if;
  item_ids := array[]::text[];
  for item in select * from jsonb_array_elements(p_plan -> 'items') loop
    if jsonb_typeof(item -> 'id') <> 'string' or length(item ->> 'id') = 0 then
      raise exception 'coping plan item needs an id' using errcode='check_violation';
    end if;
    if (item ->> 'section') not in ('distract', 'soothe', 'remind') then
      raise exception 'coping plan item has an unknown section' using errcode='check_violation';
    end if;
    if (item ->> 'kind') not in ('pick', 'own') then
      raise exception 'coping plan item has an unknown kind' using errcode='check_violation';
    end if;
    if (item ->> 'kind') = 'own' then
      if item ->> 'text' is null or length(btrim(item ->> 'text')) = 0 then
        raise exception 'own coping plan line must not be blank' using errcode='check_violation';
      end if;
      if char_length(item ->> 'text') > 120 then
        raise exception 'own coping plan line exceeds 120 characters' using errcode='check_violation';
      end if;
    else
      if item ->> 'pickKey' is null or length(btrim(item ->> 'pickKey')) = 0 then
        raise exception 'coping plan pick needs a pickKey' using errcode='check_violation';
      end if;
    end if;
    item_ids := array_append(item_ids, item ->> 'id');
  end loop;
  if jsonb_array_length(p_plan -> 'fallback') < 3 or jsonb_array_length(p_plan -> 'fallback') > 6 then
    raise exception 'coping plan fallback list needs three to six items' using errcode='check_violation';
  end if;
  for fallback_id in select * from jsonb_array_elements(p_plan -> 'fallback') loop
    if jsonb_typeof(fallback_id) <> 'string' or not ((fallback_id #>> '{}') = any (item_ids)) then
      raise exception 'coping plan fallback names an item that is not on the plan' using errcode='check_violation';
    end if;
  end loop;
end; $$;

create or replace function public.dbt_coping_plans_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.dbt_coping_plans_guard(new.plan);
  insert into public.dbt_coping_plans_data (id, user_id, plan_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(new.plan::text),
    coalesce(new.created_at, timezone('utc', now())), timezone('utc', now()))
  returning id, user_id, created_at, updated_at
    into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists dbt_coping_plans_ins on public.dbt_coping_plans;
create trigger dbt_coping_plans_ins instead of insert on public.dbt_coping_plans
  for each row execute function public.dbt_coping_plans_ins();

create or replace function public.dbt_coping_plans_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.dbt_coping_plans_guard(new.plan);
  update public.dbt_coping_plans_data set
    plan_enc   = app.encrypt_text(new.plan::text),
    created_at = new.created_at
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $$;
drop trigger if exists dbt_coping_plans_upd on public.dbt_coping_plans;
create trigger dbt_coping_plans_upd instead of update on public.dbt_coping_plans
  for each row execute function public.dbt_coping_plans_upd();

create or replace function public.dbt_coping_plans_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.dbt_coping_plans_data where id = old.id;
  return old;
end; $$;
drop trigger if exists dbt_coping_plans_del on public.dbt_coping_plans;
create trigger dbt_coping_plans_del instead of delete on public.dbt_coping_plans
  for each row execute function public.dbt_coping_plans_del();

grant select, insert, update, delete on public.dbt_coping_plans to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. dbt_sessions - a completed timed practice; append-only; record on completion
-- ═══════════════════════════════════════════════════════════════════════════════
-- No free text today, so no `_enc` column - but the base/view pair is kept so the
-- post-MVP sessions' optional `note_enc` is an added column rather than a
-- retrofit, and so the repository reads every DBT table the same way.
-- `session_slug` is a CHECK enumerating the SHIPPED slugs, widened per slice: a
-- mis-tagged session is a loud error here, not a breathing tally (the
-- `mindfulness_sessions` trap, #1981). Reserved values: safe-place, cue-word,
-- inner-outer, focus-shifting, watching-an-emotion, emotion-exposure.
-- Stop saves nothing: there is no `steps_completed`, only finished sessions exist.

create table if not exists public.dbt_sessions_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_slug text not null,
  variant text,
  duration_seconds integer not null,
  completed_at timestamptz not null default timezone('utc', now()),
  completed_offset_minutes smallint,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint dbt_sessions_data_slug_known check (session_slug in ('muscle-relaxation')),
  constraint dbt_sessions_data_variant_known check (variant is null or variant in ('full', 'short')),
  constraint dbt_sessions_data_duration_positive check (duration_seconds > 0),
  constraint dbt_sessions_data_completed_offset_range
    check (completed_offset_minutes between -840 and 840)
);

create index if not exists dbt_sessions_data_user_completed_idx
  on public.dbt_sessions_data (user_id, completed_at desc);

drop trigger if exists set_dbt_sessions_updated_at on public.dbt_sessions_data;
create trigger set_dbt_sessions_updated_at
before update on public.dbt_sessions_data
for each row execute function public.set_current_timestamp_updated_at();

alter table public.dbt_sessions_data enable row level security;

drop policy if exists dbt_sessions_manage_own on public.dbt_sessions_data;
create policy dbt_sessions_manage_own on public.dbt_sessions_data
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace view public.dbt_sessions with (security_invoker = true) as
  select id,
         user_id,
         session_slug,
         variant,
         duration_seconds,
         completed_at,
         completed_offset_minutes,
         created_at,
         updated_at
  from public.dbt_sessions_data;

create or replace function public.dbt_sessions_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.dbt_sessions_data (
    id, user_id, session_slug, variant, duration_seconds,
    completed_at, completed_offset_minutes, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    new.session_slug, new.variant, new.duration_seconds,
    coalesce(new.completed_at, timezone('utc', now())), new.completed_offset_minutes,
    coalesce(new.created_at, timezone('utc', now())), timezone('utc', now()))
  returning id, user_id, completed_at, created_at, updated_at
    into new.id, new.user_id, new.completed_at, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists dbt_sessions_ins on public.dbt_sessions;
create trigger dbt_sessions_ins instead of insert on public.dbt_sessions
  for each row execute function public.dbt_sessions_ins();

create or replace function public.dbt_sessions_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.dbt_sessions_data set
    session_slug             = new.session_slug,
    variant                  = new.variant,
    duration_seconds         = new.duration_seconds,
    completed_at             = new.completed_at,
    completed_offset_minutes = new.completed_offset_minutes,
    created_at               = new.created_at
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $$;
drop trigger if exists dbt_sessions_upd on public.dbt_sessions;
create trigger dbt_sessions_upd instead of update on public.dbt_sessions
  for each row execute function public.dbt_sessions_upd();

create or replace function public.dbt_sessions_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.dbt_sessions_data where id = old.id;
  return old;
end; $$;
drop trigger if exists dbt_sessions_del on public.dbt_sessions;
create trigger dbt_sessions_del instead of delete on public.dbt_sessions
  for each row execute function public.dbt_sessions_del();

grant select, insert, update, delete on public.dbt_sessions to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. dbt_wise_mind_checkins - question (required) + three optional notes
-- ═══════════════════════════════════════════════════════════════════════════════
-- No outcome column and no later prompt (#1987): a slot waiting to be filled is a
-- surface engineered to be reopened.

create table if not exists public.dbt_wise_mind_checkins_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_enc bytea,
  emotion_mind_enc bytea,
  reason_enc bytea,
  wise_mind_enc bytea,
  created_at timestamptz not null default timezone('utc', now()),
  created_offset_minutes smallint,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint dbt_wise_mind_checkins_data_question_enc_size check (octet_length(question_enc) <= 131072),
  constraint dbt_wise_mind_checkins_data_emotion_mind_enc_size check (octet_length(emotion_mind_enc) <= 131072),
  constraint dbt_wise_mind_checkins_data_reason_enc_size check (octet_length(reason_enc) <= 131072),
  constraint dbt_wise_mind_checkins_data_wise_mind_enc_size check (octet_length(wise_mind_enc) <= 131072),
  constraint dbt_wise_mind_checkins_data_created_offset_range
    check (created_offset_minutes between -840 and 840)
);

create index if not exists dbt_wise_mind_checkins_data_user_created_idx
  on public.dbt_wise_mind_checkins_data (user_id, created_at desc);

drop trigger if exists set_dbt_wise_mind_checkins_updated_at on public.dbt_wise_mind_checkins_data;
create trigger set_dbt_wise_mind_checkins_updated_at
before update on public.dbt_wise_mind_checkins_data
for each row execute function public.set_current_timestamp_updated_at();

alter table public.dbt_wise_mind_checkins_data enable row level security;

drop policy if exists dbt_wise_mind_checkins_manage_own on public.dbt_wise_mind_checkins_data;
create policy dbt_wise_mind_checkins_manage_own on public.dbt_wise_mind_checkins_data
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace view public.dbt_wise_mind_checkins with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(question_enc) as question,
         app.decrypt_text(emotion_mind_enc) as emotion_mind,
         app.decrypt_text(reason_enc) as reason,
         app.decrypt_text(wise_mind_enc) as wise_mind,
         created_at,
         created_offset_minutes,
         updated_at
  from public.dbt_wise_mind_checkins_data;

create or replace function public.dbt_wise_mind_checkins_guard(
  p_question text, p_emotion_mind text, p_reason text, p_wise_mind text) returns void
language plpgsql immutable set search_path = pg_catalog, public as $$
begin
  if p_question is null or length(btrim(p_question)) = 0 then
    raise exception 'wise mind question must not be blank' using errcode='check_violation';
  end if;
  if char_length(p_question) > 200 then
    raise exception 'wise mind question exceeds 200 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_emotion_mind, '')) > 500 then
    raise exception 'emotion mind note exceeds 500 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_reason, '')) > 500 then
    raise exception 'reason note exceeds 500 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_wise_mind, '')) > 500 then
    raise exception 'wise mind note exceeds 500 characters' using errcode='check_violation';
  end if;
end; $$;

create or replace function public.dbt_wise_mind_checkins_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.dbt_wise_mind_checkins_guard(new.question, new.emotion_mind, new.reason, new.wise_mind);
  insert into public.dbt_wise_mind_checkins_data (
    id, user_id, question_enc, emotion_mind_enc, reason_enc, wise_mind_enc,
    created_at, created_offset_minutes, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(new.question),
    app.encrypt_text(coalesce(new.emotion_mind, '')),
    app.encrypt_text(coalesce(new.reason, '')),
    app.encrypt_text(coalesce(new.wise_mind, '')),
    coalesce(new.created_at, timezone('utc', now())), new.created_offset_minutes,
    timezone('utc', now()))
  returning id, user_id, created_at, updated_at
    into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists dbt_wise_mind_checkins_ins on public.dbt_wise_mind_checkins;
create trigger dbt_wise_mind_checkins_ins instead of insert on public.dbt_wise_mind_checkins
  for each row execute function public.dbt_wise_mind_checkins_ins();

create or replace function public.dbt_wise_mind_checkins_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.dbt_wise_mind_checkins_guard(new.question, new.emotion_mind, new.reason, new.wise_mind);
  update public.dbt_wise_mind_checkins_data set
    question_enc           = app.encrypt_text(new.question),
    emotion_mind_enc       = app.encrypt_text(coalesce(new.emotion_mind, '')),
    reason_enc             = app.encrypt_text(coalesce(new.reason, '')),
    wise_mind_enc          = app.encrypt_text(coalesce(new.wise_mind, '')),
    created_at             = new.created_at,
    created_offset_minutes = new.created_offset_minutes
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $$;
drop trigger if exists dbt_wise_mind_checkins_upd on public.dbt_wise_mind_checkins;
create trigger dbt_wise_mind_checkins_upd instead of update on public.dbt_wise_mind_checkins
  for each row execute function public.dbt_wise_mind_checkins_upd();

create or replace function public.dbt_wise_mind_checkins_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.dbt_wise_mind_checkins_data where id = old.id;
  return old;
end; $$;
drop trigger if exists dbt_wise_mind_checkins_del on public.dbt_wise_mind_checkins;
create trigger dbt_wise_mind_checkins_del instead of delete on public.dbt_wise_mind_checkins
  for each row execute function public.dbt_wise_mind_checkins_del();

grant select, insert, update, delete on public.dbt_wise_mind_checkins to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. dbt_judgements - the judgement, a Negative/Positive mark, an optional restatement
-- ═══════════════════════════════════════════════════════════════════════════════
-- No `where` column (a location exists in the book to spot patterns, and decision 7
-- builds no pattern view) and no `noticed_at`: the record is not back-datable, so
-- `created_at` + its captured offset IS the noticing instant (#1992).

create table if not exists public.dbt_judgements_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  judgement_enc bytea,
  restatement_enc bytea,
  valence text not null,
  created_at timestamptz not null default timezone('utc', now()),
  created_offset_minutes smallint,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint dbt_judgements_data_judgement_enc_size check (octet_length(judgement_enc) <= 131072),
  constraint dbt_judgements_data_restatement_enc_size check (octet_length(restatement_enc) <= 131072),
  constraint dbt_judgements_data_valence_known check (valence in ('negative', 'positive')),
  constraint dbt_judgements_data_created_offset_range
    check (created_offset_minutes between -840 and 840)
);

create index if not exists dbt_judgements_data_user_created_idx
  on public.dbt_judgements_data (user_id, created_at desc);

drop trigger if exists set_dbt_judgements_updated_at on public.dbt_judgements_data;
create trigger set_dbt_judgements_updated_at
before update on public.dbt_judgements_data
for each row execute function public.set_current_timestamp_updated_at();

alter table public.dbt_judgements_data enable row level security;

drop policy if exists dbt_judgements_manage_own on public.dbt_judgements_data;
create policy dbt_judgements_manage_own on public.dbt_judgements_data
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace view public.dbt_judgements with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(judgement_enc) as judgement,
         app.decrypt_text(restatement_enc) as restatement,
         valence,
         created_at,
         created_offset_minutes,
         updated_at
  from public.dbt_judgements_data;

create or replace function public.dbt_judgements_guard(p_judgement text, p_restatement text) returns void
language plpgsql immutable set search_path = pg_catalog, public as $$
begin
  if p_judgement is null or length(btrim(p_judgement)) = 0 then
    raise exception 'judgement must not be blank' using errcode='check_violation';
  end if;
  if char_length(p_judgement) > 300 then
    raise exception 'judgement exceeds 300 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_restatement, '')) > 300 then
    raise exception 'restatement exceeds 300 characters' using errcode='check_violation';
  end if;
end; $$;

create or replace function public.dbt_judgements_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.dbt_judgements_guard(new.judgement, new.restatement);
  insert into public.dbt_judgements_data (
    id, user_id, judgement_enc, restatement_enc, valence,
    created_at, created_offset_minutes, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(new.judgement),
    app.encrypt_text(coalesce(new.restatement, '')),
    coalesce(new.valence, 'negative'),
    coalesce(new.created_at, timezone('utc', now())), new.created_offset_minutes,
    timezone('utc', now()))
  returning id, user_id, valence, created_at, updated_at
    into new.id, new.user_id, new.valence, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists dbt_judgements_ins on public.dbt_judgements;
create trigger dbt_judgements_ins instead of insert on public.dbt_judgements
  for each row execute function public.dbt_judgements_ins();

create or replace function public.dbt_judgements_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.dbt_judgements_guard(new.judgement, new.restatement);
  update public.dbt_judgements_data set
    judgement_enc          = app.encrypt_text(new.judgement),
    restatement_enc        = app.encrypt_text(coalesce(new.restatement, '')),
    valence                = new.valence,
    created_at             = new.created_at,
    created_offset_minutes = new.created_offset_minutes
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $$;
drop trigger if exists dbt_judgements_upd on public.dbt_judgements;
create trigger dbt_judgements_upd instead of update on public.dbt_judgements
  for each row execute function public.dbt_judgements_upd();

create or replace function public.dbt_judgements_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.dbt_judgements_data where id = old.id;
  return old;
end; $$;
drop trigger if exists dbt_judgements_del on public.dbt_judgements;
create trigger dbt_judgements_del instead of delete on public.dbt_judgements
  for each row execute function public.dbt_judgements_del();

grant select, insert, update, delete on public.dbt_judgements to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. dbt_emotion_records - six parts from what happened to what came after
-- ═══════════════════════════════════════════════════════════════════════════════
-- Emotion ids are plaintext arrays on the check-in's id space (a custom emotion's id
-- is opaque `custom_<ts>`; its name lives on the encrypted emotion_preferences row).
-- Body sensations are the check-in's comma-joined free-text chips, so encrypted.
-- No rating column of any kind, no date-of-incident (the record's day is the day it
-- was written), no portrait fields (#1988).

create table if not exists public.dbt_emotion_records_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  what_happened_enc bytea,
  meaning_enc bytea,
  body_sensations_enc bytea,
  urges_enc bytea,
  did_and_said_enc bytea,
  afterwards_enc bytea,
  primary_emotions text[] not null,
  secondary_emotions text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  created_offset_minutes smallint,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint dbt_emotion_records_data_what_happened_enc_size check (octet_length(what_happened_enc) <= 131072),
  constraint dbt_emotion_records_data_meaning_enc_size check (octet_length(meaning_enc) <= 131072),
  constraint dbt_emotion_records_data_body_sensations_enc_size check (octet_length(body_sensations_enc) <= 131072),
  constraint dbt_emotion_records_data_urges_enc_size check (octet_length(urges_enc) <= 131072),
  constraint dbt_emotion_records_data_did_and_said_enc_size check (octet_length(did_and_said_enc) <= 131072),
  constraint dbt_emotion_records_data_afterwards_enc_size check (octet_length(afterwards_enc) <= 131072),
  constraint dbt_emotion_records_data_primary_emotions_present
    check (cardinality(primary_emotions) between 1 and 30),
  constraint dbt_emotion_records_data_secondary_emotions_cap
    check (cardinality(secondary_emotions) <= 30),
  constraint dbt_emotion_records_data_created_offset_range
    check (created_offset_minutes between -840 and 840)
);

create index if not exists dbt_emotion_records_data_user_created_idx
  on public.dbt_emotion_records_data (user_id, created_at desc);

drop trigger if exists set_dbt_emotion_records_updated_at on public.dbt_emotion_records_data;
create trigger set_dbt_emotion_records_updated_at
before update on public.dbt_emotion_records_data
for each row execute function public.set_current_timestamp_updated_at();

alter table public.dbt_emotion_records_data enable row level security;

drop policy if exists dbt_emotion_records_manage_own on public.dbt_emotion_records_data;
create policy dbt_emotion_records_manage_own on public.dbt_emotion_records_data
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace view public.dbt_emotion_records with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(what_happened_enc) as what_happened,
         app.decrypt_text(meaning_enc) as meaning,
         app.decrypt_text(body_sensations_enc) as body_sensations,
         app.decrypt_text(urges_enc) as urges,
         app.decrypt_text(did_and_said_enc) as did_and_said,
         app.decrypt_text(afterwards_enc) as afterwards,
         primary_emotions,
         secondary_emotions,
         created_at,
         created_offset_minutes,
         updated_at
  from public.dbt_emotion_records_data;

create or replace function public.dbt_emotion_records_guard(
  p_what_happened text, p_meaning text, p_body_sensations text,
  p_urges text, p_did_and_said text, p_afterwards text) returns void
language plpgsql immutable set search_path = pg_catalog, public as $$
begin
  if p_what_happened is null or length(btrim(p_what_happened)) = 0 then
    raise exception 'what happened must not be blank' using errcode='check_violation';
  end if;
  if char_length(p_what_happened) > 4000 then
    raise exception 'what happened exceeds 4000 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_meaning, '')) > 4000 then
    raise exception 'meaning exceeds 4000 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_body_sensations, '')) > 4000 then
    raise exception 'body sensations exceed 4000 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_urges, '')) > 4000 then
    raise exception 'urges exceed 4000 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_did_and_said, '')) > 4000 then
    raise exception 'what I did exceeds 4000 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_afterwards, '')) > 4000 then
    raise exception 'afterwards exceeds 4000 characters' using errcode='check_violation';
  end if;
end; $$;

create or replace function public.dbt_emotion_records_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.dbt_emotion_records_guard(
    new.what_happened, new.meaning, new.body_sensations, new.urges, new.did_and_said, new.afterwards);
  insert into public.dbt_emotion_records_data (
    id, user_id, what_happened_enc, meaning_enc, body_sensations_enc, urges_enc,
    did_and_said_enc, afterwards_enc, primary_emotions, secondary_emotions,
    created_at, created_offset_minutes, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(new.what_happened),
    app.encrypt_text(coalesce(new.meaning, '')),
    app.encrypt_text(coalesce(new.body_sensations, '')),
    app.encrypt_text(coalesce(new.urges, '')),
    app.encrypt_text(coalesce(new.did_and_said, '')),
    app.encrypt_text(coalesce(new.afterwards, '')),
    new.primary_emotions, coalesce(new.secondary_emotions, '{}'),
    coalesce(new.created_at, timezone('utc', now())), new.created_offset_minutes,
    timezone('utc', now()))
  returning id, user_id, secondary_emotions, created_at, updated_at
    into new.id, new.user_id, new.secondary_emotions, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists dbt_emotion_records_ins on public.dbt_emotion_records;
create trigger dbt_emotion_records_ins instead of insert on public.dbt_emotion_records
  for each row execute function public.dbt_emotion_records_ins();

create or replace function public.dbt_emotion_records_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.dbt_emotion_records_guard(
    new.what_happened, new.meaning, new.body_sensations, new.urges, new.did_and_said, new.afterwards);
  update public.dbt_emotion_records_data set
    what_happened_enc      = app.encrypt_text(new.what_happened),
    meaning_enc            = app.encrypt_text(coalesce(new.meaning, '')),
    body_sensations_enc    = app.encrypt_text(coalesce(new.body_sensations, '')),
    urges_enc              = app.encrypt_text(coalesce(new.urges, '')),
    did_and_said_enc       = app.encrypt_text(coalesce(new.did_and_said, '')),
    afterwards_enc         = app.encrypt_text(coalesce(new.afterwards, '')),
    primary_emotions       = new.primary_emotions,
    secondary_emotions     = coalesce(new.secondary_emotions, '{}'),
    created_at             = new.created_at,
    created_offset_minutes = new.created_offset_minutes
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $$;
drop trigger if exists dbt_emotion_records_upd on public.dbt_emotion_records;
create trigger dbt_emotion_records_upd instead of update on public.dbt_emotion_records
  for each row execute function public.dbt_emotion_records_upd();

create or replace function public.dbt_emotion_records_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.dbt_emotion_records_data where id = old.id;
  return old;
end; $$;
drop trigger if exists dbt_emotion_records_del on public.dbt_emotion_records;
create trigger dbt_emotion_records_del instead of delete on public.dbt_emotion_records
  for each row execute function public.dbt_emotion_records_del();

grant select, insert, update, delete on public.dbt_emotion_records to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. dbt_opposite_action_plans - an open plan closed from its detail
-- ═══════════════════════════════════════════════════════════════════════════════
-- The Activities shape (#1988): `done_at` is null while open, and the DONE day is
-- the record's day for the programme, routines and Looking back - an open plan
-- marks no day. No timer (a timer implies a required duration): `hold_for` is text.

create table if not exists public.dbt_opposite_action_plans_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  emotion text not null,
  pull_enc bytea,
  opposite_action_enc bytea,
  hold_for_enc bytea,
  what_shifted_enc bytea,
  created_at timestamptz not null default timezone('utc', now()),
  created_offset_minutes smallint,
  done_at timestamptz,
  done_offset_minutes smallint,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint dbt_opposite_action_plans_data_emotion_present check (length(btrim(emotion)) between 1 and 64),
  constraint dbt_opposite_action_plans_data_pull_enc_size check (octet_length(pull_enc) <= 131072),
  constraint dbt_opposite_action_plans_data_opposite_action_enc_size check (octet_length(opposite_action_enc) <= 131072),
  constraint dbt_opposite_action_plans_data_hold_for_enc_size check (octet_length(hold_for_enc) <= 131072),
  constraint dbt_opposite_action_plans_data_what_shifted_enc_size check (octet_length(what_shifted_enc) <= 131072),
  constraint dbt_opposite_action_plans_data_created_offset_range
    check (created_offset_minutes between -840 and 840),
  constraint dbt_opposite_action_plans_data_done_offset_range
    check (done_offset_minutes between -840 and 840)
);

create index if not exists dbt_opposite_action_plans_data_user_created_idx
  on public.dbt_opposite_action_plans_data (user_id, created_at desc);

drop trigger if exists set_dbt_opposite_action_plans_updated_at on public.dbt_opposite_action_plans_data;
create trigger set_dbt_opposite_action_plans_updated_at
before update on public.dbt_opposite_action_plans_data
for each row execute function public.set_current_timestamp_updated_at();

alter table public.dbt_opposite_action_plans_data enable row level security;

drop policy if exists dbt_opposite_action_plans_manage_own on public.dbt_opposite_action_plans_data;
create policy dbt_opposite_action_plans_manage_own on public.dbt_opposite_action_plans_data
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace view public.dbt_opposite_action_plans with (security_invoker = true) as
  select id,
         user_id,
         emotion,
         app.decrypt_text(pull_enc) as pull,
         app.decrypt_text(opposite_action_enc) as opposite_action,
         app.decrypt_text(hold_for_enc) as hold_for,
         app.decrypt_text(what_shifted_enc) as what_shifted,
         created_at,
         created_offset_minutes,
         done_at,
         done_offset_minutes,
         updated_at
  from public.dbt_opposite_action_plans_data;

create or replace function public.dbt_opposite_action_plans_guard(
  p_pull text, p_opposite_action text, p_hold_for text, p_what_shifted text) returns void
language plpgsql immutable set search_path = pg_catalog, public as $$
begin
  if p_pull is null or length(btrim(p_pull)) = 0 then
    raise exception 'the pull must not be blank' using errcode='check_violation';
  end if;
  if char_length(p_pull) > 500 then
    raise exception 'the pull exceeds 500 characters' using errcode='check_violation';
  end if;
  if p_opposite_action is null or length(btrim(p_opposite_action)) = 0 then
    raise exception 'the opposite action must not be blank' using errcode='check_violation';
  end if;
  if char_length(p_opposite_action) > 500 then
    raise exception 'the opposite action exceeds 500 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_hold_for, '')) > 120 then
    raise exception 'hold for exceeds 120 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_what_shifted, '')) > 1000 then
    raise exception 'what shifted exceeds 1000 characters' using errcode='check_violation';
  end if;
end; $$;

create or replace function public.dbt_opposite_action_plans_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.dbt_opposite_action_plans_guard(new.pull, new.opposite_action, new.hold_for, new.what_shifted);
  insert into public.dbt_opposite_action_plans_data (
    id, user_id, emotion, pull_enc, opposite_action_enc, hold_for_enc, what_shifted_enc,
    created_at, created_offset_minutes, done_at, done_offset_minutes, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    new.emotion,
    app.encrypt_text(new.pull),
    app.encrypt_text(new.opposite_action),
    app.encrypt_text(coalesce(new.hold_for, '')),
    app.encrypt_text(coalesce(new.what_shifted, '')),
    coalesce(new.created_at, timezone('utc', now())), new.created_offset_minutes,
    new.done_at, new.done_offset_minutes,
    timezone('utc', now()))
  returning id, user_id, created_at, updated_at
    into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists dbt_opposite_action_plans_ins on public.dbt_opposite_action_plans;
create trigger dbt_opposite_action_plans_ins instead of insert on public.dbt_opposite_action_plans
  for each row execute function public.dbt_opposite_action_plans_ins();

create or replace function public.dbt_opposite_action_plans_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.dbt_opposite_action_plans_guard(new.pull, new.opposite_action, new.hold_for, new.what_shifted);
  update public.dbt_opposite_action_plans_data set
    emotion                = new.emotion,
    pull_enc               = app.encrypt_text(new.pull),
    opposite_action_enc    = app.encrypt_text(new.opposite_action),
    hold_for_enc           = app.encrypt_text(coalesce(new.hold_for, '')),
    what_shifted_enc       = app.encrypt_text(coalesce(new.what_shifted, '')),
    created_at             = new.created_at,
    created_offset_minutes = new.created_offset_minutes,
    done_at                = new.done_at,
    done_offset_minutes    = new.done_offset_minutes
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $$;
drop trigger if exists dbt_opposite_action_plans_upd on public.dbt_opposite_action_plans;
create trigger dbt_opposite_action_plans_upd instead of update on public.dbt_opposite_action_plans
  for each row execute function public.dbt_opposite_action_plans_upd();

create or replace function public.dbt_opposite_action_plans_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.dbt_opposite_action_plans_data where id = old.id;
  return old;
end; $$;
drop trigger if exists dbt_opposite_action_plans_del on public.dbt_opposite_action_plans;
create trigger dbt_opposite_action_plans_del instead of delete on public.dbt_opposite_action_plans
  for each row execute function public.dbt_opposite_action_plans_del();

grant select, insert, update, delete on public.dbt_opposite_action_plans to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. dbt_scripts - the four lines, written before a conversation, done from the card
-- ═══════════════════════════════════════════════════════════════════════════════
-- `difficulty` (0–100) is read by the list's order only - the list IS the ladder
-- (#1989) - and by nothing else. `when_where` is text, never a date type, so nothing
-- can become overdue. No `who`: nothing structured about another person.

create table if not exists public.dbt_scripts_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  situation_enc bytea,
  want_changed text,
  i_think_enc bytea,
  emotion text,
  i_feel_enc bytea,
  i_want_enc bytea,
  self_care_enc bytea,
  difficulty smallint,
  when_where_enc bytea,
  how_it_went_enc bytea,
  created_at timestamptz not null default timezone('utc', now()),
  created_offset_minutes smallint,
  done_at timestamptz,
  done_offset_minutes smallint,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint dbt_scripts_data_situation_enc_size check (octet_length(situation_enc) <= 131072),
  constraint dbt_scripts_data_i_think_enc_size check (octet_length(i_think_enc) <= 131072),
  constraint dbt_scripts_data_i_feel_enc_size check (octet_length(i_feel_enc) <= 131072),
  constraint dbt_scripts_data_i_want_enc_size check (octet_length(i_want_enc) <= 131072),
  constraint dbt_scripts_data_self_care_enc_size check (octet_length(self_care_enc) <= 131072),
  constraint dbt_scripts_data_when_where_enc_size check (octet_length(when_where_enc) <= 131072),
  constraint dbt_scripts_data_how_it_went_enc_size check (octet_length(how_it_went_enc) <= 131072),
  constraint dbt_scripts_data_want_changed_known
    check (want_changed is null or want_changed in ('moreOf', 'lessOf', 'stop', 'start')),
  constraint dbt_scripts_data_emotion_length check (emotion is null or length(btrim(emotion)) between 1 and 64),
  constraint dbt_scripts_data_difficulty_range check (difficulty is null or difficulty between 0 and 100),
  constraint dbt_scripts_data_created_offset_range
    check (created_offset_minutes between -840 and 840),
  constraint dbt_scripts_data_done_offset_range
    check (done_offset_minutes between -840 and 840)
);

create index if not exists dbt_scripts_data_user_created_idx
  on public.dbt_scripts_data (user_id, created_at desc);

drop trigger if exists set_dbt_scripts_updated_at on public.dbt_scripts_data;
create trigger set_dbt_scripts_updated_at
before update on public.dbt_scripts_data
for each row execute function public.set_current_timestamp_updated_at();

alter table public.dbt_scripts_data enable row level security;

drop policy if exists dbt_scripts_manage_own on public.dbt_scripts_data;
create policy dbt_scripts_manage_own on public.dbt_scripts_data
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace view public.dbt_scripts with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(situation_enc) as situation,
         want_changed,
         app.decrypt_text(i_think_enc) as i_think,
         emotion,
         app.decrypt_text(i_feel_enc) as i_feel,
         app.decrypt_text(i_want_enc) as i_want,
         app.decrypt_text(self_care_enc) as self_care,
         difficulty,
         app.decrypt_text(when_where_enc) as when_where,
         app.decrypt_text(how_it_went_enc) as how_it_went,
         created_at,
         created_offset_minutes,
         done_at,
         done_offset_minutes,
         updated_at
  from public.dbt_scripts_data;

create or replace function public.dbt_scripts_guard(
  p_situation text, p_i_think text, p_i_feel text, p_i_want text,
  p_self_care text, p_when_where text, p_how_it_went text) returns void
language plpgsql immutable set search_path = pg_catalog, public as $$
begin
  if p_situation is null or length(btrim(p_situation)) = 0 then
    raise exception 'situation must not be blank' using errcode='check_violation';
  end if;
  if char_length(p_situation) > 2000 then
    raise exception 'situation exceeds 2000 characters' using errcode='check_violation';
  end if;
  if p_i_think is null or length(btrim(p_i_think)) = 0 then
    raise exception 'I think must not be blank' using errcode='check_violation';
  end if;
  if char_length(p_i_think) > 1000 then
    raise exception 'I think exceeds 1000 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_i_feel, '')) > 1000 then
    raise exception 'I feel exceeds 1000 characters' using errcode='check_violation';
  end if;
  if p_i_want is null or length(btrim(p_i_want)) = 0 then
    raise exception 'I want must not be blank' using errcode='check_violation';
  end if;
  if char_length(p_i_want) > 1000 then
    raise exception 'I want exceeds 1000 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_self_care, '')) > 1000 then
    raise exception 'self care exceeds 1000 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_when_where, '')) > 300 then
    raise exception 'when and where exceeds 300 characters' using errcode='check_violation';
  end if;
  if char_length(coalesce(p_how_it_went, '')) > 1000 then
    raise exception 'how it went exceeds 1000 characters' using errcode='check_violation';
  end if;
end; $$;

create or replace function public.dbt_scripts_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.dbt_scripts_guard(
    new.situation, new.i_think, new.i_feel, new.i_want, new.self_care, new.when_where, new.how_it_went);
  insert into public.dbt_scripts_data (
    id, user_id, situation_enc, want_changed, i_think_enc, emotion, i_feel_enc, i_want_enc,
    self_care_enc, difficulty, when_where_enc, how_it_went_enc,
    created_at, created_offset_minutes, done_at, done_offset_minutes, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(new.situation),
    new.want_changed,
    app.encrypt_text(new.i_think),
    new.emotion,
    app.encrypt_text(coalesce(new.i_feel, '')),
    app.encrypt_text(new.i_want),
    app.encrypt_text(coalesce(new.self_care, '')),
    new.difficulty,
    app.encrypt_text(coalesce(new.when_where, '')),
    app.encrypt_text(coalesce(new.how_it_went, '')),
    coalesce(new.created_at, timezone('utc', now())), new.created_offset_minutes,
    new.done_at, new.done_offset_minutes,
    timezone('utc', now()))
  returning id, user_id, created_at, updated_at
    into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists dbt_scripts_ins on public.dbt_scripts;
create trigger dbt_scripts_ins instead of insert on public.dbt_scripts
  for each row execute function public.dbt_scripts_ins();

create or replace function public.dbt_scripts_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.dbt_scripts_guard(
    new.situation, new.i_think, new.i_feel, new.i_want, new.self_care, new.when_where, new.how_it_went);
  update public.dbt_scripts_data set
    situation_enc          = app.encrypt_text(new.situation),
    want_changed           = new.want_changed,
    i_think_enc            = app.encrypt_text(new.i_think),
    emotion                = new.emotion,
    i_feel_enc             = app.encrypt_text(coalesce(new.i_feel, '')),
    i_want_enc             = app.encrypt_text(new.i_want),
    self_care_enc          = app.encrypt_text(coalesce(new.self_care, '')),
    difficulty             = new.difficulty,
    when_where_enc         = app.encrypt_text(coalesce(new.when_where, '')),
    how_it_went_enc        = app.encrypt_text(coalesce(new.how_it_went, '')),
    created_at             = new.created_at,
    created_offset_minutes = new.created_offset_minutes,
    done_at                = new.done_at,
    done_offset_minutes    = new.done_offset_minutes
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $$;
drop trigger if exists dbt_scripts_upd on public.dbt_scripts;
create trigger dbt_scripts_upd instead of update on public.dbt_scripts
  for each row execute function public.dbt_scripts_upd();

create or replace function public.dbt_scripts_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.dbt_scripts_data where id = old.id;
  return old;
end; $$;
drop trigger if exists dbt_scripts_del on public.dbt_scripts;
create trigger dbt_scripts_del instead of delete on public.dbt_scripts
  for each row execute function public.dbt_scripts_del();

grant select, insert, update, delete on public.dbt_scripts to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. user_preferences - six programme columns and one reminder quadruple (#1990)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Mirrors ACT's six (20260550, 20260556, 20260580) and its reminder set (20260535).
-- No encrypted singleton: `act_program_state` is ACT's ONBOARDING state, and DBT
-- has no onboarding wizard (decision 12). No server arm on
-- `program_widget_task_status` either - its guard keeps raising on 'dbt' on purpose,
-- because the launcher is the RPC's only client and decision 13 excludes it.

alter table public.user_preferences
  add column if not exists dbt_program_started_at timestamptz,
  add column if not exists dbt_program_completed_at timestamptz,
  add column if not exists dbt_program_prompt_dismissed_at timestamptz,
  add column if not exists dbt_program_phase_index integer not null default 0,
  add column if not exists dbt_program_phase_started_at timestamptz,
  add column if not exists dbt_graduation_dismissed_at timestamptz,
  add column if not exists dbt_reminders_enabled boolean not null default false,
  add column if not exists dbt_reminder_hour int not null default 19
    check (dbt_reminder_hour between 0 and 23),
  add column if not exists dbt_reminder_minute int not null default 0
    check (dbt_reminder_minute between 0 and 59),
  add column if not exists dbt_reminder_timezone varchar;

-- Per-target dedupe keys, on both push channels (20260542, 20260583).
alter table public.web_push_subscriptions
  add column if not exists last_dbt_reminder_key text;
alter table public.device_push_tokens
  add column if not exists last_dbt_reminder_key text;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. record_days - the ten sources become sixteen (#1904, #1992 §7)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Redeclared whole from 20260907000000 with six legs added. Every DBT table names
-- its own day, which is the rule that admits a source. Reads the BASE tables, never
-- the decrypting views (#706). The coping plan is out: it has no day. An open
-- opposite-action plan marks no day - its done day is the fact (#1988), exactly as
-- an activity contributes completions only.

create or replace function public.record_days(p_fallback_offset_minutes integer)
returns setof text
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_fallback_offset_minutes is null
     or p_fallback_offset_minutes < -840
     or p_fallback_offset_minutes > 840 then
    raise exception 'Invalid fallback UTC offset'
      using errcode = 'invalid_parameter_value';
  end if;

  return query
  with marked as (
    select coalesce(
             public.occurrence_day_key(mood.logged_at, mood.logged_offset_minutes),
             public.occurrence_day_key(mood.logged_at, p_fallback_offset_minutes)
           ) as day_key
      from public.mood_logs_data as mood
     where mood.user_id = uid
    union
    select coalesce(
             public.occurrence_day_key(gratitude.logged_at, gratitude.logged_offset_minutes),
             public.occurrence_day_key(gratitude.logged_at, p_fallback_offset_minutes)
           )
      from public.gratitude_entries_data as gratitude
     where gratitude.user_id = uid
    union
    select coalesce(
             public.occurrence_day_key(journal.occurred_at, journal.occurred_offset_minutes),
             public.occurrence_day_key(journal.occurred_at, p_fallback_offset_minutes)
           )
      from public.journal_entries_data as journal
     where journal.user_id = uid
    union
    select case
             when sleep.window_enc is not null then to_char(sleep.entry_day, 'YYYY-MM-DD')
             else coalesce(
                    public.occurrence_day_key(sleep.logged_at, sleep.logged_offset_minutes),
                    public.occurrence_day_key(sleep.logged_at, p_fallback_offset_minutes)
                  )
           end
      from public.sleep_logs_data as sleep
     where sleep.user_id = uid
    union
    select coalesce(
             public.occurrence_day_key(meditation.completed_at, meditation.completed_offset_minutes),
             public.occurrence_day_key(meditation.completed_at, p_fallback_offset_minutes)
           )
      from public.meditation_sessions as meditation
     where meditation.user_id = uid
    union
    select coalesce(
             public.occurrence_day_key(mindfulness.completed_at, mindfulness.completed_offset_minutes),
             public.occurrence_day_key(mindfulness.completed_at, p_fallback_offset_minutes)
           )
      from public.mindfulness_sessions_data as mindfulness
     where mindfulness.user_id = uid
    union
    select coalesce(
             public.occurrence_day_key(activity.completed_at, activity.completed_offset_minutes),
             public.occurrence_day_key(activity.completed_at, p_fallback_offset_minutes)
           )
      from public.activity_logs_data as activity
     where activity.user_id = uid
       and activity.completed_at is not null
    union
    select coalesce(
             public.occurrence_day_key(thought.created_at, thought.created_offset_minutes),
             public.occurrence_day_key(thought.created_at, p_fallback_offset_minutes)
           )
      from public.thought_records_data as thought
     where thought.user_id = uid
       and thought.archived_at is null
    union
    select to_char(habit.logged_on, 'YYYY-MM-DD')
      from public.habit_logs_data as habit
     where habit.user_id = uid
    union
    select to_char(self_care.log_date, 'YYYY-MM-DD')
      from public.self_care_logs_data as self_care
     where self_care.user_id = uid
    -- === DBT (#1980): six dated tables, the coping plan out ===
    union
    select coalesce(
             public.occurrence_day_key(dbt_session.completed_at, dbt_session.completed_offset_minutes),
             public.occurrence_day_key(dbt_session.completed_at, p_fallback_offset_minutes)
           )
      from public.dbt_sessions_data as dbt_session
     where dbt_session.user_id = uid
    union
    select coalesce(
             public.occurrence_day_key(wise_mind.created_at, wise_mind.created_offset_minutes),
             public.occurrence_day_key(wise_mind.created_at, p_fallback_offset_minutes)
           )
      from public.dbt_wise_mind_checkins_data as wise_mind
     where wise_mind.user_id = uid
    union
    select coalesce(
             public.occurrence_day_key(judgement.created_at, judgement.created_offset_minutes),
             public.occurrence_day_key(judgement.created_at, p_fallback_offset_minutes)
           )
      from public.dbt_judgements_data as judgement
     where judgement.user_id = uid
    union
    select coalesce(
             public.occurrence_day_key(emotion_record.created_at, emotion_record.created_offset_minutes),
             public.occurrence_day_key(emotion_record.created_at, p_fallback_offset_minutes)
           )
      from public.dbt_emotion_records_data as emotion_record
     where emotion_record.user_id = uid
    union
    -- An open plan is a plain row until the person closes it; only the done day
    -- is a record of doing.
    select coalesce(
             public.occurrence_day_key(opposite.done_at, opposite.done_offset_minutes),
             public.occurrence_day_key(opposite.done_at, p_fallback_offset_minutes)
           )
      from public.dbt_opposite_action_plans_data as opposite
     where opposite.user_id = uid
       and opposite.done_at is not null
    union
    -- Writing the script is the skill (#1989), so the written day marks; the done
    -- day marks too, as the programme's second fact.
    select coalesce(
             public.occurrence_day_key(script.created_at, script.created_offset_minutes),
             public.occurrence_day_key(script.created_at, p_fallback_offset_minutes)
           )
      from public.dbt_scripts_data as script
     where script.user_id = uid
    union
    select coalesce(
             public.occurrence_day_key(script_done.done_at, script_done.done_offset_minutes),
             public.occurrence_day_key(script_done.done_at, p_fallback_offset_minutes)
           )
      from public.dbt_scripts_data as script_done
     where script_done.user_id = uid
       and script_done.done_at is not null
  )
  select marked.day_key
    from marked
   where marked.day_key is not null
   order by 1;
end;
$$;

revoke all on function public.record_days(integer) from public;
revoke execute on function public.record_days(integer) from anon;
grant execute on function public.record_days(integer) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. export_user_data - redeclared from 20260909000000 plus this module's columns
-- ═══════════════════════════════════════════════════════════════════════════════
-- The seven DBT tables read through their decrypting views (one camelCase key each);
-- the six programme columns join the preferences projection beside ACT's; the
-- reminder quadruple joins the reminder merge. `last_dbt_reminder_key` is covered
-- by the README's `*.last_*_reminder_key*` withheld rule; nothing else is withheld.
-- The declaration below differs from 20260909000000's by exactly those additions
-- (scripts/…; diffed on the way in).

create or replace function public.export_user_data()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
  uid uuid := auth.uid();
  reminder_prefs jsonb;
  funnel_prefs jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- === base ===
  result := json_build_object(
    'exportDate', timezone('utc', now()),
    'profile', (
      select row_to_json(p)
      from (
        select
          email,
          display_name,
          avatar_url,
          avatar_source,
          avatar_updated_at,
          created_at,
          updated_at
        from public.profiles
        where user_id = uid
      ) p
    ),
    'preferences', (
      select row_to_json(pr)
      from (
        select
          enabled_modules,
          reminder_consent,
          reminder_consent_updated_at,
          cbt_reminders_enabled,
          cbt_reminder_hour,
          cbt_reminder_minute,
          cbt_reminder_timezone,
          app_onboarding_completed,
          cbt_onboarding_completed,
          privacy_policy_accepted_at,
          terms_accepted_at,
          policy_version_accepted,
          age_floor_met,
          age_attested_country,
          age_attested_at,
          health_data_consent_at,
          cookie_consent,
          language,
          email_verified,
          initial_concerns,
          active_strategies,
          reminder_prompted_tools,
          starter_routine_offered,
          theme,
          notifications_enabled_global,
          ambient_sound_id,
          ambient_volume,
          breath_sound_id,
          breath_volume,
          breathing_cycles,
          last_breathing_pattern_id,
          meditation_interval_bell_minutes,
          bell_volume,
          meditation_bell_at_half,
          meditation_ambient_sound_id,
          meditation_ambient_volume,
          haptic_cues,
          emotions_seeded,
          shown_button_tours,
          mood_onboarding_completed,
          gratitude_onboarding_completed,
          journal_onboarding_completed,
          sleep_onboarding_completed,
          habits_onboarding_completed,
          meditation_onboarding_completed,
          meditation_info_completed,
          mindfulness_onboarding_completed,
          grounding_onboarding_completed,
          act_onboarding_completed,
          cbt_wizard_completed,
          cbt_program_started_at,
          cbt_program_phase_index,
          cbt_program_phase_started_at,
          cbt_program_completed_at,
          cbt_program_prompt_dismissed_at,
          cbt_graduation_dismissed_at,
          act_program_started_at,
          act_program_phase_index,
          act_program_phase_started_at,
          act_program_completed_at,
          act_program_prompt_dismissed_at,
          act_graduation_dismissed_at,
          dbt_program_started_at,
          dbt_program_phase_index,
          dbt_program_phase_started_at,
          dbt_program_completed_at,
          dbt_program_prompt_dismissed_at,
          dbt_graduation_dismissed_at,
          created_at,
          updated_at
        from public.user_preferences
        where user_id = uid
      ) pr
    ),
    'webPushSubscriptions', (
      select coalesce(json_agg(row_to_json(wps)), '[]'::json)
      from (
        select
          endpoint,
          user_agent,
          time_zone,
          enabled,
          last_success_at,
          last_failure_at,
          failure_count,
          last_reminder_key,
          created_at,
          updated_at
        from public.web_push_subscriptions
        where user_id = uid
        order by created_at asc
      ) wps
    ),
    'thoughtRecords', (
      select coalesce(json_agg(row_to_json(tr)), '[]'::json)
      from (
        select
          id,
          situation,
          nats,
          emotions,
          emotion_intensity_before,
          distortions,
          evidence_for,
          evidence_against,
          balanced_thought,
          emotion_intensity_after,
          outcome_notes,
          belief_after,
          archived_at,
          created_at,
          updated_at,
          created_offset_minutes
        from public.thought_records
        where user_id = uid
        order by created_at asc
      ) tr
    ),
    'goals', (
      select coalesce(json_agg(row_to_json(g)), '[]'::json)
      from (
        select
          id,
          title,
          description,
          life_domain,
          goal_type,
          target_date,
          status,
          created_at,
          updated_at,
          value_key
        from public.goals
        where user_id = uid
        order by created_at asc
      ) g
    ),
    'milestones', (
      select coalesce(json_agg(row_to_json(m)), '[]'::json)
      from (
        select
          id,
          goal_id,
          description,
          target_date,
          completed_at,
          created_at,
          updated_at
        from public.milestones
        where user_id = uid
        order by created_at asc
      ) m
    ),
    'valuesProfiles', (
      select coalesce(json_agg(row_to_json(vp)), '[]'::json)
      from (
        select
          id,
          personal_values,
          priority_values,
          created_at,
          updated_at
        from public.values_profile
        where user_id = uid
        order by created_at asc
      ) vp
    ),
    'activityLogs', (
      select coalesce(json_agg(row_to_json(al)), '[]'::json)
      from (
        select
          id,
          activity_name,
          category,
          pace_category,
          scheduled_at,
          completed_at,
          mood_before,
          mood_after,
          notes,
          created_at,
          updated_at,
          completed_offset_minutes,
          scheduled_offset_minutes
        from public.activity_logs
        where user_id = uid
        order by created_at asc
      ) al
    ),
    'moodLogs', (
      select coalesce(json_agg(row_to_json(ml)), '[]'::json)
      from (
        select
          id,
          mood_score,
          emotions,
          notes,
          situation,
          thoughts,
          behaviours,
          bodily_sensations,
          linked_strategy,
          logged_at,
          created_at,
          logged_offset_minutes
        from public.mood_logs
        where user_id = uid
        order by logged_at asc
      ) ml
    ),
    'coreBeliefs', (
      select coalesce(json_agg(row_to_json(cb)), '[]'::json)
      from (
        select
          id,
          belief_statement,
          triggering_situations,
          evidence_for,
          evidence_against,
          alternative_belief,
          original_belief_strength,
          alternative_belief_strength,
          reinforcement_plan,
          next_review_date,
          created_at,
          updated_at
        from public.core_beliefs
        where user_id = uid
        order by created_at asc
      ) cb
    ),
    'exposureHierarchies', (
      select coalesce(json_agg(row_to_json(eh)), '[]'::json)
      from (
        select
          id,
          title,
          anxiety_type,
          created_at,
          updated_at
        from public.exposure_hierarchies
        where user_id = uid
        order by created_at asc
      ) eh
    ),
    'exposureItems', (
      select coalesce(json_agg(row_to_json(ei)), '[]'::json)
      from (
        select
          id,
          hierarchy_id,
          description,
          suds_rating,
          completed_at,
          created_at,
          updated_at
        from public.exposure_items
        where user_id = uid
        order by created_at asc
      ) ei
    ),
    'exposureSessions', (
      select coalesce(json_agg(row_to_json(es)), '[]'::json)
      from (
        select
          id,
          exposure_item_id,
          pre_suds,
          post_suds,
          duration_minutes,
          safety_behaviors_used,
          safety_behavior_description,
          notes,
          completed_at,
          created_at
        from public.exposure_sessions
        where user_id = uid
        order by created_at asc
      ) es
    ),
    'worryEntries', (
      select coalesce(json_agg(row_to_json(we)), '[]'::json)
      from (
        select
          id,
          worry_statement,
          worry_category,
          probability_estimate,
          evidence_for,
          evidence_against,
          coping_statement,
          action_steps,
          resolved,
          created_at,
          updated_at
        from public.worry_entries
        where user_id = uid
        order by created_at asc
      ) we
    ),
    'mindfulnessSessions', (
      select coalesce(json_agg(row_to_json(ms)), '[]'::json)
      from (
        select
          id,
          exercise_name,
          duration_minutes,
          reflection,
          mood_after,
          feeling_after,
          cycles,
          duration_seconds,
          completed_at,
          created_at,
          completed_offset_minutes,
          steps_completed,
          steps_total
        from public.mindfulness_sessions
        where user_id = uid
        order by completed_at asc
      ) ms
    ),
    'procrastinationTasks', (
      select coalesce(json_agg(row_to_json(pt)), '[]'::json)
      from (
        select
          id,
          task_description,
          avoidance_reason,
          fear_thought,
          challenged_thought,
          deadline,
          reward,
          status,
          created_at,
          updated_at
        from public.procrastination_tasks
        where user_id = uid
        order by created_at asc
      ) pt
    ),
    'taskSteps', (
      select coalesce(json_agg(row_to_json(ts)), '[]'::json)
      from (
        select
          id,
          task_id,
          description,
          estimated_minutes,
          completed_at,
          created_at,
          updated_at
        from public.task_steps
        where user_id = uid
        order by created_at asc
      ) ts
    ),
    'angerLogs', (
      select coalesce(json_agg(row_to_json(agl)), '[]'::json)
      from (
        select
          id,
          trigger_text,
          interpretation,
          arousal_level,
          urge,
          behavior_chosen,
          consequence,
          time_out_taken,
          alternative_interpretation,
          outcome_rating,
          notes,
          created_at,
          updated_at
        from public.anger_logs
        where user_id = uid
        order by created_at asc
      ) agl
    ),
    'selfCareLogs', (
      select coalesce(json_agg(row_to_json(scl)), '[]'::json)
      from (
        select
          id,
          log_date,
          exercise_done,
          exercise_minutes,
          exercise_type,
          meals_structured,
          emotional_eating,
          social_connection_made,
          social_notes,
          meaningful_activity,
          self_criticism_noticed,
          self_compassion_note,
          created_at,
          updated_at
        from public.self_care_logs
        where user_id = uid
        order by log_date asc
      ) scl
    ),
    'recoveryPlans', (
      select coalesce(json_agg(row_to_json(rp)), '[]'::json)
      from (
        select
          id,
          recovery_keys,
          personal_slogan,
          strategy_integration_notes,
          maintenance_commitments,
          created_at,
          updated_at
        from public.recovery_plans
        where user_id = uid
        order by created_at asc
      ) rp
    ),
    'challengePlans', (
      select coalesce(json_agg(row_to_json(cp)), '[]'::json)
      from (
        select
          id,
          recovery_plan_id,
          challenge_description,
          coping_steps,
          created_at,
          updated_at
        from public.challenge_plans
        where user_id = uid
        order by created_at asc
      ) cp
    ),
    'journalEntries', (
      select coalesce(json_agg(row_to_json(je)), '[]'::json)
      from (
        select
          id,
          title,
          body,
          occurred_at,
          created_at,
          updated_at,
          occurred_offset_minutes
        from public.journal_entries
        where user_id = uid
        order by created_at asc
      ) je
    ),
    'sleepLogs', (
      -- The decrypted window payload nests as real JSON (start, end and both
      -- captured offsets — no stored user field may silently disappear from
      -- export, #800). The cast happens out here because the select below must
      -- stay bare identifiers for test/export-user-data-monotonic.test.ts.
      select coalesce(
        json_agg((to_jsonb(sl) - 'sleep_window')
                 || jsonb_build_object('sleep_window', sl.sleep_window::jsonb)),
        '[]'::json)
      from (
        select
          id,
          duration_minutes,
          quality,
          notes,
          logged_at,
          created_at,
          updated_at,
          logged_offset_minutes,
          entry_day,
          sleep_window
        from public.sleep_logs
        where user_id = uid
        order by logged_at asc
      ) sl
    )
  )::jsonb;

  -- === meditation / gratitude / habits ===
  result := result || jsonb_build_object(
    'meditationSessions', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
      from (
        select
          id,
          stage_at_session,
          duration_minutes,
          completed_at,
          created_at,
          mind_wandering_episodes,
          dullness_level,
          distraction_level,
          obstacle_tags,
          reflection,
          mood_after,
          technique_used,
          completed_offset_minutes
        from public.meditation_sessions
        where user_id = uid
        order by completed_at asc
      ) s
    ),
    'meditationProgramState', (
      select to_jsonb(p)
      from (
        select
          current_stage,
          assessed_stage,
          milestones_reached,
          onboarding_completed_at,
          last_session_at,
          preferred_duration_minutes,
          preferred_time_of_day,
          created_at,
          updated_at
        from public.meditation_program_state
        where user_id = uid
      ) p
    ),
    'stagePracticeNotes', (
      select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb)
      from (
        select
          id,
          stage,
          note,
          created_at,
          updated_at
        from public.stage_practice_notes
        where user_id = uid
        order by stage asc, updated_at asc
      ) n
    )
  );

  result := result || jsonb_build_object(
    'gratitudeEntries', (
      select coalesce(jsonb_agg(to_jsonb(ge)), '[]'::jsonb)
      from (
        select
          id,
          level,
          events,
          good_moment,
          miss_if_gone,
          hidden_good,
          item_1,
          item_2,
          item_3,
          item_4,
          item_5,
          life_item_1,
          life_item_2,
          life_item_3,
          note,
          starred,
          logged_at,
          created_at,
          updated_at,
          logged_offset_minutes
        from public.gratitude_entries
        where user_id = uid
        order by logged_at asc
      ) ge
    )
  );

  result := result || jsonb_build_object(
    'habits', (
      select coalesce(jsonb_agg(to_jsonb(h)), '[]'::jsonb)
      from (
        select
          id,
          name,
          kind,
          identity,
          cue_plan,
          stack_after,
          craving_pairing,
          two_minute_version,
          reward_note,
          cadence,
          custom_days,
          color,
          archived_at,
          created_at,
          updated_at
        from public.habits
        where user_id = uid
        order by created_at asc
      ) h
    ),
    'habitLogs', (
      select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb)
      from (
        select
          id,
          habit_id,
          logged_on,
          note,
          created_at,
          updated_at
        from public.habit_logs
        where user_id = uid
        order by logged_on asc, created_at asc
      ) l
    )
  );

  -- === emotion preferences ===
  result := result || jsonb_build_object(
    'emotionPreferences', (
      select coalesce(jsonb_agg(to_jsonb(ep)), '[]'::jsonb)
      from (
        select
          id,
          emotion_id,
          name,
          emoji,
          position,
          removed,
          is_custom,
          created_at,
          updated_at
        from public.emotion_preferences
        where user_id = uid
        order by position asc, created_at asc
      ) ep
    )
  );

  -- === ACT program state / logs ===
  result := result || jsonb_build_object(
    'actProgramState', (
      select to_jsonb(s)
      from (
        select
          active_principles,
          primary_concerns,
          myths_acknowledged,
          onboarding_completed_at,
          last_check_in_at,
          preferred_check_in_time,
          created_at,
          updated_at
        from public.act_program_state
        where user_id = uid
      ) s
    ),
    'actDefusionLogs', (
      select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
      from (
        select
          id, fused_thought, thought_category, fusion_level_before, technique_used,
          defused_version, fusion_level_after, notes, created_at, updated_at
        from public.act_defusion_logs
        where user_id = uid
        order by created_at asc
      ) d
    ),
    'actExpansionLogs', (
      select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb)
      from (
        select
          id, emotion, body_sensation, intensity_before, struggle_switch_on,
          discomfort_type, technique_used, intensity_after, notes, created_at, updated_at
        from public.act_expansion_logs
        where user_id = uid
        order by created_at asc
      ) e
    ),
    'actUrgeSurfLogs', (
      select coalesce(jsonb_agg(to_jsonb(u)), '[]'::jsonb)
      from (
        select
          id, urge_description, trigger, peak_intensity, surfing_notes,
          urge_acted_on, completed_at, created_at, updated_at
        from public.act_urge_surf_logs
        where user_id = uid
        order by created_at asc
      ) u
    ),
    'actConnectionLogs', (
      select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
      from (
        select
          id, technique, activity_context, notices_from_senses, duration_minutes,
          mood_after, notes, created_at, updated_at
        from public.act_connection_logs
        where user_id = uid
        order by created_at asc
      ) c
    ),
    'actObservingSelfSessions', (
      select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
      from (
        select
          id, technique_used, what_was_observed, duration_minutes, mood_after,
          notes, created_at, updated_at
        from public.act_observing_self_sessions
        where user_id = uid
        order by created_at asc
      ) o
    )
  );

  result := result || jsonb_build_object(
    'actValueEntries', (
      select coalesce(jsonb_agg(to_jsonb(v)), '[]'::jsonb)
      from (
        select
          id, life_domain, value_statement, importance_rating, current_alignment_rating,
          current_actions_note, desired_actions_note, barriers, created_at, updated_at
        from public.act_value_entries
        where user_id = uid
        order by life_domain asc
      ) v
    ),
    'actBullsEyeSnapshots', (
      select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
      from (
        select
          id, domain, alignment_rating, reviewed_at, created_at
        from public.act_bulls_eye_snapshots
        where user_id = uid
        order by reviewed_at asc
      ) b
    ),
    'actCommittedActions', (
      select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
      from (
        select
          id, life_domain, title, description, status, target_date, obstacles,
          created_at, updated_at
        from public.act_committed_actions
        where user_id = uid
        order by created_at asc
      ) a
    ),
    'actActionSteps', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
      from (
        select
          id, action_id, description, is_completed, completed_at, created_at, updated_at
        from public.act_action_steps
        where user_id = uid
        order by created_at asc
      ) s
    ),
    'actChoicePoints', (
      select coalesce(jsonb_agg(to_jsonb(cp)), '[]'::jsonb)
      from (
        select
          id, hooks, away_moves, toward_moves, notes, created_at, updated_at
        from public.act_choice_points
        where user_id = uid
        order by created_at asc
      ) cp
    )
  );

  result := result || jsonb_build_object(
    'routines', (
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
      from (
        select
          id, name, reminder_enabled, reminder_hour, reminder_minute,
          reminder_timezone, cadence, custom_days, created_at, updated_at
        from public.routines
        where user_id = uid
        order by created_at asc
      ) r
    ),
    'routineSteps', (
      select coalesce(jsonb_agg(to_jsonb(rs)), '[]'::jsonb)
      from (
        select
          id, routine_id, tool_id, position, created_at, updated_at
        from public.routine_steps
        where user_id = uid
        order by routine_id asc, position asc, created_at asc
      ) rs
    ),
    'widgetPreferences', (
      select coalesce(jsonb_agg(to_jsonb(wp)), '[]'::jsonb)
      from (
        select
          id, widget_id, position, created_at
        from public.widget_preferences
        where user_id = uid
        order by position asc
      ) wp
    ),
    'favorites', (
      select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
      from (
        select
          id, kind, key, created_at
        from public.favorites
        where user_id = uid
        order by created_at asc, kind asc, key asc
      ) f
    )
  );

  -- === DBT module (#1980): seven tables, read through the decrypting views ===
  result := result || jsonb_build_object(
    'dbtCopingPlans', (
      select coalesce(jsonb_agg(to_jsonb(cp)), '[]'::jsonb)
      from (
        select id, plan, created_at, updated_at
        from public.dbt_coping_plans
        where user_id = uid
        order by created_at asc
      ) cp
    ),
    'dbtSessions', (
      select coalesce(jsonb_agg(to_jsonb(ds)), '[]'::jsonb)
      from (
        select id, session_slug, variant, duration_seconds, completed_at,
          completed_offset_minutes, created_at, updated_at
        from public.dbt_sessions
        where user_id = uid
        order by completed_at asc
      ) ds
    ),
    'dbtWiseMindCheckins', (
      select coalesce(jsonb_agg(to_jsonb(wm)), '[]'::jsonb)
      from (
        select id, question, emotion_mind, reason, wise_mind, created_at,
          created_offset_minutes, updated_at
        from public.dbt_wise_mind_checkins
        where user_id = uid
        order by created_at asc
      ) wm
    ),
    'dbtJudgements', (
      select coalesce(jsonb_agg(to_jsonb(dj)), '[]'::jsonb)
      from (
        select id, judgement, restatement, valence, created_at,
          created_offset_minutes, updated_at
        from public.dbt_judgements
        where user_id = uid
        order by created_at asc
      ) dj
    ),
    'dbtEmotionRecords', (
      select coalesce(jsonb_agg(to_jsonb(er)), '[]'::jsonb)
      from (
        select id, what_happened, meaning, body_sensations, urges, did_and_said,
          afterwards, primary_emotions, secondary_emotions, created_at,
          created_offset_minutes, updated_at
        from public.dbt_emotion_records
        where user_id = uid
        order by created_at asc
      ) er
    ),
    'dbtOppositeActionPlans', (
      select coalesce(jsonb_agg(to_jsonb(oa)), '[]'::jsonb)
      from (
        select id, emotion, pull, opposite_action, hold_for, what_shifted, created_at,
          created_offset_minutes, done_at, done_offset_minutes, updated_at
        from public.dbt_opposite_action_plans
        where user_id = uid
        order by created_at asc
      ) oa
    ),
    'dbtScripts', (
      select coalesce(jsonb_agg(to_jsonb(sc)), '[]'::jsonb)
      from (
        select id, situation, want_changed, i_think, emotion, i_feel, i_want, self_care,
          difficulty, when_where, how_it_went, created_at, created_offset_minutes,
          done_at, done_offset_minutes, updated_at
        from public.dbt_scripts
        where user_id = uid
        order by created_at asc
      ) sc
    )
  );

  -- === reminder prefs merged into preferences ===
  select to_jsonb(p) into reminder_prefs
  from (
    select
      meditation_reminders_enabled, meditation_reminder_hour,
      meditation_reminder_minute, meditation_reminder_timezone,
      act_reminders_enabled, act_reminder_hour,
      act_reminder_minute, act_reminder_timezone,
      mood_reminders_enabled, mood_reminder_hour,
      mood_reminder_minute, mood_reminder_timezone,
      journal_reminders_enabled, journal_reminder_hour,
      journal_reminder_minute, journal_reminder_timezone,
      gratitude_reminders_enabled, gratitude_reminder_hour,
      gratitude_reminder_minute, gratitude_reminder_timezone,
      grounding_reminders_enabled, grounding_reminder_hour,
      grounding_reminder_minute, grounding_reminder_timezone,
      breathing_reminders_enabled, breathing_reminder_hour,
      breathing_reminder_minute, breathing_reminder_timezone,
      sleep_reminders_enabled, sleep_reminder_hour,
      sleep_reminder_minute, sleep_reminder_timezone,
      habits_reminders_enabled, habits_reminder_hour,
      habits_reminder_minute, habits_reminder_timezone,
      dbt_reminders_enabled, dbt_reminder_hour,
      dbt_reminder_minute, dbt_reminder_timezone
    from public.user_preferences
    where user_id = uid
  ) p;

  if reminder_prefs is not null then
    result := jsonb_set(
      result,
      '{preferences}',
      coalesce(result -> 'preferences', '{}'::jsonb) || reminder_prefs
    );
  end if;

  -- === device push tokens ===
  result := result || jsonb_build_object(
    'devicePushTokens', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from (
        select id, platform, time_zone, enabled, last_success_at, last_failure_at,
          failure_count, created_at, updated_at
        from public.device_push_tokens
        where user_id = uid
        order by created_at asc
      ) t
    )
  );

  -- === custom breathing exercises (#429 - the table-level completeness check's
  -- first catch: user-created content that had never been in the export) ===
  result := result || jsonb_build_object(
    'breathingExercises', (
      select coalesce(jsonb_agg(to_jsonb(bx)), '[]'::jsonb)
      from (
        select id, name, inhale_seconds, hold_in_seconds, exhale_seconds,
          hold_out_seconds, cycles, color, created_at, updated_at
        from public.breathing_exercises
        where user_id = uid
        order by created_at asc
      ) bx
    )
  );

  -- === feedback submissions (#429 - rate-limit rows, but "when I sent
  -- feedback" is the user's own activity record) ===
  result := result || jsonb_build_object(
    'feedbackSubmissions', (
      select coalesce(jsonb_agg(to_jsonb(fs)), '[]'::jsonb)
      from (
        select id, created_at
        from public.feedback_submissions
        where user_id = uid
        order by created_at asc
      ) fs
    )
  );

  -- === funnel prefs merged into preferences (was the head export_user_data) ===
  select to_jsonb(p) into funnel_prefs
  from (
    select
      start_here_dismissed_at,
      app_onboarding_completed_via,
      app_onboarding_completed_at
    from public.user_preferences
    where user_id = uid
  ) p;

  if funnel_prefs is not null then
    result := jsonb_set(
      result,
      '{preferences}',
      coalesce(result -> 'preferences', '{}'::jsonb) || funnel_prefs
    );
  end if;

  return result;
end;
$$;

-- Carried with the declaration, exactly as every prior one carries it. `create
-- or replace function` preserves the existing ACL, so these are a no-op on an
-- already-deployed database - but they are what makes the function's grants
-- correct on a database built from migrations alone. Dropping them here would
-- leave `export_user_data` executable by `anon` on a fresh build.
revoke execute on function public.export_user_data() from public, anon;
grant execute on function public.export_user_data() to authenticated;

-- PostgREST caches the schema, and this migration drops two columns. Without the
-- reload it stays invisible to the client until the cache happens to
-- refresh on its own.
notify pgrst, 'reload schema';

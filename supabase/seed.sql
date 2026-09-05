-- Local development seed: deterministic test users + sample data.
-- Auto-applied by `supabase db reset`. Never runs against the linked cloud project.
--
-- Accounts (test-pass-{name}-123, see test/integration/helpers.ts):
--   alice@test.local - fresh post-onboarding, no records, and NO Home layout: she is
--     the empty-dashboard fixture, and that emptiness is the fixture (#1352)
--   bob@test.local   - mid-use, 5 thought records, reminders on, and the four-widget
--     Home layout onboarding emits for his answers
--   demo@test.local  - the fully populated review account. Only its profile and
--     preferences are set here; every record it holds comes from
--     scripts/seed-demo-data.mjs, which `npm run db:reset` runs last. Demo's ten
--     thought records used to be inserted below and moved there in #1281, so one
--     file owns them. Bob's five stay: the export tests depend on them.

-- auth.users
-- The empty-string token columns (confirmation_token, recovery_token, etc.) are
-- declared NOT NULL DEFAULT '' but GoTrue's schema scan fails with
-- "Database error querying schema" if they end up NULL on a direct insert,
-- so we set them explicitly.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  is_sso_user,
  is_anonymous,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  email_change,
  email_change_confirm_status,
  phone_change,
  phone_change_token,
  reauthentication_token,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alice@test.local',
    crypt('test-pass-alice-123', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alice Tester"}'::jsonb,
    false, false, false,
    '', '', '', '', '', 0, '', '', '',
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'bob@test.local',
    crypt('test-pass-bob-123', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bob Tester"}'::jsonb,
    false, false, false,
    '', '', '', '', '', 0, '', '', '',
    timezone('utc', now()) - interval '30 days',
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo@test.local',
    crypt('test-pass-demo-123', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo User"}'::jsonb,
    false, false, false,
    '', '', '', '', '', 0, '', '', '',
    timezone('utc', now()) - interval '60 days',
    timezone('utc', now())
  );

-- auth.identities (Supabase requires one per email-provider user; provider_id = email)
insert into auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'alice@test.local',
    'email',
    jsonb_build_object('sub', '00000000-0000-0000-0000-000000000001', 'email', 'alice@test.local', 'email_verified', true),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000002',
    'bob@test.local',
    'email',
    jsonb_build_object('sub', '00000000-0000-0000-0000-000000000002', 'email', 'bob@test.local', 'email_verified', true),
    timezone('utc', now()),
    timezone('utc', now()) - interval '30 days',
    timezone('utc', now())
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000003',
    'demo@test.local',
    'email',
    jsonb_build_object('sub', '00000000-0000-0000-0000-000000000003', 'email', 'demo@test.local', 'email_verified', true),
    timezone('utc', now()),
    timezone('utc', now()) - interval '60 days',
    timezone('utc', now())
  );

-- public.profiles
insert into public.profiles (user_id, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', 'alice@test.local', timezone('utc', now()), timezone('utc', now())),
  ('00000000-0000-0000-0000-000000000002', 'bob@test.local',   timezone('utc', now()) - interval '30 days', timezone('utc', now())),
  ('00000000-0000-0000-0000-000000000003', 'demo@test.local',  timezone('utc', now()) - interval '60 days', timezone('utc', now()));

-- public.user_preferences
-- alice: bare post-signup defaults, app onboarding done, CBT onboarding NOT done
insert into public.user_preferences (
  user_id,
  enabled_modules,
  reminder_consent,
  cbt_reminders_enabled,
  cbt_reminder_hour,
  cbt_reminder_minute,
  language,
  app_onboarding_completed,
  cbt_onboarding_completed,
  privacy_policy_accepted_at,
  terms_accepted_at,
  policy_version_accepted,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  array['cbt']::text[],
  false,
  false,
  19, 0,
  'en',
  true,
  false,
  timezone('utc', now()),
  timezone('utc', now()),
  '2026-05-20-local-preferences',
  timezone('utc', now()),
  timezone('utc', now())
);

-- bob: full onboarding done, reminders enabled at 19:30 local
--
-- The four onboarding-answer columns below (`selected_concerns`, `widgets_seeded`,
-- `app_onboarding_completed_via`, `app_onboarding_completed_at`) belong to the same
-- change as bob's `widget_preferences` rows further down, and are NOT optional trim
-- (#1352). Seed the rows alone and bob becomes a *grandfathered* user - `via` null,
-- `widgets_seeded` false, `selected_concerns` `{}` - who happens to hold four widgets.
-- That state is producible (it is what `/arrange` leaves behind), but it makes the
-- layout unexplainable, which is exactly what the decision refused.
--
-- `anxious-thoughts` is the concern that EXPLAINS this account: bob's whole dataset
-- is five thought records nudged by a 19:30 CBT reminder, and that is the concern a
-- person arriving with them would pick. `enabled_modules` stays `['cbt']` -
-- unlike demo, bob needs no module edit.
insert into public.user_preferences (
  user_id,
  enabled_modules,
  selected_concerns,
  reminder_consent,
  reminder_consent_updated_at,
  cbt_reminders_enabled,
  cbt_reminder_hour,
  cbt_reminder_minute,
  cbt_reminder_timezone,
  language,
  app_onboarding_completed,
  app_onboarding_completed_via,
  app_onboarding_completed_at,
  widgets_seeded,
  cbt_onboarding_completed,
  privacy_policy_accepted_at,
  terms_accepted_at,
  policy_version_accepted,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000002',
  array['cbt']::text[],
  array['anxious-thoughts']::text[],
  true,
  timezone('utc', now()) - interval '29 days',
  true,
  19, 30,
  'Europe/Sofia',
  'en',
  true,
  'finish',
  timezone('utc', now()) - interval '30 days',
  true,
  true,
  timezone('utc', now()) - interval '30 days',
  timezone('utc', now()) - interval '30 days',
  '2026-05-20-local-preferences',
  timezone('utc', now()) - interval '30 days',
  timezone('utc', now())
);

-- demo: polished, full onboarding, reminders on, English
insert into public.user_preferences (
  user_id,
  enabled_modules,
  reminder_consent,
  reminder_consent_updated_at,
  cbt_reminders_enabled,
  cbt_reminder_hour,
  cbt_reminder_minute,
  cbt_reminder_timezone,
  language,
  app_onboarding_completed,
  cbt_onboarding_completed,
  privacy_policy_accepted_at,
  terms_accepted_at,
  policy_version_accepted,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000003',
  array['cbt']::text[],
  true,
  timezone('utc', now()) - interval '59 days',
  true,
  20, 0,
  'Europe/Sofia',
  'en',
  true,
  true,
  timezone('utc', now()) - interval '60 days',
  timezone('utc', now()) - interval '60 days',
  '2026-05-20-local-preferences',
  timezone('utc', now()) - interval '60 days',
  timezone('utc', now())
);

-- public.widget_preferences - bob (4)
-- Exactly what onboarding's `buildWidgetRecommendations` emits for concerns
-- ['anxious-thoughts'] and modules ['cbt'], and nothing else - no `/arrange` tail
-- (#1352). Positions are 0-BASED: `apply_widget_recommendations` assigns
-- `min(ordinality)::integer - 1`, so a direct insert has to use 0..n-1 to reproduce a
-- real wizard run. The RPC itself is unusable from here - it is `security invoker` and
-- reads `auth.uid()`, which is null under seed.sql - hence the direct insert.
--
-- ⚠️ `widget_id` is bare TEXT with no FK and no check, and the dashboard filters on
-- `widgetId in WIDGET_META`, so a typo lands silently and renders nothing. The ids are
-- checked against the live registry by test/seed-widget-layouts.test.ts.
--
-- WHAT THIS LAYOUT WAS FOR: the Routines-page empty-state starter card (spec #37,
-- surface #45) used to compose from these rows - `buildStarterSteps` mapped the four
-- to [mood, breathing, journal]. Since #1954 it composes from the steppable tools the
-- person has RECORDS in and reads no widget row at all, so this layout composes
-- nothing; bob's five thought records are one tool, so on a fresh reset he gets the
-- quiet "No routines yet" card like every seeded account. One mood check-in logged as
-- bob makes the card compose [mood, cbt] - the review recipe in supabase/README.md.
-- ☠️ Which is still why bob keeps ZERO routines, permanently: he is the only mid-use
-- fixture at zero routines, so give him one and the card has no account to be
-- reviewed on. The rows themselves stay: they are what the pre-Favourites native
-- builds still render, and what the #1953 favourites copy is derived from.
--
-- alice deliberately gets no rows here: with demo and bob both carrying a layout, she
-- is the only account left on which Home's empty dashboard - and the wizard's starter
-- panel behind its re-offer - is reachable at all. demo's fourteen ids are written by
-- scripts/seed-demo-data.mjs, which `npm run db:reset` runs last.
insert into public.widget_preferences (user_id, widget_id, position)
values
  ('00000000-0000-0000-0000-000000000002', 'cbt-programme',       0),
  ('00000000-0000-0000-0000-000000000002', 'mood-checkin',        1),
  ('00000000-0000-0000-0000-000000000002', 'breathing-suggested', 2),
  ('00000000-0000-0000-0000-000000000002', 'journal-week',        3);

-- public.favorites - bob (4)
-- Exactly what 20260908000000_favorites.sql's one-shot copy produces from the four
-- rows above: `cbt-programme` → `module:cbt`, the other three → `tool:<toolKey>`.
-- Written here because seeds run AFTER migrations (#1953): the copy has already
-- run against an empty table by the time this file inserts bob's widget rows, so
-- without these he would be the one account whose dashboard never migrated. The
-- pairing is checked against WIDGET_META by test/seed-widget-layouts.test.ts.
--
-- alice again gets no rows: with Favourites she is the account whose Home shows
-- the empty Favourites line, for the same reason she holds no widget rows.
insert into public.favorites (user_id, kind, key)
values
  ('00000000-0000-0000-0000-000000000002', 'module', 'cbt'),
  ('00000000-0000-0000-0000-000000000002', 'tool',   'mood'),
  ('00000000-0000-0000-0000-000000000002', 'tool',   'breathing'),
  ('00000000-0000-0000-0000-000000000002', 'tool',   'journal');

-- ──────────────────────────────────────────────────────────────────────────
-- e2e worker-pool users (w0..w7)
-- One dedicated user per Playwright parallel worker so e2e runs fully parallel
-- without cross-worker data collisions. Seeded fresh like alice. The e2e fixture
-- (test/e2e/fixtures.ts) normalizes onboarding/policy prefs per test, so the
-- values below are just sane defaults.
-- ──────────────────────────────────────────────────────────────────────────
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  email_change, email_change_confirm_status, phone_change, phone_change_token,
  reauthentication_token, created_at, updated_at
)
select
  u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email,
  crypt('e2e-worker-pass-123', gen_salt('bf')), timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"E2E Worker"}'::jsonb,
  false, false, false,
  '', '', '', '', '', 0, '', '', '',
  timezone('utc', now()), timezone('utc', now())
from (values
  ('00000000-0000-0000-0000-000000000010'::uuid, 'e2e-w0@test.local'),
  ('00000000-0000-0000-0000-000000000011'::uuid, 'e2e-w1@test.local'),
  ('00000000-0000-0000-0000-000000000012'::uuid, 'e2e-w2@test.local'),
  ('00000000-0000-0000-0000-000000000013'::uuid, 'e2e-w3@test.local'),
  ('00000000-0000-0000-0000-000000000014'::uuid, 'e2e-w4@test.local'),
  ('00000000-0000-0000-0000-000000000015'::uuid, 'e2e-w5@test.local'),
  ('00000000-0000-0000-0000-000000000016'::uuid, 'e2e-w6@test.local'),
  ('00000000-0000-0000-0000-000000000017'::uuid, 'e2e-w7@test.local')
) as u(id, email)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.email, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  timezone('utc', now()), timezone('utc', now()), timezone('utc', now())
from (values
  ('00000000-0000-0000-0000-000000000010'::uuid, 'e2e-w0@test.local'),
  ('00000000-0000-0000-0000-000000000011'::uuid, 'e2e-w1@test.local'),
  ('00000000-0000-0000-0000-000000000012'::uuid, 'e2e-w2@test.local'),
  ('00000000-0000-0000-0000-000000000013'::uuid, 'e2e-w3@test.local'),
  ('00000000-0000-0000-0000-000000000014'::uuid, 'e2e-w4@test.local'),
  ('00000000-0000-0000-0000-000000000015'::uuid, 'e2e-w5@test.local'),
  ('00000000-0000-0000-0000-000000000016'::uuid, 'e2e-w6@test.local'),
  ('00000000-0000-0000-0000-000000000017'::uuid, 'e2e-w7@test.local')
) as u(id, email)
where not exists (
  select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
);

insert into public.profiles (user_id, email, created_at, updated_at)
select u.id, u.email, timezone('utc', now()), timezone('utc', now())
from (values
  ('00000000-0000-0000-0000-000000000010'::uuid, 'e2e-w0@test.local'),
  ('00000000-0000-0000-0000-000000000011'::uuid, 'e2e-w1@test.local'),
  ('00000000-0000-0000-0000-000000000012'::uuid, 'e2e-w2@test.local'),
  ('00000000-0000-0000-0000-000000000013'::uuid, 'e2e-w3@test.local'),
  ('00000000-0000-0000-0000-000000000014'::uuid, 'e2e-w4@test.local'),
  ('00000000-0000-0000-0000-000000000015'::uuid, 'e2e-w5@test.local'),
  ('00000000-0000-0000-0000-000000000016'::uuid, 'e2e-w6@test.local'),
  ('00000000-0000-0000-0000-000000000017'::uuid, 'e2e-w7@test.local')
) as u(id, email);
-- NOTE: public.profiles is now a decrypting VIEW; its INSTEAD OF INSERT trigger
-- already does `on conflict (user_id) do update` against profiles_data, so the
-- outer ON CONFLICT (which a view can't accept → 42P10) is removed here.

insert into public.user_preferences (
  user_id, enabled_modules, reminder_consent, cbt_reminders_enabled,
  cbt_reminder_hour, cbt_reminder_minute, language,
  app_onboarding_completed, cbt_onboarding_completed,
  privacy_policy_accepted_at, terms_accepted_at, policy_version_accepted,
  created_at, updated_at
)
select
  u.id, array['cbt']::text[], false, false, 19, 0, 'en',
  true, true,
  timezone('utc', now()), timezone('utc', now()), '2026-05-20-local-preferences',
  timezone('utc', now()), timezone('utc', now())
from (values
  ('00000000-0000-0000-0000-000000000010'::uuid),
  ('00000000-0000-0000-0000-000000000011'::uuid),
  ('00000000-0000-0000-0000-000000000012'::uuid),
  ('00000000-0000-0000-0000-000000000013'::uuid),
  ('00000000-0000-0000-0000-000000000014'::uuid),
  ('00000000-0000-0000-0000-000000000015'::uuid),
  ('00000000-0000-0000-0000-000000000016'::uuid),
  ('00000000-0000-0000-0000-000000000017'::uuid)
) as u(id)
on conflict (user_id) do nothing;

-- public.thought_records - bob (5)
insert into public.thought_records (
  user_id, situation, nats, emotions, distortions, balanced_thought, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000002',
    'My manager scheduled a 1:1 without an agenda.',
    '[{"text": "I am about to be put on a performance plan.", "beliefRating": null, "isHotThought": true}]'::jsonb,
    array['Anxious','Fearful']::text[],
    array['fortune-telling','catastrophizing']::text[],
    'Most 1:1s are routine check-ins. I will ask about the agenda before assuming the worst.',
    timezone('utc', now()) - interval '25 days',
    timezone('utc', now()) - interval '25 days'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'A friend did not reply to my message for two days.',
    '[{"text": "They are mad at me and want to drop the friendship.", "beliefRating": null, "isHotThought": true}]'::jsonb,
    array['Anxious','Sad']::text[],
    array['mind-reading']::text[],
    'They are usually slow when work is busy. I have no evidence of anger; I can check in lightly.',
    timezone('utc', now()) - interval '18 days',
    timezone('utc', now()) - interval '18 days'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'I missed a small detail in a code review.',
    '[{"text": "I am a sloppy engineer and I do not deserve this role.", "beliefRating": null, "isHotThought": true}]'::jsonb,
    array['Ashamed','Frustrated']::text[],
    array['labeling','all-or-nothing']::text[],
    'One missed nit is not an identity. I caught the bigger issues; I will note this for next time.',
    timezone('utc', now()) - interval '11 days',
    timezone('utc', now()) - interval '11 days'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'I felt anxious before a casual social event.',
    '[{"text": "If I am this anxious, something must be really wrong.", "beliefRating": null, "isHotThought": true}]'::jsonb,
    array['Anxious','Overwhelmed']::text[],
    array['emotional-reasoning']::text[],
    'A feeling is not proof. Anxiety can show up before any new social setting and pass once I arrive.',
    timezone('utc', now()) - interval '5 days',
    timezone('utc', now()) - interval '5 days'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'I skipped one workout this week.',
    '[{"text": "I should never miss a workout, otherwise I am undisciplined.", "beliefRating": null, "isHotThought": true}]'::jsonb,
    array['Guilty']::text[],
    array['should-statements']::text[],
    'I would prefer to keep my routine, and one missed session does not erase the rest of the week.',
    timezone('utc', now()) - interval '1 days',
    timezone('utc', now()) - interval '1 days'
  );

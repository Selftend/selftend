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
-- The two completion columns below (`app_onboarding_completed_via`,
-- `app_onboarding_completed_at`) belong to the same change as bob's `favorites`
-- rows further down, and are NOT optional trim (#1352). Seed the rows alone and
-- bob becomes a *grandfathered* user - `via` null, `_at` null - who happens to
-- hold four favourites. That makes the list unexplainable, which is exactly what
-- the decision refused. (`selected_concerns` and `widgets_seeded`, the other two
-- onboarding-answer columns this insert used to carry, were dropped in #1958: the
-- one-panel wizard asks no concern and seeds no Home. Bob's four favourites are
-- the ones an `anxious-thoughts` + `cbt` answer became under the #1953 copy, and
-- that is now recorded here in prose rather than in a column.)
--
-- `enabled_modules` stays `['cbt']` - unlike demo, bob needs no module edit.
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
  app_onboarding_completed_via,
  app_onboarding_completed_at,
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

-- public.favorites - bob (4)
-- What onboarding emitted for concern ['anxious-thoughts'] plus module ['cbt'] -
-- `cbt-programme`, `mood-checkin`, `breathing-suggested`, `journal-week` - once
-- 20260908000000_favorites.sql's one-shot copy folded it onto favourites:
-- `cbt-programme` → `module:cbt`, the other three → `tool:<toolKey>`. Written as
-- favourites directly because seeds run AFTER migrations (#1953), so the copy has
-- already run against an empty table by the time this file runs.
--
-- No `widget_preferences` rows any more (#1959): Home reads favourites, the old table
-- serves only the native builds that predate them, and a seed writing both would be
-- two sources of truth for one account. The keys are checked against the favourites
-- catalogue by test/seed-favorites.test.ts.
--
-- WHAT THIS LIST IS NOT FOR: the Routines-page empty-state starter card (spec #37,
-- surface #45) used to compose from bob's dashboard rows - `buildStarterSteps` mapped
-- the four to [mood, breathing, journal]. Since #1954 it composes from the steppable
-- tools the person has RECORDS in and reads no favourite either, so this list composes
-- nothing; bob's five thought records are one tool, so on a fresh reset he gets the
-- quiet "No routines yet" card like every seeded account. One mood check-in logged as
-- bob makes the card compose [mood, cbt] - the review recipe in supabase/README.md.
-- ☠️ Which is still why bob keeps ZERO routines, permanently: he is the only mid-use
-- fixture at zero routines, so give him one and the card has no account to be
-- reviewed on.
--
-- alice deliberately gets no rows here: she is the account whose Home shows the empty
-- Favourites line. demo's ten are written by scripts/seed-demo-data.mjs, which
-- `npm run db:reset` runs last.
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

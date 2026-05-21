-- Local development seed: deterministic test users + sample data.
-- Auto-applied by `supabase db reset`. Never runs against the linked cloud project.
--
-- Accounts (all password: password123):
--   alice@test.local - fresh post-onboarding, no records
--   bob@test.local   - mid-use, 5 thought records, reminders on
--   demo@test.local  - polished demo/screenshot account, 10 records

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
    crypt('password123', gen_salt('bf')),
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
    crypt('password123', gen_salt('bf')),
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
    crypt('password123', gen_salt('bf')),
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
  '1.0.0',
  timezone('utc', now()),
  timezone('utc', now())
);

-- bob: full onboarding done, reminders enabled at 19:30 local
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
  '00000000-0000-0000-0000-000000000002',
  array['cbt']::text[],
  true,
  timezone('utc', now()) - interval '29 days',
  true,
  19, 30,
  'Europe/Sofia',
  'en',
  true,
  true,
  timezone('utc', now()) - interval '30 days',
  timezone('utc', now()) - interval '30 days',
  '1.0.0',
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
  '1.0.0',
  timezone('utc', now()) - interval '60 days',
  timezone('utc', now())
);

-- public.thought_records - bob (5)
insert into public.thought_records (
  user_id, situation, automatic_thought, emotions, distortions, balanced_thought, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000002',
    'My manager scheduled a 1:1 without an agenda.',
    'I am about to be put on a performance plan.',
    array['Anxious','Fearful']::text[],
    array['fortune-telling','catastrophizing']::text[],
    'Most 1:1s are routine check-ins. I will ask about the agenda before assuming the worst.',
    timezone('utc', now()) - interval '25 days',
    timezone('utc', now()) - interval '25 days'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'A friend did not reply to my message for two days.',
    'They are mad at me and want to drop the friendship.',
    array['Anxious','Sad']::text[],
    array['mind-reading']::text[],
    'They are usually slow when work is busy. I have no evidence of anger; I can check in lightly.',
    timezone('utc', now()) - interval '18 days',
    timezone('utc', now()) - interval '18 days'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'I missed a small detail in a code review.',
    'I am a sloppy engineer and I do not deserve this role.',
    array['Ashamed','Frustrated']::text[],
    array['labeling','all-or-nothing']::text[],
    'One missed nit is not an identity. I caught the bigger issues; I will note this for next time.',
    timezone('utc', now()) - interval '11 days',
    timezone('utc', now()) - interval '11 days'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'I felt anxious before a casual social event.',
    'If I am this anxious, something must be really wrong.',
    array['Anxious','Overwhelmed']::text[],
    array['emotional-reasoning']::text[],
    'A feeling is not proof. Anxiety can show up before any new social setting and pass once I arrive.',
    timezone('utc', now()) - interval '5 days',
    timezone('utc', now()) - interval '5 days'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'I skipped one workout this week.',
    'I should never miss a workout, otherwise I am undisciplined.',
    array['Guilty']::text[],
    array['should-statements']::text[],
    'I would prefer to keep my routine, and one missed session does not erase the rest of the week.',
    timezone('utc', now()) - interval '1 days',
    timezone('utc', now()) - interval '1 days'
  );

-- public.thought_records - demo (10, spread across 60 days, polished for screenshots)
insert into public.thought_records (
  user_id, situation, automatic_thought, emotions, distortions, balanced_thought, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000003',
    'I gave a short presentation at work and stumbled on one slide.',
    'Everyone noticed and now they think I am unprepared.',
    array['Anxious','Ashamed']::text[],
    array['mind-reading','catastrophizing']::text[],
    'A small stumble is normal. The questions afterward suggested people followed the content.',
    timezone('utc', now()) - interval '55 days',
    timezone('utc', now()) - interval '55 days'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'I noticed an old friend has not reached out in months.',
    'I must have done something to push them away.',
    array['Sad','Lonely']::text[],
    array['personalization','mind-reading']::text[],
    'People drift in and out of contact for many reasons. I can reach out without assigning blame.',
    timezone('utc', now()) - interval '48 days',
    timezone('utc', now()) - interval '48 days'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'I got positive feedback in a review but also one piece of growth feedback.',
    'The growth feedback is the only thing that really matters here.',
    array['Frustrated']::text[],
    array['discounting-the-positive']::text[],
    'Both pieces of feedback are real. The strengths I heard are not erased by one growth area.',
    timezone('utc', now()) - interval '42 days',
    timezone('utc', now()) - interval '42 days'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'I had trouble falling asleep before an important morning.',
    'If I do not sleep perfectly, tomorrow will be ruined.',
    array['Anxious','Overwhelmed']::text[],
    array['catastrophizing','all-or-nothing']::text[],
    'I have done well on imperfect sleep before. I can rest, even if I do not fall asleep right away.',
    timezone('utc', now()) - interval '36 days',
    timezone('utc', now()) - interval '36 days'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'A small project of mine did not get the response I hoped for.',
    'Nothing I make ever lands. I should stop trying.',
    array['Hopeless','Sad']::text[],
    array['overgeneralization','labeling']::text[],
    'One quiet launch is one data point. Earlier projects did connect with people.',
    timezone('utc', now()) - interval '29 days',
    timezone('utc', now()) - interval '29 days'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'My partner seemed quiet at dinner.',
    'They are upset with me and not telling me.',
    array['Anxious']::text[],
    array['mind-reading']::text[],
    'They had a long workday. I can ask gently rather than assume the silence is about me.',
    timezone('utc', now()) - interval '22 days',
    timezone('utc', now()) - interval '22 days'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'I sent an email and noticed a small typo afterwards.',
    'The recipient will think I am careless and unprofessional.',
    array['Ashamed']::text[],
    array['catastrophizing','mind-reading']::text[],
    'Most readers skim past small typos. The substance of the email is what they will respond to.',
    timezone('utc', now()) - interval '16 days',
    timezone('utc', now()) - interval '16 days'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'I felt low energy on a planned rest day.',
    'I should be using this time better. I am wasting the day.',
    array['Guilty','Frustrated']::text[],
    array['should-statements']::text[],
    'Rest is part of the plan, not a failure of it. Low energy is information, not a moral problem.',
    timezone('utc', now()) - interval '10 days',
    timezone('utc', now()) - interval '10 days'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'A teammate disagreed with my proposal in a meeting.',
    'They think I do not know what I am doing.',
    array['Anxious','Frustrated']::text[],
    array['mind-reading','personalization']::text[],
    'Disagreement is about the proposal, not my competence. Their pushback might even improve it.',
    timezone('utc', now()) - interval '4 days',
    timezone('utc', now()) - interval '4 days'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'I felt anxious for no clear reason on a calm afternoon.',
    'If I feel anxious, something bad must be coming.',
    array['Anxious']::text[],
    array['emotional-reasoning','fortune-telling']::text[],
    'Anxiety can show up without a cause. The feeling is real; the prediction it suggests is not evidence.',
    timezone('utc', now()) - interval '1 days',
    timezone('utc', now()) - interval '1 days'
  );

# Supabase Notes

The initial schema lives in [supabase/migrations/20260415_initial.sql](migrations/20260415_initial.sql). Later migrations add consent/deletion support, profile avatar storage, language preference sync, onboarding flags, reminder consent timestamps, browser push subscription infrastructure, and CBT strategy tables.

## Tables

- `profiles`
- `user_preferences`
- `thought_records`
- `web_push_subscriptions`
- `goals`, `milestones`
- `values_profile`, `activity_logs`
- `mood_logs`
- `core_beliefs`
- `exposure_hierarchies`, `exposure_items`, `exposure_sessions`
- `worry_entries`
- `mindfulness_sessions`
- `procrastination_tasks`, `task_steps`
- `anger_logs`
- `self_care_logs`
- `recovery_plans`, `challenge_plans`
- `habits`, `habit_logs`

`profiles` stores account-level metadata only: email plus optional avatar fields. Google OAuth avatars are stored as URLs with `avatar_source = 'oauth'`; manually chosen images store a private Storage object path with `avatar_source = 'upload'`; removed photos keep `avatar_source = null` and set `avatar_updated_at` so the app does not immediately re-import the Google photo.

`export_user_data()` includes account metadata, preferences, web push subscriptions, thought records, and all private CBT strategy records. `delete_user_account()` deletes owned private rows directly or through `auth.users` cascade.

## Storage

- `profile-pics`: private bucket for user-uploaded profile pictures

Avatar objects are stored under a user-scoped path and protected by Storage RLS so authenticated users can only read, insert, update, or delete objects inside their own folder. The client creates signed URLs for display instead of making uploaded avatars public.

## Environment

Set one of these keys:

- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

And always set:

- `EXPO_PUBLIC_SUPABASE_URL`

For self-hosted or bring-your-own-Supabase builds, these values point at the self-hoster's Supabase-compatible project. See [docs/self-hosting.md](../docs/self-hosting.md).

For launch builds, also set:

- `EXPO_PUBLIC_PUBLIC_APP_URL`
- `EXPO_PUBLIC_SUPPORT_EMAIL`
- `EXPO_PUBLIC_PRIVACY_EMAIL`
- `EXPO_PUBLIC_SECURITY_EMAIL`

`EXPO_PUBLIC_PUBLIC_APP_URL` must be set before exporting the public web build because OAuth and magic-link redirects use it as the web callback base. Missing production values can cause the app or Supabase to fall back to localhost during auth testing.

Never put service-role keys, database passwords, SMTP secrets, OAuth secrets, JWT secrets, or other private backend secrets in Expo public env vars.

## Local development

Run a full local Supabase stack (Postgres, Auth, Storage, Studio, Inbucket) via the CLI. Migrations and `seed.sql` are applied on every reset, so test users come back deterministically.

### Prerequisites

- Docker (Docker Desktop or `docker` + `docker compose`). The CLI shells out to Docker; nothing else to install - the Supabase CLI is already a dev dependency invoked through `npm exec supabase`.

### Commands

```bash
npm run db:start    # boot the local stack (first run pulls images; later runs are fast)
npm run db:status   # print URLs + the local anon key (copy into .env.local)
npm run db:reset    # drop + re-apply migrations + run supabase/seed.sql
npm run db:stop     # shut everything down
```

`db:reset` is wrapped in `scripts/db-reset.js` because `supabase db reset` recreates the GoTrue container with a new Docker IP, but Kong's nginx caches the old upstream IP and returns 502 Bad Gateway for auth requests until it's restarted. The wrapper restarts Kong automatically after each reset.

### Point the app at the local stack

```bash
cp .env.local.example .env.local
# then paste the anon key from `npm run db:status` into EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Expo loads `.env.local` with priority over `.env`, so `npm start` will now talk to `http://localhost:54321`. To switch back to the cloud project, delete `.env.local`.

**Android emulator:** replace `localhost` with `10.0.2.2` in `.env.local` so the emulated device can reach the host's Supabase containers.

### Seeded test users

All three accounts share the password `password123`. They are recreated on every `npm run db:reset`.

| Email              | UUID    | State                                                |
| ------------------ | ------- | ---------------------------------------------------- |
| `alice@test.local` | `…0001` | Empty account, post-signup, CBT onboarding not done  |
| `bob@test.local`   | `…0002` | Mid-use, 5 thought records, reminders enabled        |
| `demo@test.local`  | `…0003` | Polished demo/screenshot account, 10 thought records |

Sign in via the app's email/password form (`signInWithPassword` in `src/features/auth/api.ts`).

#### Adding more seeded users

Pick the path that matches how long you need the user:

| Lifetime                           | How                                                                                                                                                      | Notes                                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persistent (back after `db:reset`) | Add a block to `supabase/seed.sql` mirroring alice's pattern: `auth.users` + `auth.identities` + `profiles` + `user_preferences`                         | Use a fresh UUID and a unique email. Also update `SEED_USERS` in `test/integration/helpers.ts` if you want integration tests to reach the new user. |
| One-off, throwaway                 | Studio UI at `http://localhost:54323` → **Authentication → Users → Add user**                                                                            | Fastest. Gone on next `db:reset`.                                                                                                                   |
| One-off via signup flow            | Just sign up in the app                                                                                                                                  | Local Auth has auto-confirm so the user is immediately usable. Gone on `db:reset`.                                                                  |
| Programmatic / scripted            | Service-role admin API: `client.auth.admin.createUser({ email, password, email_confirm: true })` - see `ensureSeedUser` in `test/integration/helpers.ts` | Works against the local stack via the deterministic CLI service-role key.                                                                           |

### Inspecting auth emails

Local Supabase routes all auth emails (password reset, signup confirmation) to **Inbucket** at `http://localhost:54324`. Use it to grab links during password-reset testing without configuring real SMTP.

### Optional: Google OAuth against the local stack

Only needed if you want to exercise the full Google sign-in flow locally. The seeded password users cover the everyday path.

1. Uncomment the `[auth.external.google]` block in `supabase/config.toml` (left commented by default to avoid CLI warnings about unset env vars).
2. In Google Cloud Console, create a separate OAuth web client for development:
   - Authorized JavaScript origin: `http://localhost:8081`
   - Authorized redirect URI: `http://localhost:54321/auth/v1/callback`
3. Export the credentials before starting the stack:
   ```bash
   export GOOGLE_LOCAL_CLIENT_ID=...
   export GOOGLE_LOCAL_CLIENT_SECRET=...
   npm run db:start
   ```
4. Sign in with any real Google account - local Auth creates the user on first sign-in.

### Integration tests

A separate Jest config (`jest.integration.config.js`) runs `*.integration.test.ts` files against the running local stack. Hermetic unit tests stay under `npm test`; integration tests are opt-in:

```bash
npm run db:start && npm run db:reset   # boot stack + seed
npm run test:integration               # run real-DB tests
```

Coverage:

- `cbt-repository.integration.test.ts` - thought_records CRUD + ordering + archived_at filter
- `settings-repository.integration.test.ts` - user_preferences upserts, web_push_subscriptions, check constraints
- `profile-repository.integration.test.ts` - profiles upserts + profile-pics storage round-trip
- `rls.integration.test.ts` - cross-user isolation across all owner-scoped tables and the storage bucket
- `db-functions.integration.test.ts` - `export_user_data()` coverage for private app data and `delete_user_account()`
- `auth.integration.test.ts` - sign-in success/failure, sign-up, password-reset email landing in Mailpit (`http://localhost:54324`)

Tests clean up after themselves (per-test teardown) so the suite is rerunnable without `db:reset` between runs. Local anon and service-role keys are deterministic Supabase CLI defaults and are hardcoded in `test/integration/helpers.ts`.

GitHub Actions runs the suite on every PR as the `integration` job in `.github/workflows/ci.yml`.

### End-to-end tests (Playwright)

Browser-driven flows exercise the wiring between UI, repos, navigation, and auth. They run against `expo start --web` pointed at the local stack.

```bash
npm run db:start && npm run db:reset    # boot stack + seed
npm run test:e2e                        # Playwright auto-starts expo on :8081
npm run test:e2e -- --headed            # watch the browser
npm run test:e2e -- --ui                # Playwright UI mode for debugging
```

Coverage:

- `sign-in.e2e.test.ts` - seeded user signs in via the UI and reaches the authenticated app; wrong password shows an inline error.
- `create-thought-record.e2e.test.ts` - alice signs in, walks the 5-step CBT wizard, and the saved record renders on detail + history.
- `sign-out.e2e.test.ts` - bob signs out from settings and lands back on the landing screen.
- `sign-up-onboarding.e2e.test.ts` - brand-new user signs up, completes consent + app + CBT onboarding, and saves their first record.

Each test cleans up its own data via the service-role admin API (`test/e2e/helpers.ts` re-exports the integration helpers). Running E2E does not need `db:reset` between runs as long as the seed users still exist.

GitHub Actions runs E2E on every PR as the `e2e` job in `.github/workflows/ci.yml`. Failure artifacts (Playwright report + traces) are uploaded for 7 days.

## First setup

1. create the Supabase project
2. authenticate the CLI:

```bash
npm exec supabase -- login
```

3. link the repo to the project:

```bash
npm exec supabase -- link --project-ref <your-project-ref>
```

4. apply the existing migration:

```bash
npm exec supabase -- db push
```

This creates the database tables, consent/deletion functions, profile avatar columns, onboarding preference flags, reminder consent timestamp field, browser push subscription table, and the private `profile-pics` storage bucket with RLS policies.

If profile-picture testing shows `avatar_source` missing from the schema cache or a `profile-pics` row-level security error, the active Supabase project is missing the avatar repair migration. The normal fix is:

```bash
npm exec supabase -- db push
```

If `db push` is blocked by a migration-history mismatch, inspect the active project before changing history. The 2026-05-05 repair renamed the consent/deletion migration to `20260503000000_consent_and_deletion.sql` so it sorts before the same-day avatar migrations, repaired remote history, then applied `20260504_add_language_preference.sql`.

```bash
npm exec supabase -- db query --linked -f supabase/migrations/20260503121000_profile_avatar_repair.sql
```

## Linked project status

As of 2026-05-17, the active linked project is aligned with the checked-in migration history through `20260540_act_committed_action.sql`. The migration history was repaired on 2026-05-05, the onboarding flags migration was applied on 2026-05-06, the reminder consent timestamp migration was applied on 2026-05-06, the browser push subscription migration was applied on 2026-05-06, the CBT strategy migrations were applied on 2026-05-15, the tool-onboarding migrations were applied on 2026-05-17, and the ACT migrations were applied on 2026-05-17:

- the old remote `20260503` history row was reverted
- the local consent/deletion migration was renamed to `20260503000000_consent_and_deletion.sql`
- `20260503000000`, `20260503120000`, and `20260503121000` were marked applied in remote history
- `20260504_add_language_preference.sql` was applied with `supabase db push`
- `20260507000000_reminder_consent_timestamp.sql` was applied with `supabase db push --yes`
- `20260508000000_web_push_notifications.sql` was applied with `supabase db push --yes`
- `20260514_cbt_phase1.sql`, `20260515_cbt_phase3.sql`, `20260516000000_cbt_phase4.sql`, `20260517_cbt_phase5.sql`, `20260518_cbt_export_coverage.sql`, and `20260519_expanded_thought_records.sql` were applied with `supabase db push --yes`
- the legacy remote `20260516` history row was reverted and replaced with `20260516000000` on 2026-05-17 because it conflicted with the later `20260516172952_meditation_info_onboarding.sql` version in Supabase CLI migration matching
- `20260533_cbt_wizard.sql` and `20260534_tool_onboardings.sql` were applied with `supabase db push --yes --include-all`
- `20260535_act_module.sql`, `20260536_act_expansion.sql`, `20260537_act_presence.sql`, `20260538_act_values.sql`, and `20260540_act_committed_action.sql` were applied with `supabase db push --include-all --yes`

- `profiles` includes the avatar columns from `20260503120000_profile_avatars.sql`
- `profile-pics` exists as a private bucket with a 5 MB limit and JPEG/PNG/WebP MIME types
- named public RLS policies exist for `profiles`, `user_preferences`, and `thought_records`
- named Storage policies exist for authenticated user-owned objects in `profile-pics`
- `user_preferences.language` exists with the `user_preferences_language_check` constraint
- `user_preferences.app_onboarding_completed` and `user_preferences.cbt_onboarding_completed` exist for account-backed onboarding
- `user_preferences.habits_onboarding_completed`, `habits`, and `habit_logs` exist for account-backed habit onboarding and daily habit ticks
- `user_preferences.act_onboarding_completed`, `act_program_state`, and the ACT exercise tables exist with owner-scoped RLS policies
- `user_preferences.reminder_consent_updated_at` exists for timestamped reminder opt-in and withdrawal state
- `user_preferences.cbt_reminder_timezone` and `web_push_subscriptions` exist for opted-in browser reminders
- `activity_logs`, `mood_logs`, `self_care_logs`, and the rest of the CBT strategy tables exist with owner-scoped RLS policies

The local and remote migration histories include `20260507000000_reminder_consent_timestamp.sql`, which adds `user_preferences.reminder_consent_updated_at` and export coverage for timestamped reminder consent. The 2026-05-07 version is used so the file sorts after the legacy 8-digit `20260506_onboarding_flags.sql` migration.

The local and remote migration histories also include `20260508000000_web_push_notifications.sql`, which adds `web_push_subscriptions`, `user_preferences.cbt_reminder_timezone`, export/delete coverage, and helper SQL for invoking the `send-web-reminders` Edge Function from Supabase Cron. Do not schedule the cron helper until VAPID keys, `WEB_PUSH_CRON_SECRET`, and matching Vault secrets are configured.

Avoid parallel linked CLI queries against the production project; parallel reads can trigger Supabase's temporary auth circuit breaker.

5. in Supabase dashboard:

- enable the Google provider and paste the Google OAuth client ID and secret
- keep email auth enabled for passwordless magic-link sign-in

6. in Google Auth Platform, create a `Web application` OAuth client and configure:

- Authorized JavaScript origins for your web app, for example `http://localhost:8081`
- Authorized redirect URI from the Supabase Google provider page, which will be your project callback URL such as `https://<project-ref>.supabase.co/auth/v1/callback`

7. add redirect URLs for the app's auth callback flow:

- `selftend://**`
- your local Expo web origin plus `/auth-callback`, for example `http://localhost:8081/auth-callback`
- your production web callback URL, for example `https://<domain>/auth-callback`

8. copy the URL and key into `.env`

## Future backend portability

The app's backend contract is Supabase Auth plus the public schema and RLS policies in `supabase/migrations`.

Current and planned modes:

- maintainer-hosted Supabase for the public web app and first Android closed-test build
- future bring-your-own Supabase Cloud project
- future advanced self-hosted Supabase operated by the self-hoster

For Supabase Cloud, apply migrations with:

```bash
npm exec supabase -- login
npm exec supabase -- link --project-ref <project-ref>
npm exec supabase -- db push
```

For local development, use:

```bash
npm exec supabase -- start
npm exec supabase -- db reset
```

For future advanced self-hosted Supabase, follow Supabase's official self-hosting docs first, then apply the SQL migrations from this repo to the target database. The operator owns TLS, SMTP/email, backups, upgrades, monitoring, uptime, and incident response.

Runtime backend switching is intentionally deferred and should not block the first web or Android closed-test launch. Until runtime switching exists, self-hosters build the app from source with their own public Supabase URL and publishable or anon key.

## Auth callback flow

The app now uses Google OAuth and passwordless email magic links for MVP authentication.

- web OAuth returns through `/auth-callback`
- native OAuth returns through the app scheme and completes in the Google sign-in flow
- web magic links return through `/auth-callback`
- native magic links return through the app scheme and open the callback route directly
- Google profile pictures are imported from Supabase auth user metadata for new profiles
- manual profile-picture uploads take priority until the user resets to the Google photo or removes the photo
- removing a profile picture stores `avatar_source = null` with a removal timestamp; users can still choose Use Google photo later

If you customize Supabase email templates later, keep the confirmation link redirect-aware so `emailRedirectTo` continues to send users back to the correct callback URL.

## Production launch checklist

For the public web deployment, update Supabase Authentication -> URL Configuration:

- Site URL: `https://<domain>`
- Redirect URL: `https://<domain>/auth-callback`
- Redirect URL: `selftend://**`
- Redirect URL: `http://localhost:8081/auth-callback`

Do not leave the Site URL set to localhost after production web deployment. If Supabase redirects a completed Google sign-in to `http://localhost:8081`, verify the Site URL, the production redirect allow-list entry, and the exported web app's `EXPO_PUBLIC_PUBLIC_APP_URL`.

If preview deployments need auth testing, add the exact preview callback URL separately rather than broadening production redirects unnecessarily.

In Google Auth Platform, configure the web OAuth client with:

- Authorized JavaScript origin: `https://<domain>`
- Authorized JavaScript origin: `http://localhost:8081`
- Authorized redirect URI: the Supabase provider callback, for example `https://<project-ref>.supabase.co/auth/v1/callback`

See [docs/deployment.md](../docs/deployment.md) for the full web launch checklist.

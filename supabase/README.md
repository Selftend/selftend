# Supabase Notes

The initial schema lives in [supabase/migrations/20260415_initial.sql](migrations/20260415_initial.sql). Later migrations add consent/deletion support, profile avatar storage, language preference sync, and onboarding flags.

## Tables

- `profiles`
- `user_preferences`
- `thought_records`

`profiles` stores account-level metadata only: email plus optional avatar fields. Google OAuth avatars are stored as URLs with `avatar_source = 'oauth'`; manually chosen images store a private Storage object path with `avatar_source = 'upload'`; removed photos keep `avatar_source = null` and set `avatar_updated_at` so the app does not immediately re-import the Google photo.

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

This creates the database tables, consent/deletion functions, profile avatar columns, onboarding preference flags, and the private `profile-pics` storage bucket with RLS policies.

If profile-picture testing shows `avatar_source` missing from the schema cache or a `profile-pics` row-level security error, the active Supabase project is missing the avatar repair migration. The normal fix is:

```bash
npm exec supabase -- db push
```

If `db push` is blocked by a migration-history mismatch, inspect the active project before changing history. The 2026-05-05 repair renamed the consent/deletion migration to `20260503000000_consent_and_deletion.sql` so it sorts before the same-day avatar migrations, repaired remote history, then applied `20260504_add_language_preference.sql`.

```bash
npm exec supabase -- db query --linked -f supabase/migrations/20260503121000_profile_avatar_repair.sql
```

## Linked project status

Last checked: 2026-05-06.

The active linked project migration history was repaired on 2026-05-05 and the onboarding flags migration was applied on 2026-05-06:

- the old remote `20260503` history row was reverted
- the local consent/deletion migration was renamed to `20260503000000_consent_and_deletion.sql`
- `20260503000000`, `20260503120000`, and `20260503121000` were marked applied in remote history
- `20260504_add_language_preference.sql` was applied with `supabase db push`

- `profiles` includes the avatar columns from `20260503120000_profile_avatars.sql`
- `profile-pics` exists as a private bucket with a 5 MB limit and JPEG/PNG/WebP MIME types
- named public RLS policies exist for `profiles`, `user_preferences`, and `thought_records`
- named Storage policies exist for authenticated user-owned objects in `profile-pics`
- `user_preferences.language` exists with the `user_preferences_language_check` constraint
- `user_preferences.app_onboarding_completed` and `user_preferences.cbt_onboarding_completed` exist for account-backed onboarding

The local and remote migration histories currently include `20260506_onboarding_flags.sql`. If a new Supabase project is linked later, apply migrations with `npm exec supabase -- db push` before testing account-backed onboarding.

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

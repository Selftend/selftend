# Supabase Notes

The first schema lives in [supabase/migrations/20260415_initial.sql](migrations/20260415_initial.sql).

## Tables

- `profiles`
- `user_preferences`
- `thought_records`

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

Never put service-role keys, database passwords, SMTP secrets, OAuth secrets, JWT secrets, or other private backend secrets in Expo public env vars.

## First setup

1. create the Supabase project
2. authenticate the CLI:

```bash
npx supabase login
```

3. link the repo to the project:

```bash
npx supabase link --project-ref <your-project-ref>
```

4. apply the existing migration:

```bash
npx supabase db push
```

5. in Supabase dashboard:

- enable the Google provider and paste the Google OAuth client ID and secret
- keep email auth enabled for passwordless magic-link sign-in
6. in Google Auth Platform, create a `Web application` OAuth client and configure:

- Authorized JavaScript origins for your web app, for example `http://localhost:8081`
- Authorized redirect URI from the Supabase Google provider page, which will be your project callback URL such as `https://<project-ref>.supabase.co/auth/v1/callback`

7. add redirect URLs for the app's auth callback flow:

- `mentalhealth://**`
- your local Expo web origin plus `/auth-callback`, for example `http://localhost:8081/auth-callback`
- your production web callback URL, for example `https://<domain>/auth-callback`

8. copy the URL and key into `.env`

## Self-hosting support

The app's backend contract is Supabase Auth plus the public schema and RLS policies in `supabase/migrations`.

Supported modes:

- maintainer-hosted Supabase for the public web app and first Android closed-test build
- bring-your-own Supabase Cloud project
- advanced self-hosted Supabase operated by the self-hoster

For Supabase Cloud, apply migrations with:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

For local development, use:

```bash
npx supabase start
npx supabase db reset
```

For advanced self-hosted Supabase, follow Supabase's official self-hosting docs first, then apply the SQL migrations from this repo to the target database. The operator owns TLS, SMTP/email, backups, upgrades, monitoring, uptime, and incident response.

Runtime backend switching is intentionally deferred. Self-hosters build the app from source with their own public Supabase URL and publishable or anon key.

## Auth callback flow

The app now uses Google OAuth and passwordless email magic links for MVP authentication.

- web OAuth returns through `/auth-callback`
- native OAuth returns through the app scheme and completes in the Google sign-in flow
- web magic links return through `/auth-callback`
- native magic links return through the app scheme and open the callback route directly
- no manual email/password sign-up or password reset screens are part of the MVP

If you customize Supabase email templates later, keep the confirmation link redirect-aware so `emailRedirectTo` continues to send users back to the correct callback URL.

## Production launch checklist

For the public web deployment, update Supabase Authentication -> URL Configuration:

- Site URL: `https://<domain>`
- Redirect URL: `https://<domain>/auth-callback`
- Redirect URL: `mentalhealth://**`
- Redirect URL: `http://localhost:8081/auth-callback`

If preview deployments need auth testing, add the exact preview callback URL separately rather than broadening production redirects unnecessarily.

In Google Auth Platform, configure the web OAuth client with:

- Authorized JavaScript origin: `https://<domain>`
- Authorized JavaScript origin: `http://localhost:8081`
- Authorized redirect URI: the Supabase provider callback, for example `https://<project-ref>.supabase.co/auth/v1/callback`

See [docs/deployment.md](../docs/deployment.md) for the full web launch checklist.

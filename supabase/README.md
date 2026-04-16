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

8. copy the URL and key into `.env`

## Auth callback flow

The app now uses Google OAuth and passwordless email magic links for MVP authentication.

- web OAuth returns through `/auth-callback`
- native OAuth returns through the app scheme and completes in the Google sign-in flow
- web magic links return through `/auth-callback`
- native magic links return through the app scheme and open the callback route directly
- no manual email/password sign-up or password reset screens are part of the MVP

If you customize Supabase email templates later, keep the confirmation link redirect-aware so `emailRedirectTo` continues to send users back to the correct callback URL.

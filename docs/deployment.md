# Web Deployment

Last checked: 2026-05-05

This project should launch the browser app as a single-page Expo web export. Do not add a separate backend, analytics SDK, or server-rendered web stack for v1 unless a concrete requirement appears.

Recommended production shape:

- Domain registrar and DNS: Porkbun, using `selftend.org`
- Frontend host: Netlify
- Backend: Supabase
- App routing: Expo Router, with `app/+not-found.tsx` handling unmatched routes at runtime

Netlify serves the browser app and public policy pages. Supabase manages accounts, sessions, OAuth, and private app data for both web and native builds. Keep those responsibilities separate: do not add a custom web backend just to host the Expo app, and do not move the frontend into Supabase Edge Functions by default.

For self-hosted and bring-your-own-Supabase builds, see [self-hosting.md](self-hosting.md).

Official references:

- Expo publishing websites: <https://docs.expo.dev/guides/publishing-websites/>
- Netlify deploy configuration: <https://docs.netlify.com/configure-builds/file-based-configuration/>
- Netlify redirects and rewrites: <https://docs.netlify.com/routing/redirects/>
- Netlify custom domains: <https://docs.netlify.com/domains-https/custom-domains/>
- Supabase redirect URLs: <https://supabase.com/docs/guides/auth/redirect-urls>
- Supabase custom domains: <https://supabase.com/docs/guides/platform/custom-domains>

## Domain Purchase

Use `selftend.org` as the canonical production domain if it is available.

When buying the domain:

- confirm the spelling is exactly `selftend.org`
- buy one year first
- enable auto-renew after purchase
- keep WHOIS privacy enabled
- enable registrar account 2FA
- do not buy bundled web hosting
- do not buy paid email hosting unless there is a separate reason

Porkbun's included email forwarding is enough for early aliases such as `support@selftend.org`, `privacy@selftend.org`, and `security@selftend.org`.

## Hosting Portability

Netlify is the recommended first production frontend host. It is not a backend dependency. Supabase remains the backend for auth, database, storage, and any future Supabase Edge Functions.

Do not move the frontend app into Supabase Edge Functions as the default plan. Supabase custom domains are for Supabase project URLs such as APIs, Auth, Storage, and Edge Functions; Supabase documents that custom domains are not intended to host frontend applications through Edge Functions.

The portable contract is:

- build the web app with `npm run export:web`
- deploy `dist` to a static frontend host
- require the frontend host to serve `index.html` for unknown navigation routes
- let Expo Router handle unmatched paths with `app/+not-found.tsx`
- keep app URLs in environment variables and Supabase dashboard configuration, not hard-coded into app flows

## Netlify Deployment

Auto-deploy on push to `main` is disabled. Deploys are triggered manually from the Netlify dashboard (Deploys → Trigger deploy) to stay within the free-tier build-minute budget. Do not re-enable continuous deployment without checking remaining credits for the billing period.

This repo also includes a manual GitHub Actions workflow, `Web production deploy`, for maintainer-triggered production deploys from the current `main` branch. Use that workflow when you want a reproducible deploy from GitHub without enabling Netlify's continuous deployment hook.

This repo includes [netlify.toml](../netlify.toml), which sets:

- build command: `npm run export:web`
- publish directory: `dist`
- Node version: `20.19.0`
- SPA fallback: `/*` rewrites to `/index.html`

Netlify setup:

1. Create or sign in to a Netlify account.
2. Add a new site from GitHub.
3. Select `vasilyoshev/self-tend`.
4. Use the settings from `netlify.toml`.
5. Add production environment variables listed below.
6. Deploy from `main`.
7. Open the Netlify preview URL and verify the public routes.
8. Add `selftend.org` as the production custom domain.
9. Keep DNS at Porkbun unless there is a reason to move it.
10. Add the DNS records Netlify provides into Porkbun DNS.
11. Wait for HTTPS certificate provisioning to complete.

Required Netlify environment variables:

```text
EXPO_PUBLIC_SUPABASE_URL=<supabase-project-url>
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key>
EXPO_PUBLIC_GITHUB_REPO_URL=https://github.com/vasilyoshev/self-tend
EXPO_PUBLIC_PUBLIC_APP_URL=https://selftend.org
EXPO_PUBLIC_SUPPORT_EMAIL=support@selftend.org
EXPO_PUBLIC_PRIVACY_EMAIL=privacy@selftend.org
EXPO_PUBLIC_SECURITY_EMAIL=security@selftend.org
EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=<vapid-public-key>
```

Optional:

```text
EXPO_PUBLIC_EAS_PROJECT_ID=032dd368-6eae-4a70-bbe5-4ccef2fc06cb
```

`EXPO_PUBLIC_PUBLIC_APP_URL` is baked into the JavaScript bundle during export and is used as the explicit web auth callback base. If it changes or was missing, update the Netlify environment variable and redeploy.

`EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` is also baked into the web bundle. Browser reminders stay disabled until this public key is present and the matching private key is configured in Supabase Edge Function secrets.

### Web Push Reminders

Web push reminders use the browser Push API, `public/selftend-push-worker.js`, the `web_push_subscriptions` table, and the `send-web-reminders` Supabase Edge Function. Native Android and iOS builds keep using local Expo Notifications.

Because the app uses `web.output = "single"`, PWA head tags are added through `public/index.html`. Keep the manifest and push worker in `public/` so `npm run export:web` copies them to `dist`.

Before production web push testing:

1. Generate VAPID keys, for example with `npx web-push generate-vapid-keys`.
2. Set `EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` in Netlify and GitHub repository variables.
3. Apply the database migration so `web_push_subscriptions`, `pg_cron`, `pg_net`, and Vault are available:

```bash
npm exec supabase -- db push
```

4. Set Supabase Edge Function secrets:

```bash
npm exec supabase -- secrets set WEB_PUSH_VAPID_PUBLIC_KEY=<public-key>
npm exec supabase -- secrets set WEB_PUSH_VAPID_PRIVATE_KEY=<private-key>
npm exec supabase -- secrets set WEB_PUSH_VAPID_SUBJECT=mailto:support@selftend.org
npm exec supabase -- secrets set WEB_PUSH_CRON_SECRET=<random-secret>
```

5. Store matching database Vault secrets for the cron invoker:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'selftend_supabase_url');
select vault.create_secret('<same-random-secret>', 'selftend_web_push_cron_secret');
```

6. Deploy the Edge Function and schedule the cron job:

```bash
npm exec supabase -- functions deploy send-web-reminders
```

Then run in the Supabase SQL editor:

```sql
select public.schedule_send_web_reminders_cron();
```

iOS and iPadOS web push requires the user to install the web app to the Home Screen before enabling reminders. Normal Safari tabs should be treated as unsupported.

### GitHub Actions Web Deploy

The manual `.github/workflows/web-deploy.yml` workflow:

- checks out `main`
- installs dependencies with Node `20.19.0`
- runs `npm run export:web`
- deploys `dist` to Netlify production with `netlify-cli`

Required GitHub repository variables:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_GITHUB_REPO_URL
EXPO_PUBLIC_PUBLIC_APP_URL
EXPO_PUBLIC_SUPPORT_EMAIL
EXPO_PUBLIC_PRIVACY_EMAIL
EXPO_PUBLIC_SECURITY_EMAIL
EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY
```

`EXPO_PUBLIC_GITHUB_REPO_URL` is optional in app code because a default exists, but setting it in GitHub keeps the release environment explicit.

Required GitHub repository secrets:

```text
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID
```

Use GitHub repository or environment protection rules if more than one maintainer can run production deploys.

## Web Build

Build command:

```bash
npm run export:web
```

Equivalent raw command:

```bash
npm exec expo -- export -p web --clear
```

Output directory:

```text
dist
```

Local production smoke:

```bash
npm run serve:web:production
```

The web build uses `web.output = "single"` in [app.config.ts](../app.config.ts). Unknown routes should load `index.html`, then Expo Router handles the unmatched path at runtime with [app/+not-found.tsx](../app/+not-found.tsx). Do not add duplicate provider-specific 404 pages for this behavior.

## Production Headers

[public/\_headers](../public/_headers) contains the Netlify security headers. Keep the Content Security Policy restrictive, but allow avatar images from:

- `https://*.supabase.co` for private Storage signed URLs
- `https://*.googleusercontent.com` for Google OAuth profile photos

If profile photo upload or Google photo restore reports success in production but the image does not render, verify the deployed `img-src` directive first.

### CSP `'unsafe-inline'` note

The `script-src` and `style-src` directives include `'unsafe-inline'`. This is required because:

- Expo web injects inline scripts during the bundle bootstrap.
- NativeWind generates inline `style` attributes for Tailwind classes at runtime.

Removing `'unsafe-inline'` breaks the web build. If Expo adds nonce-based CSP support in a future SDK version, revisit and tighten these directives. Until then, this is an accepted trade-off documented here for auditor visibility.

### HSTS preload

The HSTS header includes the `preload` directive. After the first production deploy to `selftend.org`, submit the domain to <https://hstspreload.org> to be included in browser preload lists.

## Public Routes To Verify

These routes must be reachable without signing in:

- `/privacy`
- `/terms`
- `/crisis`
- `/account-deletion`
- `/auth-callback`
- a deliberately unknown route, such as `/missing-test`, should load the app and render the simple not-found screen with a home link

The Google Play privacy policy URL should use the production domain:

```text
https://selftend.org/privacy
```

The Google Play account deletion URL should be:

```text
https://selftend.org/account-deletion
```

## Supabase Auth Configuration

In Supabase Dashboard, open Authentication -> URL Configuration.

Set Site URL:

```text
https://selftend.org
```

Add redirect URLs:

```text
https://selftend.org/auth-callback
selftend://**
http://localhost:8081/auth-callback
```

Supabase recommends exact production redirect URLs instead of broad wildcards for production. Keep broad patterns limited to native deep links and preview/local workflows where they are needed.

## Google OAuth Configuration

In Google Auth Platform for the web OAuth client:

Authorized JavaScript origins:

```text
https://selftend.org
http://localhost:8081
```

Authorized redirect URI:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Use the exact redirect URI shown by the Supabase Google provider page for the active project.

## Magic-Link Email Configuration

Passwordless email sign-in uses `emailRedirectTo` from the app:

- web returns to `https://selftend.org/auth-callback`
- native returns to `selftend://auth-callback`

If Supabase email templates are customized, keep them redirect-aware by using the redirect target rather than hard-coding the Site URL.

## Pre-Deployment Verification

Run:

```bash
npm run typecheck
npm test -- --runInBand
npm run export:web
npm run serve:web:production
```

Manual smoke:

- open `/privacy`, `/terms`, `/crisis`, and `/account-deletion`
- open `/auth-callback` directly and confirm the missing-link state renders
- open `/missing-test` and confirm the not-found screen renders
- sign in with Google on web
- sign in with a magic link on web
- create, edit, and archive a CBT record against the live Supabase project

### Account Deletion E2E Verification

Run this against a real Supabase instance (staging or production) to confirm the `delete_user_account()` RPC works with full privileges:

1. Sign up a throwaway test user (e.g., `delete-test@example.com`).
2. Accept policy consent so `user_preferences` row is created.
3. Create at least one thought record.
4. Upload a profile avatar.
5. Call data export and confirm the JSON contains profile, preferences, and thought records:
   ```sql
   select public.export_user_data();
   ```
6. Call account deletion from the app Settings screen, or directly:
   ```sql
   select public.delete_user_account();
   ```
7. Verify cleanup — all of the following should return zero rows:
   ```sql
   select * from auth.users where email = 'delete-test@example.com';
   select * from public.profiles where user_id = '<uid>';
   select * from public.user_preferences where user_id = '<uid>';
   select * from public.thought_records where user_id = '<uid>';
   ```
8. Verify Storage bucket `profile-pics/<uid>/` folder no longer contains files (check via Supabase Dashboard → Storage).

If step 6 fails with a permissions error, the function owner (usually `postgres`) does not have `DELETE` access on `auth.users`. In hosted Supabase this should work by default since `security definer` functions run as the function owner. If using a self-hosted setup, ensure the migration was run by a superuser role.

## Acceptance

Web launch is acceptable only when:

- the app loads over HTTPS on `https://selftend.org`
- unknown browser routes render the app not-found screen
- public policy and account-deletion routes are reachable without signing in
- Supabase Google sign-in returns to `/auth-callback`
- Supabase magic links return to `/auth-callback`
- authenticated CBT persistence works against the intended Supabase project
- support/privacy/security contacts are real operational inboxes
- crisis and legal copy has been reviewed for the target launch jurisdictions

## Troubleshooting

### Unknown routes show Netlify's 404 page

Check in this order:

1. Confirm [netlify.toml](../netlify.toml) is present in the deployed branch.
2. Confirm the latest Netlify deploy used the repo root, not a subdirectory.
3. Confirm publish directory is `dist`.
4. Confirm the deployed `netlify.toml` has the `/*` rewrite to `/index.html`.
5. Redeploy from `main`.

### Google sign-in returns to `localhost:8081`

This usually means Supabase fell back to its configured Site URL instead of completing at the production callback URL. Check in this order:

1. In Supabase Authentication -> URL Configuration, set Site URL to:

```text
https://selftend.org
```

2. In the same Supabase screen, make sure this exact redirect URL is present:

```text
https://selftend.org/auth-callback
```

3. Keep the local callback only as an additional development redirect, not as the Site URL:

```text
http://localhost:8081/auth-callback
```

4. In Netlify, set and redeploy with:

```text
EXPO_PUBLIC_PUBLIC_APP_URL=https://selftend.org
```

5. After redeploy, retry from a fresh browser tab. If a token-bearing URL was exposed during testing, sign out of the app and revoke or expire that session before continuing.

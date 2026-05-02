# Web Deployment

Last checked: 2026-05-02

This project should launch the browser app as a static Expo web export. Do not add a separate backend, analytics SDK, or server-rendered web stack for v1 unless a concrete requirement appears.

Official references:

- Expo publishing websites: <https://docs.expo.dev/guides/publishing-websites/>
- Cloudflare Pages limits: <https://developers.cloudflare.com/pages/platform/limits/>
- Supabase redirect URLs: <https://supabase.com/docs/guides/auth/redirect-urls>

## Required owner inputs

Before deployment, confirm:

- temporary web-test domain: `https://yoshevbot.uk`
- DNS access: domain is under Cloudflare
- final public app name
- public support email alias
- public privacy/contact email alias
- legal entity or nonprofit organization name, if available
- crisis-resource jurisdictions to list publicly; current owner intent is broad/global availability

Do not treat the policy pages as final until those values are filled in and reviewed.

## Current web-test decision

Use the apex domain `yoshevbot.uk` as the temporary public web-test domain. The owner already owns the domain, there is no current conflicting use, and it is managed through Cloudflare. A better purpose-fit domain can replace it later.

Use Cloudflare Pages first because the near-term goal is the cheapest reliable static hosting path. Keep the app as a static Expo web export backed by Supabase.

Recommended public URLs for the web test:

```text
https://yoshevbot.uk
https://yoshevbot.uk/auth-callback
https://yoshevbot.uk/privacy
https://yoshevbot.uk/account-deletion
```

Recommended contact posture for the web test:

- do not publish a personal Gmail address directly as the app's long-term public contact
- current public support alias: `support@yoshevbot.uk`
- create Cloudflare Email Routing aliases such as `privacy@yoshevbot.uk` and `security@yoshevbot.uk` before broader public testing
- forward those aliases to the owner's real inbox until a shared mailbox is justified
- configure the public aliases in hosting environment variables

## Cloudflare Pages Git deployment

Prefer Git integration over Direct Upload. Git integration can automatically deploy whenever the production branch changes, which is the desired workflow for this repo. Direct Upload is useful for manual experiments, but Cloudflare documents that a Direct Upload project cannot later be switched to Git integration.

Recommended setup:

1. In Cloudflare, open Workers & Pages.
2. Create a Pages project.
3. Choose Git integration and connect the GitHub repository.
4. Select `main` as the production branch.
5. Set build command: `npm run export:web`.
6. Set build output directory: `dist`.
7. Set `NODE_VERSION=20.19.0` or newer in build environment variables.
8. Add the public and Supabase environment variables listed below.
9. Add `yoshevbot.uk` as a custom domain for the Pages project.

After this is connected, pushes or merges to `main` should trigger production deployments automatically. Pull requests and non-production branches can use Pages preview deployments if preview branch builds are enabled.

## Static web build

Build command:

```bash
npm run export:web
```

Equivalent raw command:

```bash
npx expo export -p web
```

Output directory:

```text
dist
```

Local production smoke:

```bash
npm run serve:web:production
```

The `public/_headers` file is copied into `dist` during export. Rebuild after editing anything in `public/`.

## Cloudflare Pages setup

Use Cloudflare Pages unless the owner chooses another static host.

Recommended project settings:

- Framework preset: none / custom
- Build command: `npm run export:web`
- Build output directory: `dist`
- Node version: `20.19.0` or newer

Environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_GITHUB_REPO_URL`
- `EXPO_PUBLIC_PUBLIC_APP_URL=https://yoshevbot.uk`
- `EXPO_PUBLIC_SUPPORT_EMAIL=support@yoshevbot.uk`
- `EXPO_PUBLIC_PRIVACY_EMAIL=support@yoshevbot.uk` temporarily, or `privacy@yoshevbot.uk` after that alias exists
- `EXPO_PUBLIC_SECURITY_EMAIL=security@yoshevbot.uk` after that alias exists
- `EXPO_PUBLIC_EAS_PROJECT_ID` only if overriding the configured project ID

Current Cloudflare Pages free-plan planning limits include 500 builds per month, 100 custom domains per project, and static file limits. Verify the linked limits page before relying on those numbers for launch capacity.

## Public routes to verify

These routes must be reachable without signing in:

- `/privacy`
- `/terms`
- `/crisis`
- `/account-deletion`
- `/auth-callback`

The Google Play privacy policy URL should use the final domain, not a localhost, preview, or repository-editing URL. Prefer:

```text
https://yoshevbot.uk/privacy
```

The Google Play account deletion URL should be:

```text
https://yoshevbot.uk/account-deletion
```

## Supabase auth configuration

In Supabase Dashboard, open Authentication -> URL Configuration.

Set Site URL:

```text
https://yoshevbot.uk
```

Add redirect URLs:

```text
https://yoshevbot.uk/auth-callback
mentalhealth://**
http://localhost:8081/auth-callback
```

Optional preview redirect, only if Cloudflare preview deployments are used for auth testing:

```text
https://<pages-project>.pages.dev/auth-callback
```

Supabase recommends exact production redirect URLs instead of broad wildcards for production. Keep broad patterns limited to native deep links and preview/local workflows where they are needed.

## Google OAuth configuration

In Google Auth Platform for the web OAuth client:

Authorized JavaScript origins:

```text
https://yoshevbot.uk
http://localhost:8081
```

Authorized redirect URI:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Use the exact redirect URI shown by the Supabase Google provider page for the active project.

## Magic-link email configuration

Passwordless email sign-in uses `emailRedirectTo` from the app:

- web returns to `https://<domain>/auth-callback`
- native returns to `mentalhealth://auth-callback`

If Supabase email templates are customized, keep them redirect-aware by using the redirect target rather than hard-coding the Site URL.

## Pre-deployment verification

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
- sign in with Google on web
- sign in with a magic link on web
- create, edit, and archive a CBT record against the live Supabase project

## Acceptance

Web launch is acceptable only when:

- the app loads over HTTPS on the final domain
- public policy and account-deletion routes are reachable without sign-in
- Supabase Google sign-in returns to `/auth-callback`
- Supabase magic links return to `/auth-callback`
- authenticated CBT persistence works against the intended Supabase project
- support/privacy/security contacts are real operational inboxes
- crisis and legal copy has been reviewed for the target launch jurisdictions

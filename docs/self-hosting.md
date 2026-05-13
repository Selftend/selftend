# Future Data Separation And Backend Portability

The first web and Android testing path uses the maintainer-hosted Supabase project. Data separation is still a product direction, but it should not block public web testing or Google Play closed testing.

Preferred future paths:

- non-technical users: local-only records with export/import
- technical users: bring-your-own Supabase Cloud project
- operators: advanced self-hosted Supabase

References:

- Supabase self-hosting with Docker: <https://supabase.com/docs/guides/self-hosting/docker>
- Supabase local development and migrations: <https://supabase.com/docs/guides/local-development/overview>
- PikaPods docs: <https://docs.pikapods.com/>

## Supported Modes

### Maintainer Hosted Sync

Current launch path and default public product path:

- Expo web app on Netlify or equivalent static host
- maintainer Supabase project
- mobile builds configured with maintainer Supabase URL and publishable key

This is the only mode planned for the first Google Play closed-test build.

### Local-Only Personal Data

Planned privacy path for non-technical users:

- no Supabase account for local records
- records stay on device or browser profile
- no cross-device sync by default
- moving devices requires export/import unless backup is added
- deletion means deleting local app data, with platform caveats

Do not claim perfect secrecy: device backups, browser storage, OS diagnostics, and exports can still expose data.

### Bring Your Own Supabase Cloud

Technical users can create their own Supabase project, apply `supabase/migrations`, configure auth/OAuth/redirects, and build the web or native app with their own public Supabase URL and publishable key.

### Advanced Self-Hosted Supabase

Operators can run Supabase themselves, but they own server maintenance, security hardening, Postgres, backups, disaster recovery, monitoring, uptime, scaling, email, OAuth, support, privacy policy, and deletion operations.

The project documents this path but does not maintain a production Docker Compose stack for Supabase.

## Portability Contract

The client currently depends on:

- Supabase Auth for accounts, sessions, magic links, and Google OAuth
- Supabase Postgres tables and RLS in `supabase/migrations`
- Supabase client access from Expo using public URL and publishable/anon key
- auth redirects for web and native flows

Before Play Store closed testing, do not replace Supabase or add automatic cloud sync, custom backend adapters, Firebase/Appwrite/custom API support, or a project-maintained production Docker stack.

## Future Data-Location UX

After export/delete and local-only storage exist, the app can ask before sign-in:

1. `Use hosted sync`
2. `Keep data on this device`
3. `Use my own Supabase`

Settings should offer the same area later. Switching data locations must not silently move records; users should explicitly export and import.

Recommended privacy sequence:

1. hosted account/data deletion
2. hosted data export
3. local-only storage
4. import into local or hosted storage
5. encrypted backup file export
6. custom Supabase runtime connection
7. optional Google Drive sync after encryption, merge behavior, and policy review

Manual export/import comes before automatic Google Drive sync. Drive sync adds OAuth scopes, app verification, conflict handling, encryption decisions, background sync, and more Google Play disclosure.

## Public Build-Time Environment

Required:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase.example.org
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<public-publishable-or-anon-key>
EXPO_PUBLIC_PUBLIC_APP_URL=https://your-app.example.org
EXPO_PUBLIC_SUPPORT_EMAIL=support@example.org
EXPO_PUBLIC_PRIVACY_EMAIL=privacy@example.org
EXPO_PUBLIC_SECURITY_EMAIL=security@example.org
```

Optional:

```bash
EXPO_PUBLIC_GITHUB_REPO_URL=https://github.com/Selftend/selftend
EXPO_PUBLIC_EAS_PROJECT_ID=032dd368-6eae-4a70-bbe5-4ccef2fc06cb
EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=<public-vapid-key>
```

Never put service-role keys, database passwords, SMTP passwords, OAuth secrets, JWT secrets, private API keys, or backup credentials in Expo public variables. They are bundled into the client app.

## Database Setup

Supabase Cloud:

```bash
npm exec supabase -- login
npm exec supabase -- link --project-ref <project-ref>
npm exec supabase -- db push
```

Local development:

```bash
npm exec supabase -- start
npm exec supabase -- db reset
```

Self-hosted operators should follow Supabase's official docs, then apply this repo's migrations to the target Postgres database.

## Web Push Reminders

Native reminders are local device schedules. Browser reminders are optional for self-hosters and require:

- `EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`
- private VAPID secrets for `send-web-reminders`
- `WEB_PUSH_CRON_SECRET`
- Vault secrets named `selftend_supabase_url` and `selftend_web_push_cron_secret`
- Supabase Cron via `select public.schedule_send_web_reminders_cron();`

Do not schedule cron until the Edge Function and secrets are complete.

## Auth, Web, And Native Builds

Each backend owner configures redirects:

```text
https://<app-domain>/auth-callback
selftend://**
http://localhost:8081/auth-callback
```

Google OAuth uses that Supabase instance's provider callback, for example:

```text
https://<supabase-domain>/auth/v1/callback
```

Build the web app with `npm run export:web` and serve locally with `npm run serve:web:production`. Deploy `dist` to any HTTPS static host that serves `index.html` for unknown routes.

The public Android closed-test build uses the maintainer backend. Self-hosters who want native apps must build their own binaries with their own public Supabase configuration and handle app identifiers, store accounts, redirects, support contacts, privacy policy, and deletion process.

## Managed Self-Hosting Research

PikaPods is not supported yet. Future review should check whether it can run or approximate the required Supabase stack, auth/email setup, backups, custom domains, TLS, upgrades, export/deletion, and acceptable costs.

Document managed self-hosting as a possibility, not a launch promise.

The app remains wellness and guided self-help, not therapy, diagnosis, or emergency support, regardless of who hosts it.

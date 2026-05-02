# Self-Hosting and Backend Portability

Last checked: 2026-05-02

Self-hosting support for the pre-Android milestone means the app can be built against a Supabase-compatible backend by changing public build-time configuration. It does not mean the app has a runtime backend picker.

Official references:

- Supabase self-hosting with Docker: <https://supabase.com/docs/guides/self-hosting/docker>
- Supabase local development and migrations: <https://supabase.com/docs/guides/local-development/overview>
- PikaPods docs: <https://docs.pikapods.com/>

## Supported modes

### 1. Maintainer hosted

This is the default public product path.

- Web app: Cloudflare Pages static Expo export.
- Backend: the maintainer's Supabase project.
- Mobile builds: EAS builds configured with the maintainer's Supabase URL and publishable key.

This is the only mode planned for the first Google Play closed-test build.

### 2. Bring your own Supabase Cloud project

This is the easiest self-host-like path for technical users who want their own backend without operating servers.

Self-hoster responsibilities:

- create a Supabase project
- apply this repo's migrations from `supabase/migrations`
- configure email auth and any OAuth providers they want
- configure redirect URLs for their web domain and native scheme
- build the web or native app with their own public Supabase URL and publishable key

### 3. Advanced self-hosted Supabase

This is for operators who want to run Supabase on their own infrastructure. Supabase's official self-hosting path uses Docker Compose and assumes server administration, Docker, networking, DNS, and firewall knowledge. The operator is responsible for server maintenance, security hardening, Postgres maintenance, backups, disaster recovery, monitoring, uptime, high availability, and scaling.

For this project, advanced self-hosting is supported only as a documented operator path. The project does not currently maintain its own production Docker Compose stack for Supabase.

## Backend portability contract

The client currently depends on:

- Supabase Auth for accounts, sessions, magic links, and Google OAuth
- Supabase Postgres tables and RLS policies in `supabase/migrations`
- Supabase client access from Expo using public URL and publishable or anon key
- auth callback redirects for web and native app flows

The MVP does not require:

- a custom JavaScript backend
- analytics SDKs
- server-rendered web
- proprietary hosted-only APIs
- runtime backend selection

Do not replace Supabase with a different backend before Play Store closed testing. Preserve portability by keeping all schema changes in migrations and keeping client code pointed at public Supabase configuration.

## Public build-time environment

Self-hosters can start from [.env.self-host.example](../.env.self-host.example).

Required public values:

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
EXPO_PUBLIC_GITHUB_REPO_URL=https://github.com/vasilyoshev/mental-health
EXPO_PUBLIC_EAS_PROJECT_ID=6f95348d-9f04-436a-aaf8-f8f20f71d6d9
```

Never put these in Expo public variables:

- Supabase service-role keys
- database passwords
- SMTP passwords
- OAuth client secrets
- JWT secrets
- private API keys
- backup credentials

Expo public variables are bundled into the client app and should be treated as visible to users.

## Database setup

For Supabase Cloud:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

For local development:

```bash
npx supabase start
npx supabase db reset
```

For self-hosted Supabase, follow Supabase's official self-hosting docs first, then apply the SQL migrations from `supabase/migrations` to the target Postgres database. The exact deployment and migration command depends on how the operator exposes the database and manages credentials.

## Auth and redirects

Each backend owner must configure auth redirects for their own domains.

Web callback:

```text
https://<app-domain>/auth-callback
```

Native callback:

```text
mentalhealth://**
```

Local web callback:

```text
http://localhost:8081/auth-callback
```

Google OAuth, if enabled, must use the Supabase auth provider callback for that Supabase instance, for example:

```text
https://<supabase-domain>/auth/v1/callback
```

For Supabase Cloud projects, use the exact callback URL shown in the Supabase Dashboard Google provider settings.

## Web build

Build the static web app:

```bash
npm run export:web
```

Serve locally:

```bash
npm run serve:web:production
```

Self-hosters can deploy `dist` to any static host that supports HTTPS and direct route access to generated Expo Router files.

## Native builds

The public Android closed-test build will use the maintainer backend.

Self-hosters who want native apps must build their own binaries from source with their own public Supabase configuration:

```bash
npm run build:android:production
```

They must also handle their own app identifiers, store accounts, auth redirect configuration, support contacts, privacy policy, and account deletion process.

## PikaPods and managed self-hosting

PikaPods is not a supported deployment target yet. Its docs describe hosting open-source apps with managed files, database access, custom domains, and backups, but this project has not verified whether PikaPods can run the required Supabase-compatible backend stack for production.

Future research should check:

- whether the full Supabase stack can be hosted or approximated
- auth provider and email configuration support
- backup and restore behavior
- domain and TLS support
- upgrade process
- data export and deletion workflows
- cost and maintenance burden

Until that review is complete, document PikaPods as a possible future managed self-hosting option, not as a launch promise.

## Operator responsibilities

Anyone running their own backend is responsible for:

- privacy policy and terms for their deployment
- account deletion and data deletion operations
- backups and restore tests
- software updates and security patches
- SMTP/email deliverability
- OAuth provider configuration
- monitoring and uptime
- abuse handling and child-safety obligations for their jurisdiction

The app remains wellness and guided self-help, not therapy, diagnosis, or emergency support, regardless of who hosts it.

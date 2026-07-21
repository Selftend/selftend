# GitHub Setup

## Current state

The project has been renamed to Selftend. If the GitHub repository is newly created or manually renamed, use:

Create the empty repository first:

- owner: `Selftend`
- name: `selftend`

Remote setup after creation or manual rename:

```bash
git remote add origin git@github.com:Selftend/selftend.git
git branch -M main
git push -u origin main
```

If the old remote already exists, update it only after the GitHub repository has been renamed:

```bash
git remote set-url origin git@github.com:Selftend/selftend.git
```

## Prepared files

This repo already includes:

- `.github/workflows/ci.yml`
- `.github/workflows/android-release.yml`
- `.github/workflows/android-development.yml`
- `.github/workflows/web-deploy.yml`
- `.github/pull_request_template.md`
- issue templates
- `.github/labels.yml`

## Workflows

`CI` runs on pull requests and pushes to `main` with Node `22.23.1`.

The main CI verification job checks linting, formatting, typechecking, and tests through `npm run verify`. CI also runs integration and end-to-end jobs against local Supabase.

The Husky pre-commit hook runs `lint-staged`, not the full CI suite. For staged JS/TS files, `lint-staged` runs `eslint --fix`, `prettier --write`, and related Jest tests. For staged JSON, Markdown, YAML, and CSS files, it runs `prettier --write`.

Workspace settings in `.vscode/settings.json` make Prettier the default VS Code/Cursor formatter and enable format-on-save. The ESLint extension is recommended for inline diagnostics, but ESLint enforcement is handled by terminal, Husky, and CI checks.

`Android Play closed testing release` is manual. It checks out `main`, runs a local EAS Android production build on the GitHub runner, uploads the `.aab` artifact, and can release it to the Google Play closed testing (alpha) track.

`Android development APK` is manual. It checks out a chosen ref (defaults to the workflow ref), runs a local EAS Android development build on the GitHub runner via `npm run build:android:development:local`, and uploads the resulting `.apk` as an artifact. It does not submit to Google Play; use it for ad-hoc tester APKs that don't need a Play track.

`Web production deploy` is manual. It checks out `main`, exports the Expo web app, and deploys `dist` to the production Cloudflare Worker (`wrangler.toml`); staging deploys run from `staging.yml` on push to `dev` against `wrangler.staging.toml`.

### Release variables

| Variable                                | Web deploy           | Android release      | Android development | Notes                                                                                                                |
| --------------------------------------- | -------------------- | -------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`              | required (validated) | required (validated) | consumed            | App auth target.                                                                                                     |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | required (validated) | required (validated) | consumed            | The legacy alias `EXPO_PUBLIC_SUPABASE_ANON_KEY` is still accepted as a fallback by `src/lib/env.ts`.                |
| `EXPO_PUBLIC_PUBLIC_APP_URL`            | required (validated) | required (validated) | consumed            | Web auth callback base; production must set it.                                                                      |
| `EXPO_PUBLIC_SUPPORT_EMAIL`             | required (validated) | required (validated) | consumed            | Public support contact rendered in-app.                                                                              |
| `EXPO_PUBLIC_PRIVACY_EMAIL`             | required (validated) | required (validated) | consumed            | Public privacy contact.                                                                                              |
| `EXPO_PUBLIC_SECURITY_EMAIL`            | required (validated) | required (validated) | consumed            | Public security contact.                                                                                             |
| `EXPO_PUBLIC_EAS_PROJECT_ID`            | consumed             | consumed             | consumed            | Defaulted in `app.config.ts` to the production project id; setting it is recommended but unset builds still succeed. |
| `EXPO_PUBLIC_GITHUB_REPO_URL`           | consumed             | consumed             | consumed            | Defaulted in `src/lib/env.ts` to `https://github.com/Selftend/selftend`.                                             |
| `EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` | deferred             | n/a                  | n/a                 | Set when web push reminders are deployed; missing value disables web reminders only.                                 |
| `EXPO_PUBLIC_PLAY_STORE_URL`            | optional             | n/a                  | n/a                 | Play Store URL shown on web surfaces; empty shows a "Coming soon" chip.                                              |
| `EXPO_PUBLIC_APP_STORE_URL`             | optional             | n/a                  | n/a                 | App Store URL shown on web surfaces; empty shows a "Coming soon" chip.                                               |
| `EXPO_PUBLIC_DISCORD_URL`               | optional             | optional             | optional            | Defaulted in `src/lib/env.ts` to the maintainer's Discord invite; empty string hides all Discord UI.                 |

"required (validated)" means the workflow's `Check release environment` / `Check deploy environment` step (`android-release.yml` lines 101-120, `web-deploy.yml` lines 47-67) fails the run if the value is unset.

### Release secrets

| Secret                             | Web deploy | Android release                                   | Android development | Notes                                                                          |
| ---------------------------------- | ---------- | ------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------ |
| `EXPO_TOKEN`                       | n/a        | required                                          | required            | EAS authentication for both Android builds.                                    |
| `CLOUDFLARE_API_TOKEN`             | required   | n/a                                               | n/a                 | Wrangler deploy ("Edit Cloudflare Workers" template token; per-Environment).   |
| `CLOUDFLARE_ACCOUNT_ID`            | required   | n/a                                               | n/a                 | Cloudflare account id (not sensitive, stored alongside the token).             |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | n/a        | required only when `submit_to_play` input is true | n/a                 | The release workflow errors out when this is missing while submitting to Play. |

Use GitHub branch, environment, or workflow permission controls before sharing release rights with additional maintainers.

## Suggested labels

Prepared label set:

- `needs triage`
- `design`
- `qa`
- `privacy`
- `safety`
- `accessibility`
- `security`
- `auth`
- `ui`
- `i18n`
- `dependencies`
- `platform: web`
- `platform: android`
- `platform: ios`
- `good first issue`
- `help wanted`

## PR expectations

- keep PRs focused
- update docs when product behavior changes
- let lint-staged, Husky, and CI enforce automated checks
- call out privacy, safety, and licensing impact explicitly

## Branching

See [releasing.md](releasing.md) for the full branch and release model. In short:

- `dev` is the integration branch: branch off it, PR into it, squash-merge
- `main` is the release branch: it only receives the `dev→main` promotion PR (merge commit), `hotfix/*` PRs, and release-please's PRs
- both branches are protected; prefer draft PRs for larger work

## Repository setup checklist

Use this when configuring a new GitHub remote or mirror:

1. create the prepared labels
2. enable GitHub Actions
3. enable issue templates
4. decide whether to protect `main`

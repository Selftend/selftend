# GitHub Setup

## Current state

The project has been renamed to Selftend. If the GitHub repository is newly created or manually renamed, use:

Create the empty repository first:

- owner: `vasilyoshev`
- name: `self-tend`

Remote setup after creation or manual rename:

```bash
git remote add origin git@github.com:vasilyoshev/self-tend.git
git branch -M main
git push -u origin main
```

If the old remote already exists, update it only after the GitHub repository has been renamed:

```bash
git remote set-url origin git@github.com:vasilyoshev/self-tend.git
```

## Prepared files

This repo already includes:

- `.github/workflows/ci.yml`
- `.github/workflows/android-release.yml`
- `.github/workflows/web-deploy.yml`
- `.github/pull_request_template.md`
- issue templates
- `.github/labels.yml`

## Workflows

`CI` runs on pull requests and pushes to `main` with Node `20.19.0`.

The main CI verification job checks linting, formatting, typechecking, and tests through `npm run verify`. CI also runs integration and end-to-end jobs against local Supabase.

The Husky pre-commit hook runs `lint-staged`, not the full CI suite. For staged JS/TS files, `lint-staged` runs `eslint --fix`, `prettier --write`, and related Jest tests. For staged JSON, Markdown, YAML, and CSS files, it runs `prettier --write`.

Workspace settings in `.vscode/settings.json` make Prettier the default VS Code/Cursor formatter and enable format-on-save. The ESLint extension is recommended for inline diagnostics, but ESLint enforcement is handled by terminal, Husky, and CI checks.

`Android Play internal release` is manual. It checks out `main`, runs a local EAS Android production build on the GitHub runner, uploads the `.aab` artifact, and can upload a draft Google Play internal-testing release.

`Web production deploy` is manual. It checks out `main`, exports the Expo web app, and deploys `dist` to Netlify production.

Required release variables:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_PUBLIC_APP_URL
EXPO_PUBLIC_SUPPORT_EMAIL
EXPO_PUBLIC_PRIVACY_EMAIL
EXPO_PUBLIC_SECURITY_EMAIL
```

Recommended explicit release variables:

```text
EXPO_PUBLIC_EAS_PROJECT_ID
EXPO_PUBLIC_GITHUB_REPO_URL
```

Required release secrets:

```text
EXPO_TOKEN
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID
```

Required only for Android store submission:

```text
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
```

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

Practical default:

- protect `main`
- use short feature branches
- prefer draft PRs for larger work

## Repository setup checklist

Use this when configuring a new GitHub remote or mirror:

1. create the prepared labels
2. enable GitHub Actions
3. enable issue templates
4. decide whether to protect `main`

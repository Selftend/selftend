# GitHub Setup

Last updated: 2026-05-05

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

`CI` runs on pull requests and pushes to `main`.

CI verifies linting, formatting, typechecking, and tests through `npm run verify`. The Husky pre-commit hook runs `npm run format` first, then `npm run verify`, so local commits auto-format first and then use the same verification command as GitHub.

Workspace settings in `.vscode/settings.json` make Prettier the default VS Code/Cursor formatter and enable format-on-save. The ESLint extension is recommended for inline diagnostics, but ESLint enforcement is handled by terminal, Husky, and CI checks.

`Android Play internal release` is manual. It checks out `main`, runs a local EAS Android production build on the GitHub runner, uploads the `.aab` artifact, and can submit to Google Play internal testing.

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

- `bug`
- `feature`
- `docs`
- `privacy`
- `safety`
- `accessibility`

## PR expectations

- keep PRs focused
- update docs when product behavior changes
- run or satisfy the Husky pre-commit checks
- run `npm run verify`
- call out privacy, safety, and licensing impact explicitly

## Branching

Practical default:

- protect `main`
- use short feature branches
- prefer draft PRs for larger work

## Immediate follow-up after remote creation

1. push the current scaffold
2. create the prepared labels
3. enable GitHub Actions
4. enable issue templates
5. decide whether to protect `main`

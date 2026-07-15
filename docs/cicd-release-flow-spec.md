# Selftend CI/CD — `dev → main` Release Flow Spec

**Status:** Decided, ready to implement. **Source:** [Wayfinder map #10](https://github.com/Selftend/selftend/issues/10) (decision tickets #11–#19).
**Scope of this document:** the complete branch / release / deploy model. This is the specification — the workflow YAML is implemented in a follow-up, not here.

---

## 1. Goal

Move from "every push to `main` drives versioning" to a two-branch model where `dev` is the integration branch and a `dev → main` promotion cuts a release. Merging a release publishes a GitHub Release, which deploys web + android and applies DB migrations. Add a staging environment so changes are validated before release.

## 2. Branch model

| Branch | Role                                                                                                                                                                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`  | Integration. All feature PRs land here (squash). Pushes here deploy **staging**.                                                                                                                                                               |
| `main` | Release / production. **Default branch.** Only receives the `dev→main` promotion PR, `hotfix/*` PRs, release-please's release PR, and the `main→dev` back-merge's counterpart. Pushes/releases here drive versioning + **production** deploys. |

`main` **stays the default branch** (#19) — GitHub runs `on: release` / `schedule` / `workflow_dispatch` workflows from the default branch, and release-please runs on `main`. New PRs therefore default to `main` and must be retargeted to `dev` (see §10).

## 3. Everyday contributor flow

1. Branch off `dev`.
2. Open a PR **into `dev`** (retarget the base from `main` if GitHub defaulted it).
3. CI runs: `verify` → `integration` + `e2e`. All three are **required** (#13).
4. One approving review (you bypass as admin; contributors need your review — #14).
5. **Squash-merge** into `dev` — one Conventional Commit per PR (the version/CHANGELOG signal).
6. The push to `dev` deploys **staging** (§6).

## 4. Release flow (`dev → main` promotion)

1. Open a **`dev → main` PR** when ready to release.
2. Arm auto-merge with the **merge-commit** method: `gh pr merge <n> --auto --merge`. **Never squash this PR** — squashing collapses the per-PR Conventional Commits and breaks versioning (#12, #13).
3. Required checks + 1 review clear (admin bypass), then it lands as a **merge commit** on `main`.
4. `main`'s push triggers **release-please**, which opens/updates a release PR (version bump + CHANGELOG), **bot-approves** it (`github-actions[bot]`) and **auto-merges** it via the PAT (`RELEASE_PLEASE_TOKEN`) — existing machinery, unchanged.
5. The release PR merge **tags `vX.Y.Z`** and **publishes a GitHub Release** under the PAT.
6. `release: published` fires the **production** pipeline (§6) and the **back-merge** (§9).

```
feature ─(squash)→ dev ─(merge-commit promotion PR)→ main
                    │                                   │
              staging deploy                     release-please
                                                  → tag + Release published
                                                        → prod pipeline + back-merge
```

## 5. Versioning

- **release-please stays on `main`** (#13). It reads Conventional Commits across `main`'s full commit graph — the per-PR squash commits carried in by the promotion merge commit are parsed individually (#12).
- `versionName` follows `package.json` (bumped by release-please); **EAS owns `versionCode`** (`appVersionSource: remote`, `autoIncrement: true`).
- **Invariant:** the tag/Release must always be created by the **PAT**, never `GITHUB_TOKEN` — otherwise `on: release` deploy workflows won't fire (GITHUB_TOKEN events don't start new workflow runs) (#12).

## 6. Deployment pipeline

Two **orchestrator** workflows enforce _migrate-before-deploy_ ordering (#17). The current `web-deploy.yml` and `android-release.yml` become **reusable `workflow_call`** workflows (keeping their own `workflow_dispatch` fallback).

### `staging.yml` — `on: { push: [dev], workflow_dispatch }`

```
migrate-staging ──► deploy-functions-staging
                └──► deploy-web-staging   (needs: migrate-staging)
```

- `migrate-staging`: `supabase/setup-cli@latest` → `link --project-ref $STAGING_PROJECT_ID` → `db push`.
- `deploy-web-staging`: the reusable web workflow with **staging** inputs → separate staging Netlify site (#16).
- `deploy-functions-staging`: `supabase functions deploy` (#17).

### `release.yml` — `on: { release: [published], workflow_dispatch (tag input) }`

```
migrate-prod ──► deploy-web
            ├──► deploy-android      (all need: migrate-prod)
            └──► deploy-functions-prod
```

- `migrate-prod`: **dry-run log** (`db push --dry-run` / `migration list`) → `link --project-ref $PRODUCTION_PROJECT_ID` → `db push`. Fully automatic (#17) — safe because the same files already applied on staging and `db-backup.yml` runs daily.
- `deploy-web` / `deploy-android`: the reusable workflows, **checking out the release tag** `github.event.release.tag_name` (#15). Independent of each other.
- `deploy-functions-prod`: `supabase functions deploy`.

### Deploy specifics (#15)

- **Build ref:** the release tag (not `main` HEAD) — reproducible, immune to `main` advancing mid-build. `ref: ${{ github.event.release.tag_name || inputs.tag || github.ref }}`.
- **Web:** export → Netlify **production** site. `concurrency: { group: web-production-deploy, cancel-in-progress: true }`.
- **Android:** fully automatic → Play **closed testing (alpha)** + Alpha mirror. `concurrency: { group: android-release, cancel-in-progress: true }` (a newer release cancels an in-flight ~90-min build).
  - ⚠️ **Fix:** today's `if: ${{ inputs.submit_to_play }}` steps evaluate **false** on a `release` event (inputs undefined) — change to `if: ${{ github.event_name == 'release' || inputs.submit_to_play }}`.
- Both scoped to the `production` GitHub Environment; **no** required-reviewer gate (fully auto).

## 7. Environments & secrets (#16, #17, R1)

Two **GitHub Environments**: `staging` and `production`.

| Secret / var                                      | Scope        | Notes                                                                       |
| ------------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN`                           | shared       | one PAT for the account                                                     |
| `STAGING_PROJECT_ID`, `STAGING_DB_PASSWORD`       | `staging`    | staging Supabase project                                                    |
| `PRODUCTION_PROJECT_ID`, `PRODUCTION_DB_PASSWORD` | `production` | prod Supabase project                                                       |
| `NETLIFY_SITE_ID`, `NETLIFY_AUTH_TOKEN`           | per env      | separate staging + prod sites                                               |
| `EXPO_PUBLIC_SUPABASE_URL` / `_PUBLISHABLE_KEY`   | per env      | staging → staging project                                                   |
| `EXPO_PUBLIC_PUBLIC_APP_URL`                      | per env      | staging → the staging URL                                                   |
| `EXPO_PUBLIC_SENTRY_DSN`                          | shared       | same DSN; app sets Sentry `environment` per env (add `EXPO_PUBLIC_APP_ENV`) |

- Pin `supabase/setup-cli` to `latest` (IPv4/Supavisor pooler on GitHub runners — R1).
- One `concurrency` group per environment to serialize `db push`.

### Staging web (#16)

- **Separate Netlify site** deployed from `dev`, pointing at the **separate staging Supabase project**.
- **Public but unlisted:** `X-Robots-Tag: noindex` via `netlify.toml` (Supabase auth still gates data).
- **Stable custom subdomain** (e.g. `staging.selftend.app`) — set as the `staging` Environment URL, surfaced in the Actions job summary, and **added to the staging Supabase project's Auth → Redirect URLs**.

## 8. Branch protection — GitHub rulesets (#14)

Two **layered rulesets** on both `dev` and `main`:

**Rule A — Merge gate (NO bypass, everyone incl. maintainer):**

- Require a PR (block direct pushes); block force-push + deletion.
- Required status checks: **`verify`, `integration`, `e2e`**.
- Require branch up to date; require conversation resolution.
- **Linear history OFF** (`main` takes merge commits).

**Rule B — Review gate (bypass actor: Repository-admin = maintainer):**

- Require **1 approval**; dismiss stale approvals on new commits.
- Maintainer bypasses _approval only_ (never checks) → solo-operable; contributors still need review.

**release-please carve-out:** the release PR meets Rule B via `github-actions[bot]` auto-approval (re-approved every run); Rule A's up-to-date is handled by auto-merge. No signed-commits requirement.

## 9. Rollback & hotfix (#18)

### Rollback — hybrid (fast mitigate, then revert forward)

- **Web:** re-publish the previous good Netlify deploy (instant, no rebuild); fallback: dispatch the web deploy with the prior `tag`.
- **Android:** no true un-release — **halt/deactivate** the bad release in Play Console; ship a fixed higher-versionCode build.
- **DB:** forward-only — fix-forward migration; restore from the daily `db-backup.yml` only for data corruption.
- **Permanent fix:** `git revert` on `dev` → promotion → new **patch** release. Keep the bad tag/Release in history.

### Hotfix — straight to `main`

- `hotfix/*` off `main`, `fix:` commit, **merge-commit** PR into `main` (through the normal rulesets) → release-please patch → `release.yml` runs the full pipeline.

### Back-merge — `back-merge.yml`, `on: release: [published]`

- Opens a **`main → dev` PR** (merge commit) via the bot/PAT after every release/hotfix; you review + merge.
- Carries release-please's version/CHANGELOG bump **and** hotfix commits back to `dev`, preventing promotion conflicts. Conflicts surface here rather than at the next promotion.

## 10. Contributor docs & PR base guard (#19)

- **`pr-base-guard.yml`:** comments on PRs opened with `base=main` that aren't the promotion PR (head `dev`), a `hotfix/*`, or release-please — nudging "retarget to `dev`." Non-destructive.
- **`.github/CONTRIBUTING.md`** (update): the flow above — target `dev`, squash, conventional titles, promotion & hotfix paths.
- **`README.md`:** add a "Branching & releases" pointer to CONTRIBUTING.
- **`.github/pull_request_template.md`** (add): "Base should be `dev` unless this is a hotfix" + conventional-commit note.

## 11. Workflow inventory

| File                  | Change                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`              | Essentially unchanged (`pull_request` already covers PRs to `dev` + promotion); add CI concurrency-cancel. No `push: [dev]`. |
| `release-please.yml`  | Unchanged.                                                                                                                   |
| `web-deploy.yml`      | → reusable `workflow_call` + `workflow_dispatch`; build from tag; `production` env.                                          |
| `android-release.yml` | → reusable `workflow_call` + `workflow_dispatch`; build from tag; fix `submit_to_play` gate; `production` env.               |
| `staging.yml`         | **New** — migrate-staging → staging web + functions on push to `dev`.                                                        |
| `release.yml`         | **New** — orchestrator on `release: published`: migrate-prod → web + android + functions.                                    |
| `back-merge.yml`      | **New** — `main→dev` sync PR on `release: published`.                                                                        |
| `pr-base-guard.yml`   | **New** — nudge stray `base=main` PRs.                                                                                       |
| `db-backup.yml`       | Unchanged (daily backup — rollback safety net).                                                                              |

## 12. Cutover / implementation sequence

1. Provision the **staging Supabase project** + **staging Netlify site**; set the `staging`/`production` GitHub Environments and secrets; add `staging.selftend.app` DNS + the Supabase auth allowlist entry.
2. Create `dev` from `main`.
3. Apply the §8 rulesets to `dev` + `main`.
4. Retarget open feature PRs `main → dev` in place (currently **#33**, **#34**; open `fix-auth-redirects-dev-setup` against `dev`).
5. Land the new/changed workflows on `main` via the normal flow.
6. Ship the CONTRIBUTING / README / PR-template updates.

## 13. Open items & recommendations

- **Staging test-data seeding** _(open fog)_: schema comes from migrations; whether staging also applies `supabase/seed.sql` (`db push --include-seed`) and/or needs representative data is unspecified — revisit during build.
- **Enable Supabase PITR** _(recommendation)_: shrinks the DB recovery window below the daily-backup granularity.

## 14. Out of scope

- Android staging / internal-testing track (only staging **web** is in scope).
- iOS / App Store pipeline (no iOS CI exists).

## Appendix — invariants

1. Never **squash** the `dev→main` promotion PR (or a hotfix PR) — merge commits only, so Conventional Commits reach `main`.
2. The tag/Release is always created by the **PAT**, never `GITHUB_TOKEN`.
3. Deploys build from the **release tag**, and migrations run **before** deploys.
4. The maintainer bypasses **approval only**, never CI checks.

**Research backing:** [`docs/research/supabase-migrations-ci.md`](research/supabase-migrations-ci.md) (#11), [`docs/research/release-please-deploy-triggers.md`](research/release-please-deploy-triggers.md) (#12).

# Branching And Releases

This doc defines the two-branch release flow: how everyday changes land, how a release is cut, and the invariants that keep versioning working. It implements the decisions from the [CI/CD release-flow map (#10)](https://github.com/Selftend/selftend/issues/10).

## Branch model

| Branch | Role                                                                                                                                                                                     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`  | Integration. All feature PRs land here via **squash merge** (one Conventional Commit per PR).                                                                                            |
| `main` | Release / production. Default branch. Only receives the `dev→main` promotion PR, `hotfix/*` PRs, release-please's release PR, and the `main→dev` back-merge counterpart after a release. |

`main` stays the default branch because GitHub runs `on: release`, `schedule`, and `workflow_dispatch` workflows from the default branch, and release-please runs on `main`. New PRs therefore default to `main` in the GitHub UI — retarget them to `dev`.

## Everyday contributor flow

1. Branch off `dev`.
2. Open a PR into `dev` (retarget the base from `main` if GitHub defaulted it).
3. CI must pass (`verify`, `integration`, `e2e`) and the PR needs one approving review (maintainer may bypass the review, never the checks).
4. **Squash-merge.** The squashed commit title must be a Conventional Commit — it is the version and CHANGELOG signal release-please reads later.

## Cutting a release (`dev → main` promotion)

1. Open a PR from `dev` into `main` when ready to release.
2. Arm auto-merge with the **merge-commit** method:

   ```bash
   gh pr merge <n> --auto --merge
   ```

3. Once required checks and review clear, it lands as a merge commit on `main`.
4. release-please reacts to the push: it opens or updates its release PR (version bump + CHANGELOG), the workflow bot-approves it and arms auto-merge, and merging it tags `vX.Y.Z` and publishes a GitHub Release under the `RELEASE_PLEASE_TOKEN` PAT.
5. The pipeline runs: production database migration, then web + edge functions + Android in parallel. **Everything goes live automatically**; Android trails only by Google's review — see [How Android reaches users](#how-android-reaches-users).

**Never squash the promotion PR.** Squashing collapses the per-PR Conventional Commits into one commit and loses the version/CHANGELOG signal. release-please traverses `main`'s full commit graph, so the squash commits carried in by the merge commit are parsed individually; the merge commit's own subject does not need to be conventional. To keep the wrong button unavailable, the repo allows only the two merge methods that are actually used: squash (dev PRs, release PR) and merge commit (promotion and hotfix PRs) — rebase merge is disabled.

## How Android reaches users

The pipeline releases the AAB to the Play **production** track as `inProgress` with a **`rollout` of 0.2** — automatic, but served to 20% of users rather than all of them.

**A merge to `main` goes live automatically once Google's review clears.** There is no human gate on the release itself; nothing needs pressing for it to start reaching users.

The closed testing tracks (`Groups`, `alpha`) receive the same build in the same pipeline run, so testers are never left behind production.

### Getting from 20% to everyone

A capped rollout does **not** climb on its own. The remaining 80% get the build one of two ways, and this is the one piece of the pipeline that still needs a person:

- **Bump the rollout in Play Console** once Sentry and Android vitals look clean — the fastest path, and the one to use when a release is worth watching.
- **Ship the next release**, which supersedes it. If `releaseStatus` is set back to `completed` first, that next release goes to 100% directly.

The cap was introduced deliberately for the first release under this pipeline (72 commits, 12 migrations — the largest since v0.6.1). **The intended end state is `completed`**, per the decision on #371 that there should be no human gate. Flip `eas.json`'s production profile back once a release has been through cleanly, and update `test/android-release-track.test.ts` in the same change — it pins whichever mode is current.

### What this costs, and what to watch

The trade is throughput against blast radius, and the consequences should not be rediscovered mid-incident:

- **A bad build reaches 20% of users** before anyone reacts — capped, not prevented. At `completed` it is 100%.
- **Sentry and Android vitals are the only early warning.** Watch them after a release.
- **Play has no rollback.** You can **halt** a rollout so no _further_ users receive the build, but everyone already updated stays on it. The only real remedy is shipping a higher versionCode forward — see the [Rollback runbook](#rollback-runbook).
- **Review latency still applies**, so Android trails web and the database by however long Google takes. Keep migrations forward-compatible: the currently-installed Android build must keep working against a migrated database. (Verified for the 0.6.1 client across the 12 migrations in the first release — `program_widget_task_status` dropped its three-argument signature, and the four-argument replacement defaults the new parameter, with an integration test per leg that omits it.)

The neighbouring `releaseStatus` values in `eas.json` are `completed` (live to everyone, the intended end state) and `draft` (uploaded, serving nobody, awaiting a human press). `halted` is the kill switch for a rollout already under way, not a release mode.

## Hotfixes

For an urgent production fix, branch `hotfix/*` off `main`, use a `fix:` Conventional Commit, and open a **merge-commit** PR straight into `main` through the normal checks. release-please cuts a patch release from it, and the full release pipeline (migrate → deploys) runs. A back-merge returns the fix and the version bump to `dev` after the release.

## Back-merge (automated)

On every `release: published`, `back-merge.yml` opens a **`main → dev` sync PR** via the PAT. Review it and merge it as a **merge commit** — it carries the version/CHANGELOG bump and any hotfix commits back into `dev`, so `dev` never drifts and the next promotion PR stays conflict-free. Merge conflicts (typically `package.json` / `CHANGELOG.md`) surface on this PR and are resolved there.

## Rollback runbook

Two speeds: mitigate first, then make the fix permanent. The database is
**forward-only** — never roll schema back under a live app.

**1. Immediate mitigation (minutes):**

- **Web** — redeploy the previous good version to the Cloudflare Worker: either **Cloudflare dash → Workers → `selftend` → Deployments → roll back** to the prior version (instant, no rebuild), or `workflow_dispatch` the `Web production deploy` workflow (`web-deploy.yml`) / re-run `release.yml` on the prior release `tag`.
- **Android** — Play has no un-release for a versionCode, and releases go out at 100% with no staged rollout to halt. If the release is still in **review**, remove it from review in Play Console before it ships. Once it is live, the only remedy is **shipping a fixed build with a higher versionCode forward**; you may also **halt** the release on the production track to stop _new_ users receiving it, but everyone who already updated stays on the bad build. Halt the closed tracks too if testers are affected.
- **Database** — do nothing schema-wise. For genuine data corruption only: restore from the daily `db-backup.yml` backup (accepts up to ~24h data loss unless Supabase PITR is enabled — recommended).

**2. Permanent fix (hours):**

1. `git revert` the offending commit(s) on a branch off `dev` → squash PR into `dev` (normal checks).
2. Promote `dev → main` as usual → release-please cuts a new **patch** release → the pipeline ships it.
3. Keep the bad tag/Release in history — the revert produces a new, higher version; nothing is deleted.

For a production emergency where `dev` carries unrelated unreleased work, use the [hotfix path](#hotfixes) instead of a revert-through-promotion.

## Invariants

1. Never squash the `dev→main` promotion PR or a `hotfix/*` PR — merge commits only.
2. The tag and GitHub Release are always created by the PAT (`RELEASE_PLEASE_TOKEN`), never `GITHUB_TOKEN` — `GITHUB_TOKEN`-authored events do not trigger `on: release` workflows, so deploys would silently not run.
3. The maintainer may bypass the review requirement, never the required checks.

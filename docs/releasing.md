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

**Never squash the promotion PR.** Squashing collapses the per-PR Conventional Commits into one commit and loses the version/CHANGELOG signal. release-please traverses `main`'s full commit graph, so the squash commits carried in by the merge commit are parsed individually; the merge commit's own subject does not need to be conventional. To keep the wrong button unavailable, the repo allows only the two merge methods that are actually used: squash (dev PRs, release PR) and merge commit (promotion and hotfix PRs) — rebase merge is disabled.

## Hotfixes

For an urgent production fix, branch `hotfix/*` off `main`, use a `fix:` Conventional Commit, and open a **merge-commit** PR straight into `main` through the normal checks. release-please cuts a patch release from it. A back-merge returns the fix and the version bump to `dev` after the release.

## Invariants

1. Never squash the `dev→main` promotion PR or a `hotfix/*` PR — merge commits only.
2. The tag and GitHub Release are always created by the PAT (`RELEASE_PLEASE_TOKEN`), never `GITHUB_TOKEN` — `GITHUB_TOKEN`-authored events do not trigger `on: release` workflows, so deploys would silently not run.
3. The maintainer may bypass the review requirement, never the required checks.

# Releasing

How a change travels from a feature branch to production. `dev` is the
integration branch; `main` is the release branch. Versioning is fully
automated by release-please from Conventional Commits — nobody edits
`package.json` versions or `CHANGELOG.md` by hand.

Full design rationale: `docs/cicd-release-flow-spec.md` (on the
`feat/cicd-release-flow` branch) and the decisions linked from
[wayfinder map #10](https://github.com/Selftend/selftend/issues/10).

## Everyday work → `dev`

1. Branch off `dev`, open a PR **into `dev`** (retarget the base if GitHub
   defaulted it to `main`).
2. Give the PR a Conventional-Commit title (`feat: …`, `fix: …`, `chore: …`) —
   it becomes the squash commit that release-please later reads for
   versioning.
3. CI must be green (`verify`, `integration`, `e2e`) and conversations
   resolved; contributors need one approving review (the maintainer may
   bypass the review — never the checks).
4. **Squash-merge.** One conventional commit per PR lands on `dev`.

## Cutting a release: the `dev → main` promotion PR

1. Open a PR from `dev` into `main` when ready to release.
2. Arm auto-merge with the **merge-commit** method:

   ```sh
   gh pr create --base main --head dev --title "chore: promote dev to main"
   gh pr merge --auto --merge
   ```

3. Once checks pass it lands as a **merge commit**, carrying every squashed
   conventional commit from `dev` onto `main` individually.

> ⚠️ **Never squash the promotion PR.** Squashing collapses the per-PR
> conventional commits into one, destroying the version/CHANGELOG signal
> release-please reads. The merge-commit subject itself need not be
> conventional. (For the same reason, future `hotfix/*` PRs into `main` also
> merge with a merge commit.)

## What happens after the promotion lands (automatic)

1. The push to `main` triggers `release-please.yml`, which opens/updates the
   **release PR** (version bump + CHANGELOG), approves it as
   `github-actions[bot]`, and arms auto-merge — existing machinery, no manual
   step.
2. When the release PR merges, release-please tags `vX.Y.Z` and **publishes a
   GitHub Release under the PAT** (`RELEASE_PLEASE_TOKEN`).
3. `release: published` fires the production pipeline (migrations → web +
   android deploys — wired in `release.yml`, see the spec §6).

> ⚠️ The tag/Release must always be created by the PAT, never `GITHUB_TOKEN`:
> events authored by `GITHUB_TOKEN` do not start new workflow runs, so the
> deploy pipeline would silently never fire.

## Version semantics

- `feat:` → minor bump, `fix:` → patch; `feat!:`/`BREAKING CHANGE:` → major
  (pre-1.0: majors are damped by `bump-minor-pre-major`).
- `chore:`, `ci:`, `docs:`, etc. do not bump the version and stay out of the
  CHANGELOG.
- `versionName` follows `package.json`; EAS remote versioning owns
  `versionCode` (`autoIncrement`).

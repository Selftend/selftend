# release-please version bumps & downstream deploy triggers (Selftend)

## Question

Selftend is moving to a `dev` → `main` flow:

- PRs squash-merge into `dev` (one Conventional Commit per PR).
- `dev` → `main` lands as a **merge commit** (NOT squashed) via a promotion PR, so the individual per-PR Conventional Commits reach `main`.
- `release-please` runs on `push` to `main` using `googleapis/release-please-action@v4` authenticated with a **fine-grained PAT** (`RELEASE_PLEASE_TOKEN`), not the default `GITHUB_TOKEN` (the org locks Actions from creating PRs, and the PAT lets the release PR trigger the required `verify` check).
- We want web + android deploy workflows to fire automatically when the GitHub Release is published.

We need to confirm:

1. Does release-please on `main` correctly compute the version bump + CHANGELOG from the per-PR Conventional Commits, given they arrive on `main` via a `dev→main` merge commit? Any gotchas with merge commits, the merge-commit message, or already-seen commits?
2. Will `on: release: { types: [published] }` reliably fire downstream deploys, given the critical GitHub caveat that events triggered by the default `GITHUB_TOKEN` do NOT create new workflow runs — but here the release is created by a **PAT** (`RELEASE_PLEASE_TOKEN`)?
3. If there is any residual risk the `release: published` event won't fire, what is the robust alternative?

---

## Findings

### 1. How release-please reads commits on `main`

**release-please parses the git history of the release branch (`main`) for Conventional Commit messages, and everything reachable since the last release is aggregated.** From the release-please README: it works "by parsing your git history, looking for Conventional Commit messages, and creating release PRs." It determines the previous release from the last release tag / GitHub Release and considers commits landed since then, so commits that were already part of a prior release are not re-counted.

**Merge commits vs. squash — both are supported.** The release-please documentation explicitly states that "you can use a merge commit or a rebase merge that retains your carefully crafted atomic commits, and as long as every commit landing on main strictly follows the Conventional Commit specification, release-please will aggregate all of them when generating the Release PR." release-please traverses the commit graph (not first-parent only), so the individual squash commits that came from `dev` and were brought onto `main` via the `dev→main` merge commit **are visible on `main` and are parsed individually.**

This is exactly the Selftend model: each PR is squashed on `dev` into one clean Conventional Commit; the `dev→main` merge commit brings all of those individual commits into `main`'s history; release-please walks them and aggregates each `feat:` / `fix:` / etc. into the version bump and CHANGELOG.

**Gotchas:**

- **The merge-commit message itself is not (and need not be) a Conventional Commit.** A `dev→main` merge commit typically has a subject like `Merge pull request #NN from …`. release-please does not require the merge commit to be conventional — it reads the underlying commits. A non-conventional merge subject is simply ignored (classified as "other"/no release impact), it does **not** break parsing. Do NOT rely on the merge-commit subject to carry release information; keep the real `feat:`/`fix:` semantics on the per-PR squash commits.
- **Do not squash the promotion PR.** If `dev→main` were squashed, all the per-PR commits would collapse into a single commit whose message is whatever the squash title is — you would lose the individual Conventional Commits and the CHANGELOG/version bump would be computed from just that one squash message. The plan to land `dev→main` as a merge commit is the correct choice.
- **Commit-message override footers don't work with plain merges.** release-please's per-commit message-override feature (BEGIN_COMMIT_OVERRIDE / footers) is documented to work with squash-merges, not plain merges, "because release-please does not know which commit(s) to apply the override to." This is not a problem for Selftend because the override is applied at the PR-squash step onto `dev` (each PR is squashed), and the `dev→main` merge just carries those already-finalized commits. Just be aware that you cannot rewrite a commit message at the `dev→main` merge step.
- **Already-seen commits.** release-please anchors on the last release (last tag / GitHub Release on `main`). Once a version is tagged, those commits are "below" the release point and are not reconsidered. Re-running release-please on `main` is idempotent — it will not double-count previously released commits. (If you ever need to seed the starting point, release-please supports `bootstrap-sha` / `last-release-sha`, but that is only for initial adoption, not routine operation.)

**Net:** Yes — with `dev→main` as a merge commit (not squash) and one Conventional Commit per PR, the per-PR commits reach `main` and are read correctly. The only hard rule is: keep the per-PR squash commits Conventional, and never squash the `dev→main` promotion PR.

### 2. Will `on: release: { types: [published] }` fire the deploys?

**The critical GitHub caveat:** GitHub Actions documentation states that when you use the repository's `GITHUB_TOKEN` to perform tasks, **events triggered by the `GITHUB_TOKEN` will not create a new workflow run**, with the only exceptions being `workflow_dispatch` and `repository_dispatch`. The rationale is to prevent accidental recursive/endless workflow runs. This applies to a GitHub Release created by an Action using `GITHUB_TOKEN`: a `release: published` event produced that way would **not** start `on: release` workflows.

**The documented workaround — and the exact reason Selftend is safe:** The same docs state that "if you want to trigger a workflow from within a workflow run, you can use a GitHub App installation access token or a personal access token instead of `GITHUB_TOKEN` to trigger events that require a token." The `GITHUB_TOKEN`-only restriction applies **only to events attributed to `GITHUB_TOKEN`**. Events attributed to a PAT (or GitHub App token) are treated like any other user action and **do** create new workflow runs.

**Which identity actually publishes the release in the release-please-action flow?** release-please-action makes all of its GitHub API calls — opening/updating the release PR, creating the tag, and **creating/publishing the GitHub Release** — using the `token` input passed to the action. Selftend passes `token: ${{ secrets.RELEASE_PLEASE_TOKEN }}` (the fine-grained PAT), not `GITHUB_TOKEN`. Therefore the Release is created/published under the PAT's identity, **not** `GITHUB_TOKEN`. This is the very reason a PAT is required to get CI (the `verify` check) to run on release-please PRs in the first place — the same mechanism that lets the release PR trigger checks also lets the published Release trigger `on: release` workflows.

**Conclusion:** Because the GitHub Release is published by the PAT (`RELEASE_PLEASE_TOKEN`), an `on: release: { types: [published] }` workflow **will** fire reliably. The `GITHUB_TOKEN` restriction does not apply to PAT-created events.

**Two caveats to keep true:**

- The deploy workflow file (`on: release`) must exist on the **default branch** (`main`) for release events to dispatch it — this is standard for non-`push`/`pull_request` triggers.
- Keep the release-creation step authenticated with the PAT. If any part of the release/tag creation ever falls back to `GITHUB_TOKEN` (e.g., a future refactor that tags via a `GITHUB_TOKEN` step), the `release: published` event from that step would be suppressed. As long as release-please-action's `token` input is the PAT, the release is PAT-authored and the event fires.

### 3. Robust alternative (belt-and-suspenders)

Even though the PAT setup makes `on: release: published` work, the most robust and self-contained pattern — recommended by release-please-action itself — is to **trigger deploys from the outputs of the release-please step, in the same workflow run**, so there is zero dependency on cross-workflow event propagation or token identity:

release-please-action exposes outputs including:

- `releases_created` — true if any release was created this run
- `release_created` — true for the root component release
- `tag_name`, `version`, `major`, `minor`, `patch`, `sha`, `upload_url`, `html_url`, `body`
- monorepo/path variants: `<path>--release_created`, `<path>--tag_name`, etc.

The README's canonical pattern gates subsequent steps on these outputs:

```yaml
- uses: googleapis/release-please-action@v4
  id: release
  with:
    token: ${{ secrets.RELEASE_PLEASE_TOKEN }}
    release-type: node
# deploy only when a release was actually cut, in the SAME run
- if: ${{ steps.release.outputs.release_created }}
  run: ./deploy-web.sh # uses steps.release.outputs.tag_name
```

Because this runs inside the release-please job (already authenticated, already knows the tag), it does not depend on any new event being dispatched. This is the recommended fallback if the `release: published` event ever proves flaky.

Other alternatives, in rough order of preference:

1. **Same-run gating on `release_created` / `tag_name`** (above) — most robust, no event dependency. Downside: couples deploy logic into the release workflow; if you want web + android as separate workflows you either call reusable workflows (`workflow_call`) or dispatch them.
2. **`repository_dispatch` fired by the release-please job** — the release job, on `release_created == true`, sends a `repository_dispatch` (with the tag in the payload) to kick separate deploy workflows. Note `repository_dispatch` **is** one of the two events that fire even from `GITHUB_TOKEN`, and even more reliably from the PAT.
3. **`workflow_run`** chained off the release-please workflow completing — works, but only runs from workflow files on the default branch and is generally clunkier than the output-gating approach.
4. **`on: release: published`** — clean and idiomatic, and valid here because of the PAT; keep it as the primary trigger, with option 1 as the fallback if you ever observe a miss.

---

## Recommended trigger for Selftend

Given the PAT (`RELEASE_PLEASE_TOKEN`) authenticates the release-please action and therefore **publishes the GitHub Release under the PAT identity (not `GITHUB_TOKEN`)**, a standalone deploy workflow using:

```yaml
on:
  release:
    types: [published]
```

**will fire reliably** — the `GITHUB_TOKEN` "no new workflow run" restriction does not apply to PAT-authored events. This is the clean, idiomatic choice and keeps web and android deploys as independent workflows that can read `github.event.release.tag_name`.

For maximum robustness (and to decouple from event-propagation edge cases), the safest belt-and-suspenders option is to gate deploy steps on the release-please-action outputs (`steps.release.outputs.release_created` / `tag_name`) **within the same workflow run**, or have the release job fire a `repository_dispatch` carrying the tag. Recommendation: use `on: release: published` as the primary deploy trigger, and if you ever want zero dependency on the event, move to output-gated deploys (or a `repository_dispatch`) driven directly by the release-please job. Whichever is chosen, two invariants must hold: (a) the `dev→main` promotion PR must land as a **merge commit, never squashed**, so per-PR Conventional Commits reach `main`; and (b) release-please must keep creating the Release with the **PAT**, never `GITHUB_TOKEN`, so the release event is dispatchable.

---

## Sources

- GitHub Docs — Triggering a workflow (GITHUB_TOKEN does not create new workflow runs; PAT/GitHub App workaround): https://docs.github.com/en/actions/using-workflows/triggering-a-workflow
- GitHub Docs — GITHUB_TOKEN concept/security (same restriction and exceptions `workflow_dispatch`/`repository_dispatch`): https://docs.github.com/en/actions/concepts/security/github_token
- GitHub Changelog — Use GITHUB_TOKEN with workflow_dispatch and repository_dispatch (the two exceptions, added 2022-09-08): https://github.blog/changelog/2022-09-08-github-actions-use-github_token-with-workflow_dispatch-and-repository_dispatch/
- googleapis/release-please-action — README (token input, outputs `releases_created`/`release_created`/`tag_name`/etc., PAT recommended so release-please resources trigger downstream workflows, example gating steps on `release_created`): https://github.com/googleapis/release-please-action
- googleapis/release-please — main repo & docs (parses git history for Conventional Commits; squash vs merge commit handling; commit-override footers require squash-merge; last-release anchoring): https://github.com/googleapis/release-please
- googleapis/release-please-action — Issue #1000, "Triggering subsequent github actions without a PAT" (confirms resources created via GITHUB_TOKEN don't trigger workflows; PAT/App token needed): https://github.com/googleapis/release-please-action/issues/1000
- GitHub Community Discussion #25702 — "Push from Action does not trigger subsequent action" (community confirmation of the GITHUB_TOKEN behavior and PAT/Deploy Key workarounds): https://github.com/orgs/community/discussions/25702

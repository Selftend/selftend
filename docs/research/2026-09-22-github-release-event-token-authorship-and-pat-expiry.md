# What GitHub guarantees about the release event, token authorship and PAT expiry

Research for [What GitHub guarantees about release events, token authorship and PAT expiry — and whether Dependabot would watch the action](https://github.com/Selftend/selftend/issues/2665), under map [#2661](https://github.com/Selftend/selftend/issues/2661).

**All claims checked 2026-09-22** against GitHub's own documentation (`docs.github.com`, and where the docs are terse, the content source at `github/docs`), GitHub's changelog (`github.blog/changelog`), and the source of the two pieces of software whose behaviour the docs do not describe (`dependabot/dependabot-core`, `googleapis/release-please-action`). No third-party summaries were used. Verify before relying on any of it: GitHub restructures these pages often, and two of the facts below moved between 2021 and 2024.

This document **does not rule on a mechanism**. It establishes facts for the parent map.

## The thing being checked

`docs/releasing.md` records as an invariant — and `.github/workflows/release.yml` states in a comment — that release-please must publish the GitHub Release under a PAT, because a Release published under `GITHUB_TOKEN` would not trigger `release.yml`:

```
# Production pipeline: on a published GitHub Release (created by release-please
# under the PAT - GITHUB_TOKEN-authored events would not trigger this) ...
on:
  release:
    types: [published]
```

`.github/workflows/release-please.yml` uses `googleapis/release-please-action@v4` with `token: ${{ secrets.RELEASE_PLEASE_TOKEN }}`. The repo has no `.github/dependabot.yml`.

---

## 1. The `GITHUB_TOKEN` event-suppression rule

### The rule, verbatim

GitHub states it identically on two pages, from one shared source fragment:

> When you use the repository's `GITHUB_TOKEN` to perform tasks, events triggered by the `GITHUB_TOKEN` will not create a new workflow run, with the following exceptions:
>
> - `workflow_dispatch` and `repository_dispatch` events always create workflow runs.
> - `pull_request` events with the `opened`, `synchronize`, or `reopened` activity types: when a workflow using `GITHUB_TOKEN` creates or updates a pull request, the resulting `pull_request` event creates workflow runs in an **approval-required** state. The pull request displays a banner in the merge box, and a user with write access to the repository can start the runs by selecting **Approve workflows to run**. Other `pull_request` activity types (such as `labeled`, `edited`, or `closed`) do not create workflow runs. This prevents recursive workflow runs while still allowing CI workflows to run on pull requests created by automation.
>
> For all other events, this behavior prevents you from accidentally creating recursive workflow runs. For example, if a workflow run pushes code using the repository's `GITHUB_TOKEN`, a new workflow will not run even when the repository contains a workflow configured to run when `push` events occur.

Sources (checked 2026-09-22): [GITHUB_TOKEN § When `GITHUB_TOKEN` triggers workflow runs](https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs); [Triggering a workflow § Triggering a workflow from a workflow](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow). Both render the shared fragment [`data/reusables/actions/actions-do-not-trigger-workflows.md`](https://github.com/github/docs/blob/main/data/reusables/actions/actions-do-not-trigger-workflows.md).

### Scope: does it cover `release: published`?

**Yes — by the rule's default clause, not by a named carve-out.** The rule is written as a blanket prohibition with a closed exception list. `release` appears nowhere on that list, and the closing sentence — "For all other events, this behavior prevents you from accidentally creating recursive workflow runs" — sweeps every unlisted event in.

So the guarantee is _structural_: GitHub does not promise "release is suppressed" in so many words; it promises "everything except `workflow_dispatch`, `repository_dispatch` and three `pull_request` activity types is suppressed", and `release: published` is in the "everything else".

The `release` event's own reference page carries three notes, and **none of them concerns token authorship**. They concern draft releases:

> - Workflows are not triggered for the `created`, `edited`, or `deleted` activity types for draft releases. When you create your release through the GitHub UI, your release may automatically be saved as a draft.
> - The `prereleased` type will not trigger for pre-releases published from draft releases, but the `published` type will trigger.

Source (checked 2026-09-22): [Events that trigger workflows § `release`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#release).

### Documented exceptions

Exactly three, listed above: `workflow_dispatch`, `repository_dispatch`, and `pull_request` (`opened`/`synchronize`/`reopened`, and only into an **approval-required** state, not a free run). The `workflow_dispatch`/`repository_dispatch` carve-out was added on 2022-09-08 — before that date `GITHUB_TOKEN` could not trigger those either. See [GitHub Actions: Use the `GITHUB_TOKEN` with `workflow_dispatch` and `repository_dispatch`](https://github.blog/changelog/2022-09-08-github-actions-use-github_token-with-workflow_dispatch-and-repository_dispatch/) (published 2022-09-08, checked 2026-09-22).

That exception list is the reason `release.yml` also carries a `workflow_dispatch` fallback: a manual dispatch is documented to always run, whatever the token.

### Is a GitHub App installation token suppressed?

**No. GitHub documents the App installation token as the sanctioned way around the rule — it is a distinct actor, not `GITHUB_TOKEN`.** Immediately after stating the suppression rule, the same page says:

> If you do want to trigger a workflow from within a workflow run, you can use a GitHub App installation access token or a personal access token instead of `GITHUB_TOKEN` to trigger events that require a token. Using one of these alternatives also lets `pull_request` workflows run automatically (without the approval prompt described above) when the pull request is created or updated by automation.
>
> If you use a GitHub App, you'll need to create a GitHub App and store the app ID and private key as secrets. […] If you use a personal access token, you'll need to create a personal access token and store it as a secret.

Source (checked 2026-09-22): [Triggering a workflow § Triggering a workflow from a workflow](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow).

**This is the load-bearing finding for the map.** GitHub puts the App installation token and the PAT on the same footing as escapes from the rule. A GitHub App is therefore a documented, viable alternative to the PAT this repo uses — with one decisive difference in the operational properties:

|                                                      | Fine-grained PAT                                                          | GitHub App installation token                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| Triggers `release: published` in another workflow    | Yes (documented escape)                                                   | Yes (documented escape)                                  |
| Lifetime of the credential stored in the repo secret | The PAT itself: up to 366 days, or infinite                               | The App **private key**, which does not expire           |
| Lifetime of the token actually used                  | = the PAT                                                                 | **1 hour**, minted per run                               |
| Tied to a human account                              | Yes — dies with the account, its org membership, or its SSO authorization | No — owned by the org                                    |
| Generated in-workflow by                             | n/a                                                                       | `actions/create-github-app-token`, a GitHub-owned action |

Sources (all checked 2026-09-22): installation access tokens "will expire after 1 hour" — [Authenticating as a GitHub App installation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation) and [GitHub credential types § GitHub App installation access tokens](https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/github-credential-types); the recommended generator — [Making authenticated API requests with a GitHub App in a GitHub Actions workflow](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/making-authenticated-api-requests-with-a-github-app-in-a-github-actions-workflow), whose own example uses `actions/create-github-app-token@v3`.

Also relevant to the "50 PATs" ceiling and to scalability, from the PAT page itself:

> There is a limit of 50 fine-grained personal access tokens you can create. If you require more tokens or are building automations, consider using a GitHub App for better scalability and management.

Source (checked 2026-09-22): [Managing your personal access tokens § Creating a fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token).

---

## 2. Fine-grained PAT expiry

### Maximum lifetime and default

The current docs page **no longer enumerates the dropdown options**. It says only:

> Under **Expiration**, select an expiration for the token. Infinite lifetimes are allowed but may be blocked by a maximum lifetime policy set by your organization or enterprise owner.

Source (checked 2026-09-22): [Managing your personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token).

The numbers are pinned down elsewhere on the same page, in the table documenting the URL parameters that pre-fill the token-creation form:

| Parameter    | Type    | Example        | Allowed values                       | Meaning                                                                                                                                               |
| ------------ | ------- | -------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `expires_in` | integer | `30` or `none` | Integer between 1 and 366, or `none` | Days until expiration or `none` for non-expiring. **If not provided, the default is 30 days**, or less if the target has a token lifetime policy set. |

Source (checked 2026-09-22): same page, [§ Pre-filling fine-grained personal access token details using URL parameters](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#pre-filling-fine-grained-personal-access-token-details-using-url-parameters).

So: **maximum 366 days for a finite lifetime; `none` (infinite) is permitted unless an org/enterprise policy blocks it; 30 days is the documented default where no value is supplied.**

Because `Selftend` is an **organization**, the org policy matters and it is not neutral:

> For fine-grained personal access tokens, the default maximum lifetime policy for organizations is set to expire within 366 days. Classic personal access tokens do not have an expiration requirement.

Source (checked 2026-09-22): [Setting a personal access token policy for your organization](https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/setting-a-personal-access-token-policy-for-your-organization).

**A fine-grained PAT whose resource owner is the `Selftend` org therefore cannot be infinite under the default policy — it expires within 366 days.** That is the ceiling on how long this pipeline can go untouched.

History, for the record — this changed twice:

- 2022-10-18: fine-grained PATs launch. They "must expire" — no infinite option at all. [Introducing fine-grained personal access tokens](https://github.blog/changelog/2022-10-18-introducing-fine-grained-personal-access-tokens/) (published 2022-10-18, checked 2026-09-22).
- 2024-10-18: "Administrators can choose a maximum lifetime between 1 and 366 days for fine-grained PATs and PATs (Classic)"; "Enterprises and organizations have a 366 day expiration policy for fine-grained tokens by default"; "developers can now create fine-grained tokens with no expiration for personal projects"; "The policies apply when tokens are created, regenerated, or used." [New PAT rotation policies preview and optional expiration for fine-grained PATs](https://github.blog/changelog/2024-10-18-new-pat-rotation-policies-preview-and-optional-expiration-for-fine-grained-pats/) (published 2024-10-18, checked 2026-09-22).

### What GitHub does as expiry approaches

Three signals exist. Their evidentiary strength is very different, and the difference matters.

**(a) An email warning — claimed once, in 2021, and never carried into the docs.**

> GitHub will send you an email when it's time to renew a token that's about to expire.

Source: [Expiration options for personal access tokens](https://github.blog/changelog/2021-07-26-expiration-options-for-personal-access-tokens/) (published 2021-07-26, checked 2026-09-22).

⚠️ **Caveat the map must not skip.** That changelog predates fine-grained PATs by 15 months — in July 2021 the only PATs were classic. A grep of the entire `github/docs` content and data tree on 2026-09-22 for `about to expire`, `expire soon`, `expiring soon`, `token will expire` and `before it expires` returns **no** statement about a PAT expiry-warning email, for either token type. So the email is a 2021 changelog promise, not a current documented guarantee, and its application to fine-grained PATs is an extrapolation. It also lands in the **token owner's** inbox, not the org's or the repo's.

**(b) An HTTP response header — documented, machine-readable, and available to the workflow itself.**

> When using a personal access token with the GitHub API, you'll see a new response header, `GitHub-Authentication-Token-Expiration`, indicating the token's expiration date.

Source: same 2021 changelog (published 2021-07-26, checked 2026-09-22). The same caveat applies — this header is not described anywhere in the current `github/docs` tree (grepped 2026-09-22, zero hits). It is nonetheless the only mechanism by which a _workflow using the token_ could learn its own expiry date without extra credentials.

**(c) An API field — documented, current, but reachable only by a GitHub App.**

`GET /orgs/{org}/personal-access-tokens` — "Lists approved fine-grained personal access tokens owned by organization members that can access organization resources" — returns, per token, the required fields:

- `token_expired` (boolean)
- `token_expires_at` (string or null)
- `token_last_used_at` (string or null)

Crucially, the endpoint's own note reads: **"Only GitHub Apps can use this endpoint."**

Source (checked 2026-09-22): [REST API — Organizations / Personal access tokens](https://docs.github.com/en/rest/orgs/personal-access-tokens?apiVersion=2022-11-28#list-fine-grained-personal-access-tokens-with-access-to-organization-resources).

### Can expiry be read programmatically by anyone other than the token owner?

**Yes, but only by a GitHub App installed on the organization** — and only for fine-grained PATs whose resource owner is that org. Not by another PAT, not by `GITHUB_TOKEN`, not by an OAuth app. This is corroborated by the credential-types doc, which grants org owners visibility over fine-grained PATs and explicitly denies it for classic ones:

> **Fine-grained personal access tokens** — **Organization owners**: Can view and revoke individual tokens.
>
> **Personal access tokens (classic)** — **Organization owners** and **enterprise owners** do not have direct visibility into or control over individual tokens.

Source (checked 2026-09-22): [GitHub credential types](https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/github-credential-types).

There is a sharp irony here worth surfacing to the map: **monitoring the PAT's expiry programmatically requires standing up a GitHub App — the very thing that would make the PAT unnecessary.**

---

## 3. ⚠️ What a repository secret holding an EXPIRED PAT does at run time

This is the hinge, so it is worth separating what GitHub guarantees from what the specific action does.

### What GitHub's docs guarantee

Only this, and it is about the token, not about the step:

> When a token has expired or has been revoked, it can no longer be used to authenticate Git and API requests. It is not possible to restore an expired or revoked token, you or the application will need to create a new token.
>
> ## Token revoked after reaching its expiration date
>
> When you create a personal access token, we recommend that you set an expiration for your token. Upon reaching your token's expiration date, the token is automatically revoked.

Source (checked 2026-09-22): [Token expiration and revocation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation).

Note the _also_-relevant clause on the same page: a PAT is revoked when "the token hasn't been used in one year", and automatically revoked if ever pushed to a public repository or gist. Expiry is not the only way this secret goes dead.

So GitHub guarantees an authentication failure. **GitHub's docs say nothing at all about whether a workflow step that uses a dead token fails red.** That is entirely a property of the code holding the token — GitHub Actions does not inspect secrets, and there is no platform-level "your secret expired" check. Stating otherwise from the docs would be a guess.

### What the code in this pipeline actually does — three distinct failure shapes

The docs cannot answer the question, but the action's own source can, and it is primary for its own behaviour. Two adjacent failure modes must be told apart, because they behave differently and only one of them is the question asked.

**(i) The secret is deleted, renamed or misspelled → fails red.**

GitHub documents that an unset secret expands to nothing:

> If a secret has not been set, the return value of an expression referencing the secret (such as `${{ secrets.SuperSecret }}` in the example) will be an empty string.

Source (checked 2026-09-22): [Using secrets in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets#using-encrypted-secrets-in-a-workflow) (identical text in [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)).

There was a plausible silent-degradation hypothesis here: `release-please-action` declares `token` with `default: ${{ github.token }}`, so an empty secret might have fallen back to `GITHUB_TOKEN` — producing a Release authored by `GITHUB_TOKEN`, suppressed `release.yml`, green ticks everywhere and nothing deployed. **It does not happen, for two independent reasons.**

- GitHub's action-metadata reference: "**Optional** A `string` representing the default value. The default value is used when an input parameter **isn't specified in a workflow file**." — [Metadata syntax for GitHub Actions § `inputs.<input_id>.default`](https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax#inputsinput_iddefault) (checked 2026-09-22). `release-please.yml` _does_ specify `token:`, so the default is not applied; the input is the empty string.
- `release-please-action`'s own entrypoint reads the input as **required**, which throws on empty: `token: core.getInput('token', {required: true})` — [`src/index.ts`](https://github.com/googleapis/release-please-action/blob/main/src/index.ts) (checked 2026-09-22).

**(ii) The secret holds an expired (therefore revoked) PAT → fails red.**

The token is present and non-empty, so `getInput` is satisfied; the failure moves to the first API call, which GitHub guarantees will be rejected (§ above). `release-please-action` wraps its whole run in a catch that marks the step failed:

```ts
if (require.main === module) {
  main().catch(err => {
    core.setFailed(`release-please failed: ${err.message}`)
```

— [`src/index.ts`](https://github.com/googleapis/release-please-action/blob/main/src/index.ts) (checked 2026-09-22). `core.setFailed` sets the step's exit status to failure, so the job goes red.

**Answer: LOUD, not silent** — for the release-please step specifically, on the evidence of GitHub's guarantee that the token cannot authenticate plus the action's unconditional `catch → setFailed`.

### ⚠️ But the loudness is not where you would look for it, and the pipeline still breaks quietly downstream

Three qualifications, all of which the map should carry:

1. **The red mark lands on `release-please.yml`, not on `release.yml`.** `release-please.yml` runs on pushes to `main`. So the visible signal is a failed run on an ordinary merge — not a failed release. Whether anyone _notices_ is a separate question from whether it _fails_; the ticket asked the second, and the answer is yes.
2. **No Release is created, so `release.yml` does not run at all.** It does not fail; it is simply absent. A pipeline that never starts produces no red anywhere in the release-deploy half. From the deployment side, PAT expiry looks exactly like "no release was due this week."
3. **`release-please.yml` also uses the same secret at two later steps** (`GH_TOKEN: ${{ secrets.RELEASE_PLEASE_TOKEN }}` at two points, plus one step that deliberately uses `secrets.GITHUB_TOKEN`). Those are `gh` CLI invocations; `gh` exits non-zero on a 401, so under default (non-`continue-on-error`, non-`|| true`) shell semantics they too fail red — but this document did not audit each of those steps' shell for error suppression, and the map should not assume it.

**Recorded gap.** The narrow question "does the _action step_ fail red" is answered from the action's source, not from GitHub's docs, and GitHub's docs are silent on it by design. Nothing here has been observed empirically — it is read off guarantees and source. The one clean empirical test (deliberately expiring the PAT) is not worth running.

---

## 4. Would Dependabot watch `googleapis/release-please-action@v4`?

### Would it open PRs for a mutable major tag at all — yes

GitHub's caveat list for the `github-actions` ecosystem names the major-tag form as supported syntax, using its own example:

> - Dependabot only supports updates to GitHub Actions using the GitHub repository syntax, such as `actions/checkout@v6` or `actions/checkout@<commit>`. Dependabot will ignore actions or reusable workflows referenced locally (for example, `./.github/actions/foo.yml`).
> - Dependabot updates the version documentation of GitHub Actions when the comment is on the same line, such as `actions/checkout@<commit> #<tag or link>` or `actions/checkout@<tag> #<tag or link>`.
> - If the commit you use is not associated with any tag, Dependabot will update the GitHub Actions to the latest commit (which might differ from the latest release).
> - Docker Hub and GitHub Packages Container registry URLs are currently not supported.
> - Dependabot supports both public and private repositories for GitHub Actions.

Source (checked 2026-09-22): rendered on [Security hardening for GitHub Actions § Keeping the actions in your workflows secure and up to date](https://docs.github.com/en/actions/reference/security/secure-use#keeping-the-actions-in-your-workflows-secure-and-up-to-date); content source [`data/reusables/actions/dependabot-version-updates-actions-caveats.md`](https://github.com/github/docs/blob/main/data/reusables/actions/dependabot-version-updates-actions-caveats.md). (`actions/checkout@v6` is itself a mutable major tag — GitHub's illustration of the supported form _is_ the case in question.)

Minimum config, from GitHub's own example:

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

`directory` must be `"/"` — Dependabot looks in `.github/workflows` from there. Reusable workflows referenced via `jobs.<job_id>.uses` are covered too. Source (checked 2026-09-22): [Keeping your actions up to date with Dependabot](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/auto-update-actions).

### Does it surface a MAJOR bump in each mode — and only a major bump for `@v4`

GitHub's docs do not describe the tag-precision behaviour. Dependabot's source does, explicitly, and it is decisive:

```ruby
# Only consider tags with the same precision as the pinned ref, so a `v1` style
# pin falls back to another major-only tag rather than being rewritten to a fully
# qualified version such as `v1.5.5`.
candidates = tags_matching_pinned_precision(allowed_versions_with_dates)
```

and

```ruby
# Resolves a version back to its tag. Versions compare equal across precisions
# (`2` == `2.0.0`), so tags matching the pinned precision are preferred to avoid
# rewriting e.g. a `v2` pin to `v2.0.0`.
```

with `precision(version) = version.split(".").length`.

Source (checked 2026-09-22): [`github_actions/lib/dependabot/github_actions/update_checker/latest_version_finder.rb`](https://github.com/dependabot/dependabot-core/blob/main/github_actions/lib/dependabot/github_actions/update_checker/latest_version_finder.rb). The dispatch between the two strategies is in [`update_checker.rb`](https://github.com/dependabot/dependabot-core/blob/main/github_actions/lib/dependabot/github_actions/update_checker.rb), which branches on `pinned_ref_looks_like_version?` versus `pinned_ref_looks_like_commit_sha?`.

| Pin in the workflow    | What Dependabot proposes                                                               | Major bump surfaced? | Minor/patch surfaced?                                                          |
| ---------------------- | -------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------ |
| `@v4` (1 segment)      | Only other 1-segment tags: `@v5`, `@v6`                                                | **Yes**              | **No** — `v4` already denotes the newest `v4.x.y`; there is nothing to rewrite |
| `@v4.3.1` (3 segments) | Only other 3-segment tags: `@v4.3.2`, `@v5.0.0`                                        | Yes                  | Yes                                                                            |
| `@<full SHA>`          | The SHA of the latest qualifying tag; the trailing `# vX.Y.Z` comment is rewritten too | Yes                  | Yes                                                                            |

So for this repo's `@v4` pin: **yes, Dependabot would watch it, and a `v4 → v5` PR is exactly the thing it would raise** — which is the only Dependabot signal a major-tag pin can produce, and it is the signal that matters, since a major bump is where an action's token handling or release semantics could change under the pipeline.

### The trap: Dependabot _alerts_ behave the opposite way

Version updates and security alerts are different products with opposite blind spots, and it is easy to conflate them:

> Dependabot only creates alerts for vulnerable actions that use semantic versioning and will not create alerts for actions pinned to SHA values.

Source (checked 2026-09-22): [Security hardening for GitHub Actions § Monitoring the actions in your workflows](https://docs.github.com/en/actions/reference/security/secure-use#monitoring-the-actions-in-your-workflows).

Read together with §5: **SHA pinning maximises supply-chain immutability but silences Dependabot alerts; tag pinning keeps alerts but accepts a mutable ref.** A SHA pin _with_ Dependabot version updates enabled recovers the update stream (Dependabot rewrites the SHA), but not the alert stream.

Also relevant to any future config: the `github-actions` ecosystem is listed with "Not applicable" in the supported-package-manager-versions table, and Dependabot's `github-actions` updater is enabled by the same `dependabot.yml` as every other ecosystem. Source (checked 2026-09-22): [Dependabot options reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).

---

## 5. What GitHub recommends for action pinning

GitHub's security hardening guide gives a ranked list, and the ranking is unambiguous. Verbatim:

> - **Pin actions to a full-length commit SHA**
>
>   Pinning an action to a full-length commit SHA is currently the only way to use an action as an immutable release. Pinning to a particular SHA helps mitigate the risk of a bad actor adding a backdoor to the action's repository, as they would need to generate a SHA-1 collision for a valid Git object payload. When selecting a SHA, you should verify it is from the action's repository and not a repository fork.
>
> - **Audit the source code of the action**
>
>   Ensure that the action is handling the content of your repository and secrets as expected. For example, check that secrets are not sent to unintended hosts, or are not inadvertently logged.
>
> - **Pin actions to a tag only if you trust the creator**
>
>   Although pinning to a commit SHA is the most secure option, specifying a tag is more convenient and is widely used. If you'd like to specify a tag, then be sure that you trust the action's creators. The 'Verified creator' badge on GitHub Marketplace is a useful signal, as it indicates that the action was written by a team whose identity has been verified by GitHub. Note that there is risk to this approach even if you trust the author, because **a tag can be moved or deleted if a bad actor gains access to the repository storing the action.**

GitHub now also offers an enforcement policy:

> GitHub offers policies at the repository and organization level to require actions to be pinned to a full-length commit SHA.

Sources (checked 2026-09-22): [Security hardening for GitHub Actions § Using third-party actions](https://docs.github.com/en/actions/reference/security/secure-use#using-third-party-actions); content source [`content/actions/reference/security/secure-use.md`](https://github.com/github/docs/blob/main/content/actions/reference/security/secure-use.md) and [`data/reusables/actions/actions-pin-commit-sha.md`](https://github.com/github/docs/blob/main/data/reusables/actions/actions-pin-commit-sha.md). Repository-level control: [Managing GitHub Actions settings for a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#managing-github-actions-permissions-for-your-repository). Organization-level: [Disabling or limiting GitHub Actions for your organization](https://docs.github.com/en/organizations/managing-organization-settings/disabling-or-limiting-github-actions-for-your-organization#managing-github-actions-permissions-for-your-organization).

Note the honest tension GitHub itself lives with: its own documented example for generating an App token pins `actions/create-github-app-token@v3` — a mutable major tag. GitHub recommends SHA pinning; GitHub's docs do not always follow it.

---

## Summary table

| #   | Question                                                    | Answer                                                                                                                                                                                                                                                | Strength                                            |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | Does `GITHUB_TOKEN` suppression cover `release: published`? | Yes — via the rule's closed exception list, which names only `workflow_dispatch`, `repository_dispatch` and three `pull_request` activity types                                                                                                       | Documented, explicit                                |
| 1   | Is a GitHub App installation token suppressed?              | **No.** GitHub names it, alongside a PAT, as the sanctioned escape from the rule                                                                                                                                                                      | Documented, explicit                                |
| 2   | Fine-grained PAT max lifetime                               | 366 days, or infinite — but an org resource owner defaults to a 366-day ceiling, so **not** infinite here. Documented default where unspecified: 30 days                                                                                              | Documented                                          |
| 2   | Warning as expiry approaches                                | Email: a 2021 changelog promise, **absent from current docs**, and it predates fine-grained PATs. Header `GitHub-Authentication-Token-Expiration`: same 2021 changelog, also absent from current docs. API `token_expires_at`: documented and current | Mixed — flag the email                              |
| 2   | Readable programmatically by a non-owner?                   | Yes — `GET /orgs/{org}/personal-access-tokens`, but **"Only GitHub Apps can use this endpoint"**                                                                                                                                                      | Documented                                          |
| 3   | Expired PAT at run time                                     | **Fails LOUD.** GitHub guarantees the token cannot authenticate; `release-please-action` wraps everything in `catch → core.setFailed`. But the red lands on `release-please.yml`, and `release.yml` simply never runs — no red there                  | Docs + action source; **not** observed              |
| 3   | Missing/empty secret                                        | Also loud — the action reads `token` with `{required: true}`, and a specified-but-empty input does not fall back to the declared default                                                                                                              | Docs + action source                                |
| 4   | Would Dependabot watch `@v4`?                               | Yes. It would raise `v4 → v5` and nothing else — precision matching confines a 1-segment pin to 1-segment tags                                                                                                                                        | Docs (support) + dependabot-core source (precision) |
| 4   | Dependabot alerts on a SHA pin                              | **No alerts at all** for SHA-pinned actions — the opposite blind spot from version updates                                                                                                                                                            | Documented, explicit                                |
| 5   | Pinning recommendation                                      | Full-length commit SHA, "currently the only way to use an action as an immutable release"; a tag "only if you trust the creator", because "a tag can be moved or deleted"                                                                             | Documented, explicit                                |

## Open questions this research did not close

- Whether GitHub in fact still sends the expiry-warning email for **fine-grained** PATs. Only a 2021 changelog about classic PATs says it does; the current docs say nothing. Unresolvable from documentation.
- Whether `GitHub-Authentication-Token-Expiration` is still returned. Same situation — one 2021 changelog, no current docs. It would be cheap to observe against a live request, which this document did not do.
- Whether the two later `gh` CLI steps in `release-please.yml` suppress their own errors. Not audited here.
- Nothing in this document was verified empirically. Every statement is read off GitHub's guarantees or off source code.

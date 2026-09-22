# What `release-please-action` v5 changes against this repo's config

Research for [What release-please-action v5 changes against this repo's config, and whether the Release is still PAT-authored](https://github.com/Selftend/selftend/issues/2664), under map [#2661](https://github.com/Selftend/selftend/issues/2661).

**All facts checked 2026-09-22** against primary sources only: the `googleapis/release-please-action` repository (releases, tags, `action.yml`, `src/index.ts`, README, issue tracker), the `googleapis/release-please` library repository, the `actions/runner` source, and the GitHub Changelog. No blog posts or secondary summaries were used.

This document **does not rule on the pin**. It produces facts for that separate ticket.

## The config under test

```json
{
  "release-type": "node",
  "include-component-in-tag": false,
  "bump-minor-pre-major": true,
  "bootstrap-sha": "63caa9e0...",
  "packages": { ".": { "package-name": "selftend" } }
}
```

Manifest `{".": "0.23.0"}`. Workflow `.github/workflows/release-please.yml`, currently pinned to `googleapis/release-please-action@v4`, passing `token: ${{ secrets.RELEASE_PLEASE_TOKEN }}` and reading `steps.release.outputs.pr` as tier 1 of the three-tier release-PR lookup added for #64.

Note this is **manifest mode**: the workflow sets no `release-type` action input; `release-type` lives in `release-please-config.json`. That distinction matters for Finding 6.

---

## Finding 1 — v5.0.0 changes exactly one line of the action, and it is not the token

v5.0.0 was published **2026-04-22T18:03:34Z**. Its release notes list one breaking change and one fix:

> ### ⚠ BREAKING CHANGES
>
> - upgrade to node24 ([#1188](https://github.com/googleapis/release-please-action/issues/1188))
>
> ### Bug Fixes
>
> - bump release-please from 17.3.0 to 17.6.0 ([#1199](https://github.com/googleapis/release-please-action/issues/1199))

The full file list changed between `v4.4.1` and `v5.0.0` is:

```
.github/workflows/ci.yaml   (test matrix adds node 24)
CHANGELOG.md
action.yml                  (2 lines)
dist/index.js               (rebuilt bundle)
package-lock.json
package.json                (release-please ^17.3.0 -> ^17.6.0)
```

The entire `action.yml` diff:

```diff
 runs:
-  using: 'node20'
+  using: 'node24'
   main: 'dist/index.js'
```

**`src/index.ts` is not in that list** — the action's own logic is byte-identical between v4.4.1 and v5.0.0. So is `README.md`. There is no migration guide in the repository (no `MIGRATION.md`; root contents at `v5.0.0` are `.eslintignore .eslintrc.json .github .gitignore CHANGELOG.md CODE_OF_CONDUCT.md CONTRIBUTING.md LICENSE README.md SECURITY.md action.yml dist package-lock.json package.json screen.png src test tsconfig.json`), because none was needed.

A third party reached the same conclusion independently: action issue [#1203](https://github.com/googleapis/release-please-action/issues/1203) (2026-04-28) states _"`src/index.ts` `main()` is byte-identical between v4 and v5. The v5.0.0 release notes are limited to a Node 24 bump and a `release-please` lib bump from 17.3.0 to 17.6.0."_

Sources: [v5.0.0 release](https://github.com/googleapis/release-please-action/releases/tag/v5.0.0), [v4.4.1...v5.0.0 compare](https://github.com/googleapis/release-please-action/compare/v4.4.1...v5.0.0), [`action.yml` @ v5.0.0](https://github.com/googleapis/release-please-action/blob/v5.0.0/action.yml). Checked 2026-09-22.

---

## Finding 2 ☠️ — the token and Release-authorship behaviour is unchanged. **Not a blocker.**

This was the question that mattered. The answer is no change, on four independent lines of evidence.

**(a) The `token` input is declared identically.** `action.yml` at `v5.0.0`:

```text
  token:
    description: 'GitHub token for creating and grooming release PRs, defaults to using secrets.GITHUB_TOKEN'
    required: false
    default: ${{ github.token }}
```

Byte-identical to v4.4.1 — the only `action.yml` change in v5 is the `runs.using` line above.

**(b) The token is still consumed the same way.** `src/index.ts` at `v5.0.0` (unchanged from v4.4.1) reads it once and hands it straight to the library's client factory:

```ts
token: core.getInput('token', {required: true}),
...
const githubCreateOpts = { proxy, owner, repo, apiUrl, graphqlUrl, token: inputs.token, ... };
return GitHub.create(githubCreateOpts);
```

**(c) The action still creates the Release itself.** `main()` at `v5.0.0` is unchanged:

```ts
if (!inputs.skipGitHubRelease) {
  const manifest = await loadOrBuildManifest(github, inputs);
  outputReleases(await manifest.createReleases());
}
if (!inputs.skipGitHubPullRequest) { ... }
```

`skip-github-release` still defaults to `false`, this repo does not set it, and nothing was delegated elsewhere. The library call bottoms out in `src/github-api.ts` at `v17.6.0`:

```ts
const resp = await this.octokit.repos.createRelease({ ... });
```

on the octokit built from the supplied token. `POST /repos/{owner}/{repo}/releases` attributes the Release to the authenticated identity, so a PAT-authored Release stays PAT-authored.

**(d) The README's PAT guidance is unchanged**, including the section this repo's workflow depends on:

> By default, Release Please uses the built-in `GITHUB_TOKEN` secret. However, all resources created by `release-please` (release tag or release pull request) will not trigger future GitHub actions workflows, and workflows normally triggered by `release.created` events will also not run. […] You will want to configure a GitHub Actions secret with a Personal Access Token if you want GitHub Actions CI checks to run on Release Please PRs.

**Current observed behaviour to preserve:** this repo's four most recent GitHub Releases are all authored by `vasilyoshev` (the PAT owner), not `github-actions[bot]`:

| Tag       | Release author | Created              |
| --------- | -------------- | -------------------- |
| `v0.23.0` | `vasilyoshev`  | 2026-09-18T11:15:13Z |
| `v0.22.0` | `vasilyoshev`  | 2026-09-18T09:01:58Z |
| `v0.21.0` | `vasilyoshev`  | 2026-09-17T08:41:46Z |
| `v0.20.0` | `vasilyoshev`  | 2026-09-15T12:17:48Z |

Nothing in v5 touches the code path that produces that attribution, so `release.yml`, `release-thread.yml` and `back-merge.yml` keep firing.

Sources: [`action.yml` @ v5.0.0](https://github.com/googleapis/release-please-action/blob/v5.0.0/action.yml), [`src/index.ts` @ v5.0.0](https://github.com/googleapis/release-please-action/blob/v5.0.0/src/index.ts), [`src/github-api.ts` @ v17.6.0](https://github.com/googleapis/release-please/blob/v17.6.0/src/github-api.ts), [action README @ v5.0.0](https://github.com/googleapis/release-please-action/blob/v5.0.0/README.md). Checked 2026-09-22.

---

## Finding 3 — the `pr` output is unchanged in name, shape and emptiness semantics

The tier-1 lookup keeps working. `outputPRs()` at `v5.0.0` is unchanged:

```text
function outputPRs(prs: (PullRequest | undefined)[]) {
  prs = prs.filter(pr => pr !== undefined);
  core.setOutput('prs_created', prs.length > 0);
  if (prs.length) {
    core.setOutput('pr', prs[0]);
    core.setOutput('prs', JSON.stringify(prs));
  }
}
```

The README's outputs table at `v5.0.0` is also unchanged and still documents:

> | `pr` | A JSON string of the [PullRequest object](https://github.com/googleapis/release-please/blob/main/src/pull-request.ts#L15) (unset if no release created) |

And the `PullRequest` interface itself — `src/pull-request.ts` in the library — is **not among the files changed between v17.3.0 and v17.6.0**. So `.number` is still there, and the workflow's `jq -r '.number // empty'` still parses it.

The "empty on runs that didn't change the release" behaviour the workflow comment relies on is also intact: `pr` is only set inside `if (prs.length)`.

The release outputs are equally safe. The library renamed the type `GitHubRelease` → `ScmRelease` in the 17.5.0 `Scm` abstraction, but the shape is field-for-field identical:

```ts
// GitHubRelease @ v17.3.0        // ScmRelease @ v17.6.0
id: number;                       id: number;
name?: string;                    name?: string;
tagName: string;                  tagName: string;
sha: string;                      sha: string;
notes?: string;                   notes?: string;
url: string;                      url: string;
draft?: boolean;                  draft?: boolean;
uploadUrl?: string;               uploadUrl?: string;
```

so the action's `tagName`→`tag_name`, `uploadUrl`→`upload_url`, `notes`→`body`, `url`→`html_url` remapping is unaffected, and `release_created` / `releases_created` / `paths_released` / `tag_name` are unchanged.

Sources: [`src/index.ts` @ v5.0.0](https://github.com/googleapis/release-please-action/blob/v5.0.0/src/index.ts), [README @ v5.0.0](https://github.com/googleapis/release-please-action/blob/v5.0.0/README.md), [v17.3.0...v17.6.0 compare](https://github.com/googleapis/release-please/compare/v17.3.0...v17.6.0), [`src/scm.ts` @ v17.6.0](https://github.com/googleapis/release-please/blob/v17.6.0/src/scm.ts), [`src/github.ts` @ v17.3.0](https://github.com/googleapis/release-please/blob/v17.3.0/src/github.ts). Checked 2026-09-22.

---

## Finding 4 — the `Release-As:` **commit footer** is unchanged

Documented identically at both library versions. `README.md` line 106 at **v17.3.0** and at **v17.6.0**, word for word:

> When a commit to the main branch has `Release-As: x.x.x` (case insensitive) in the **commit body**, Release Please will open a new pull request for the specified version.

At the source level, the files in the library that mention `Release-As` are `src/commit.ts`, `src/util/commit-split.ts`, `src/updaters/release-please-config.ts`, `src/changelog-notes/default.ts`, `src/manifest.ts`, `src/versioning-strategies/default.ts`, `src/strategies/base.ts`, `src/bin/release-please.ts`, `src/versioning-strategies/prerelease.ts`, `src/plugins/linked-versions.ts`. Between v17.3.0 and v17.6.0:

- `src/util/commit-split.ts`, `src/updaters/release-please-config.ts`, `src/versioning-strategies/default.ts`, `src/versioning-strategies/prerelease.ts` — **not changed at all**.
- `src/commit.ts`, `src/changelog-notes/default.ts`, `src/strategies/base.ts`, `src/manifest.ts`, `src/plugins/linked-versions.ts` — changed, but the diffs are only (i) the `GitHub` → `Scm` type rename and (ii) the new opt-in `include-commit-authors` option. No `Release-As` logic is touched.

`src/strategies/node.ts` — the `release-type: node` strategy this repo uses — **was not changed** between v17.3.0 and v17.6.0 either.

The footer behaviour used at `87f59da1` (v0.4.2) therefore carries over to v5 unchanged.

Sources: [library README @ v17.3.0](https://github.com/googleapis/release-please/blob/v17.3.0/README.md), [@ v17.6.0](https://github.com/googleapis/release-please/blob/v17.6.0/README.md), [v17.3.0...v17.6.0 compare](https://github.com/googleapis/release-please/compare/v17.3.0...v17.6.0). Checked 2026-09-22.

---

## Finding 5 — the library bump 17.3.0 → 17.6.0 carries no breaking change

v5 bundles `release-please ^17.6.0` where v4.4.1 bundled `^17.3.0`. Every intervening release, in full:

| Version | Published  | Contents                                                                                                       |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| 17.4.0  | 2026-04-06 | feat `java-yoshi-mono-repo`: look for `Version.java` files; fix: resolve Dependabot security alerts            |
| 17.4.1  | 2026-04-08 | fix: do not attempt to create pull request when no changes detected                                            |
| 17.5.0  | 2026-04-09 | feat: add `include-commit-authors` option; feat: create `Scm` abstraction                                      |
| 17.5.1  | 2026-04-09 | fix: adding `no-verify` option in Git operations                                                               |
| 17.5.2  | 2026-04-10 | fix: limit git fetch to `cloneDepth` config                                                                    |
| 17.6.0  | 2026-04-13 | feat `yoshi-java-monorepo`: update library version in `librarian.yaml`; fix: use GitHub API for updating files |

**No release in that range carries a `⚠ BREAKING CHANGES` section, and the major version does not move.** Of these, three are Java-monorepo-only, one is an opt-in changelog option this repo does not set (`include-commit-authors` defaults undefined, i.e. off), and the rest are fixes.

The two worth naming:

- **`Scm` abstraction (17.5.0, #2729)** — an internal refactor extracting `github.ts` into `scm.ts` + `github-api.ts` + `local-github.ts`. The public shapes survive it intact (see Finding 3). It is the largest single change in the range and is the place a latent regression would live, so it is worth a note, but nothing in it is documented as behaviour-changing.
- **"use GitHub API for updating files" (17.6.0, #2751)** — changes how release-please writes `CHANGELOG.md` / `package.json` when preparing the release PR. It still writes them under the supplied token; it does not touch the Release-creation path.

`main` of the action has since moved past v5.0.0 to `release-please ^17.6.1` (commits `1afbd760`, `0b6b3fc0`, 2026-05-28), but that is **unreleased** — see Finding 7.

Sources: release notes for [17.4.0](https://github.com/googleapis/release-please/releases/tag/v17.4.0), [17.4.1](https://github.com/googleapis/release-please/releases/tag/v17.4.1), [17.5.0](https://github.com/googleapis/release-please/releases/tag/v17.5.0), [17.5.1](https://github.com/googleapis/release-please/releases/tag/v17.5.1), [17.5.2](https://github.com/googleapis/release-please/releases/tag/v17.5.2), [17.6.0](https://github.com/googleapis/release-please/releases/tag/v17.6.0), [17.6.1](https://github.com/googleapis/release-please/releases/tag/v17.6.1). Checked 2026-09-22.

---

## Finding 6 ⚠️ — the biggest surprise: **`@v4` is already running on Node 24 in this repo**

The single breaking change in v5 has, in practice, already been applied to this repo by GitHub, and it works.

From this repo's own release-please run **35338715100** (2026-09-18, the run that cut `v0.23.0`):

```
Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to
temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment
variable.
...
Running release-please version: 17.3.0
✔ Building releases
❯ .: node
✔ Building release for path: .
❯ type: node
✔ Creating 1 releases for pull #2590
...
##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced
to run on Node.js 24: googleapis/release-please-action@v4.
```

The runner enforces this in `HandlerFactory.Create` — when an action declares `node20`, the runner rewrites the version unless opted out:

```csharp
// Check if node20 was explicitly specified in the action
// We don't modify if node24 was explicitly specified
if (string.Equals(nodeData.NodeVersion, Constants.Runner.NodeMigration.Node20, ...)) {
    bool useNode24ByDefault = ...GetBoolean(Constants.Runner.NodeMigration.UseNode24ByDefaultFlag) ?? false;
    bool requireNode24     = ...GetBoolean(Constants.Runner.NodeMigration.RequireNode24Flag) ?? false;
    var (nodeVersion, configWarningMessage) = NodeUtil.DetermineActionsNodeVersion(environment, useNode24ByDefault, requireNode24);
    ...
    nodeData.NodeVersion = finalNodeVersion;
```

**Consequence: the v5 upgrade's runtime risk here is already retired.** `dist/index.js` has been executing on Node 24 in this repo since at least 2026-09-15, and cut four releases that way. What v5 changes is only that the action _declares_ node24 and the deprecation warning stops.

### And it is a deadline, not a preference

The GitHub Changelog, [Deprecation of Node 20 on GitHub Actions runners](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/) (published 2025-09-19, last updated 2026-08-25):

> Beginning on June 16th, 2026, runners will begin using Node24 by default. To opt out of this and continue using Node20 after this date, set `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true` as an `env` in your workflow or as an environment variable on your runner machine. **This will only work until we upgrade the runner and remove Node20 on September 23rd, 2026.**

That removal date is **tomorrow (2026-09-23)** relative to this research. Staying on `@v4` does not break the day it lands — the action is already being force-upgraded to Node 24 anyway, which is the whole point of Finding 6 — but it does mean `@v4` will be permanently declaring a runtime that no longer exists, with no escape hatch left. There is no version of the v4 line that declares `node24`; the last v4 release is v4.4.1 and it declares `node20`.

Sources: [GitHub Changelog: Deprecation of Node 20](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/), [`src/Runner.Worker/Handlers/HandlerFactory.cs`](https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/HandlerFactory.cs), Selftend run [35338715100](https://github.com/Selftend/selftend/actions/runs/35338715100). Checked 2026-09-22.

---

## Finding 7 — v4 is effectively frozen, and the `@v4` tag has not moved since before v5

- Last v4 release: **v4.4.1, published 2026-04-13T14:23:28Z**.
- The mutable `@v4` tag is an annotated tag created **2026-04-13T14:23:33Z**, pointing at commit `5c625bfb` (`chore(main): release 4.4.1`). It has **not been moved since**, and there has been no v4 release to move it to.
- v5.0.0 landed nine days later, 2026-04-22.
- The repository's branches are `main`, `backport/v3.x`, `rename`, and a Dependabot branch. **There is no v4 maintenance branch.** The only backport branch in existence is for v3.x.
- Post-v5 work on `main` (`1afbd760`, `0b6b3fc0`, both 2026-05-28, bumping the library to 17.6.1) went to `main`, not to a v4 line.

So `@v4` is a live pin in the sense that it resolves to a working release, but it is receiving no fixes, no library bumps, and no Node-runtime update. The action's own README at `v5.0.0` still shows `@v4` in its examples — a stale doc, not a maintenance signal.

**Nothing published states that v4 is deprecated or unsupported.** That is an absence of evidence, recorded as such rather than inferred into a statement the maintainers have not made.

Correspondingly, the `@v5` tag points at `45996ed1` (the 5.0.0 release commit) and has **not** been moved to pick up the two post-release commits on `main`. There is no v5.0.1. So `@v5` and `v5.0.0` are currently the same code.

Sources: [action tags](https://github.com/googleapis/release-please-action/tags), [action releases](https://github.com/googleapis/release-please-action/releases), [action branches](https://github.com/googleapis/release-please-action/branches). Checked 2026-09-22.

---

## Finding 8 — two open bugs worth knowing before the upgrade, neither of which is caused by v5

Both were found while reading the action's issue tracker. Neither is a v5 regression, but both bear on this repo.

### #1205 — component-mismatch tagging deadlock. **Does not reproduce here.**

[#1205](https://github.com/googleapis/release-please-action/issues/1205) (2026-05-12, open, 0 comments) reports that a single-package node repo with `include-component-in-tag: false` never tags the merged release PR, logging `⚠ PR component: undefined does not match configured component: <name>` and then `⚠ There are untagged, merged release PRs outstanding - aborting`. It is filed against v5.0.0 / release-please 17.6.0, and the config shape looks alarmingly like this one.

It is not this repo's situation, for three reasons:

1. **The reporter's config differs in the ways that matter.** They set `"component": ""` on the package and a custom `"pull-request-title-pattern": "chore: release ${version}"`, producing a PR titled `chore: release main` that encodes no component. This repo sets neither; it uses `package-name: "selftend"` and the default title pattern, and its release branch is `release-please--branches--main--components--selftend` — the component _is_ encoded.
2. **This repo's logs show no such warning.** Run 35338715100 logs `✔ Building release for path: .` then `✔ Creating 1 releases for pull #2590` with no component-mismatch line.
3. **It is not new in v5.** The component-matching code and `src/strategies/node.ts` are unchanged between 17.3.0 and 17.6.0 (Finding 4/5), so whatever causes #1205 existed in v4.4.1 too. The reporter simply never tested v4.

Recorded as a watch item, not a blocker.

### #1220 — the `release-as` **action input** is silently ignored in manifest mode

[#1220](https://github.com/googleapis/release-please-action/issues/1220) (2026-07-29, open) shows that `with: release-as:` is dropped when the action runs in manifest mode, because `loadOrBuildManifest()` only forwards `releaseAs` on the `Manifest.fromConfig` branch (taken when the `release-type` **input** is set) and never on the `Manifest.fromManifest` branch. The run looks green and releases the wrong version.

This repo runs in manifest mode, so the bug applies — but **this repo does not use that input**; it uses the `Release-As:` commit footer, which is a library feature parsed from commit bodies and is entirely unaffected (Finding 4). The practical takeaway is narrow: do not reach for the `release-as` action input as a substitute for the footer. The bug is present in both v4.4.x and v5 (the input was added in v4.4.0); it is not a v5 regression.

### #1203 — pass-2 failure strands an already-cut release. Pre-existing.

[#1203](https://github.com/googleapis/release-please-action/issues/1203) (2026-04-28, open) documents that a transient GraphQL failure in `createPullRequests()` fails the whole step _after_ `createReleases()` has already cut the tag and written its outputs, leaving downstream `needs:`-gated jobs permanently unreachable. The reporter explicitly confirms it reproduces on both `@v4` and `@v5` and that v5 does not fix it. Suggested workaround in-issue is `continue-on-error: true` on the action step. Noted here only so it is not mistaken for a v5 side-effect.

Sources: [#1205](https://github.com/googleapis/release-please-action/issues/1205), [#1220](https://github.com/googleapis/release-please-action/issues/1220), [#1203](https://github.com/googleapis/release-please-action/issues/1203), Selftend run [35338715100](https://github.com/Selftend/selftend/actions/runs/35338715100). Checked 2026-09-22.

---

## Summary

| #   | Question                                                               | Answer                                                                                                                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Breaking changes in v5.0.0+ touching a plain node single-package setup | **One**: `runs.using: node20` → `node24`. Nothing else. No v5.0.1 or later exists.                                                                                                                                                                                                          |
| 2   | ☠️ Token / Release authorship                                          | **Unchanged.** `token` input identical, still passed to `GitHub.create()`, action still calls `manifest.createReleases()` → `octokit.repos.createRelease` under that token. `src/index.ts` byte-identical v4.4.1 → v5.0.0. Release stays PAT-authored; `on: release` workflows keep firing. |
| 3   | `pr` output                                                            | **Unchanged** in name, JSON shape and "unset when nothing changed" semantics. `PullRequest` type untouched in the library bump. Tier 1 of the #64 lookup keeps working.                                                                                                                     |
| 4   | `Release-As:` footer                                                   | **Unchanged**, documented identically at 17.3.0 and 17.6.0, no source touched. (Distinct from the broken `release-as` _action input_ — #1220.)                                                                                                                                              |
| 5   | v4 maintenance / `@v4` tag                                             | Last v4 release **v4.4.1, 2026-04-13**; `@v4` tag frozen at that commit since **2026-04-13T14:23:33Z**; no v4 maintenance branch. No published deprecation statement — recorded as an absence, not inferred.                                                                                |

**Nothing found is a blocker for taking v5.** The one breaking change is already in force in this repo by runner policy, with four successful releases behind it.

## Recorded gaps

- **No published statement on v4's support status.** The maintainers have not said v4 is deprecated _or_ supported. Finding 7 reports only observable facts (no releases, no branch, tag not moved).
- **No primary source on whether #1205 can be triggered by this repo's exact config.** The reasoning in Finding 8 is source-level and empirical (this repo's logs are clean on 17.3.0), but nobody has run _this_ config against release-please 17.6.0. The first v5 run is the test.
- **The `@v5` tag is mutable and currently equals `v5.0.0`.** Two post-release commits sit unreleased on `main` (library 17.6.1). Whether `@v5` will be moved to a future v5.0.1 with different behaviour cannot be established in advance; it is the standard mutable-tag exposure, not a v5-specific one.

# What the release-thread drafter can read at release time — the priced comparison

Research for [#2601](https://github.com/Selftend/selftend/issues/2601), under map [#2596](https://github.com/Selftend/selftend/issues/2596).

This document does two things the 2026-09-18 findings
([`docs/research/2026-09-18-release-thread-signal-routes.md`](https://github.com/Selftend/selftend/blob/research/release-thread-copy-source/docs/research/2026-09-18-release-thread-signal-routes.md),
branch `research/release-thread-copy-source`) did not:

1. It **re-verifies** that document's load-bearing claims independently, as the map's AFK ruling
   protocol requires. One claim is **wrong** and is corrected below; everything else reproduced.
2. It puts the routes in **one priced table**, which the authoring ticket
   ([#2603](https://github.com/Selftend/selftend/issues/2603)) needs and which the 09-18 document
   spreads across six findings.

It still **chooses nothing**. Checked 2026-09-20 against `origin/dev` (`4a8421f5`), the live GitHub
API, `actions/checkout@v4`, and `release-please` **v17.3.0** source.

---

## The priced comparison

Cost columns: **pipeline** = workflow/permission change; **code** = drafter change; **corpus** =
what happens to `test/fixtures/github-releases.json`; **blast radius** = what else the route moves.

| # | Route | Pipeline cost | Code cost | Per-release runtime cost | Corpus | Sees a signal on a release-please-**excluded** commit? | Blast radius |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **A** | **`changelog-sections` + a custom `user(scope):` type** — the sentence *is* a changelog bullet | **none** — no workflow line, no permission, no network hop | 1 entry in `release-please-config.json`, 1 entry in `SECTION_KINDS` (`picker.mjs:124`) | **zero** | **shape unchanged**; 26 real bodies stay authoritative | **no** (cannot, by construction) | ☠️ a lone `user:` commit becomes **release-triggering** — `changelogEmpty` is `split('\n').length <= 1`, not a type list |
| **B** | **`BEGIN_NESTED_COMMIT` block** carrying a `user(scope):` line | none | same as A (needs A's section to render) | zero | shape unchanged | no | documented mechanism; the author must remember the markers |
| **C** | **`BEGIN_COMMIT_OVERRIDE` in the PR body** | none — release-please already reads `commit.pullRequest.body` (`src/commit.ts:449–455`) | same as A | zero | shape unchanged | no | ☠️ the override is **total**: a malformed block drops the commit from the changelog entirely, and the `(#N)` link is lost unless retyped |
| **D** | **`GET /issues/{n}` per PR** (labels + PR body) | **none** — `issues: write` already declared, and `GET /issues/{n}` is documented under *both* Issues:read and Pull requests:read | a fetch seam + the join | ≤ **79** REST calls worst case (v0.16.0), median 5; ~5 KB each | second fixture keyed by PR number | no (the numbers come from the bullets) | 377/415 bullets carry `#N`; the other 38 need a defined fallback |
| **D′** | **one GraphQL query, aliased `pullRequest(number:)`** | GraphQL `pullRequest` reads need **`pull-requests: read`** — one workflow line | same seam | ✅ **measured: 90 PRs in 1 request, `cost: 1` point, `nodeCount: 1800`**, returning title + body + labels | same | no | collapses D's call count to one hop |
| **E** | **`GET /compare/{base}...{head}`** — full commit messages incl. trailers | **none** — `contents: read` already declared | a fetch seam + a trailer grammar | **1 call**, but ☠️ **1.4–2.2 MB** of payload (the `files` array is capped at 300 *and cannot be suppressed*) | second fixture keyed by SHA | **yes — and that is a hazard, not only a capability** | 250-commit paging limit; this repo's biggest range is 139 |
| **F** | **`git log <prev-tag>..<tag>`** | **one line** (`fetch-depth: 0`, optionally `+ filter: blob:none`); no permission change | a parse seam + a trailer grammar | +49 MB `.git`, a few seconds of clone | second fixture keyed by SHA | **yes — same hazard as E** | ⚠️ `git interpret-trailers` silently misses a trailer that is not in the final paragraph; `d63d43de`'s own `Release-As:` demonstrates it |
| **G** | **`changelog-type: "github"`** (label-categorised via `.github/release.yml`) | none | large — every line's format changes | zero | ☠️ **destroyed** — all 26 frozen bodies become a format release-please will never emit again | no | the only route where a **PR label** shapes the body with no extra call, and the most expensive one |

**The one-sentence reading of the table.** A–C are near-free and cannot see past release-please's own
inclusion rule; D/D′ are near-free and are the only route to a **PR label** short of G; E/F buy
visibility into commits the changelog dropped and pay for it in payload, fixtures and a trailer
grammar; G is mechanically available and demolishes the corpus.

---

## Verification log — what reproduced, and the one correction

### ✅ Reproduced exactly (independent re-measurement, 2026-09-20)

Re-derived from `test/fixtures/github-releases.json` with a fresh script rather than by reading the
09-18 numbers:

```
{ releases: 26, bullets: 415, withSha: 414, withPr: 377, compareHeaders: 26, fetched_at: '2026-09-05' }
```

- **414/415** bullets carry the full 40-char SHA; **377/415** carry `([#N](…/issues/N))`; **26/26**
  bodies open with a `compare/vA...vB` header. All three match the 09-18 document.
- **The hotfix worry is answered by the body, in every hotfix this repo has had.** All eight patch
  releases in the corpus — `v0.3.2`, `v0.3.3`, `v0.4.1`, `v0.4.2`, `v0.6.1`, `v0.11.1`, `v0.11.2`,
  `v0.14.1` — name their immediate predecessor:
  `## [0.14.1](…/compare/v0.14.0...v0.14.1)`. Nothing has to reconstruct "the previous tag";
  release-please writes the base it actually diffed.
- **`.github/workflows/release-thread.yml`** declares `permissions: contents: read` / `issues: write`
  and checks out with `uses: actions/checkout@v4` and **no `ref:`, no `fetch-depth:`** — read in the
  file, not from memory. `actions/checkout@v4` `action.yml` defaults: `fetch-depth: 1`,
  `fetch-tags: false`; a `filter:` input exists.
- **`release-please-config.json`** is `release-type: node`, `include-component-in-tag: false`,
  `bump-minor-pre-major: true`, a `bootstrap-sha`, one package — **no changelog key of any kind**.
- **`changelog-sections`** is a schema key at v17.3.0: *"Override the Changelog configuration
  sections"*, items `{type, section, hidden?}`. **`changelog-type`** is `enum: ["default","github"]`
  — there is no hook for a custom `ChangelogNotes` class.
- **The release-skip gate** (`src/strategies/base.ts:327`, `:521`):

  ```ts
  if (!bumpOnlyOptions && this.changelogEmpty(releaseNotesBody)) { … 'No user facing commits found …' }
  protected changelogEmpty(changelogEntry: string): boolean { return changelogEntry.split('\n').length <= 1; }
  ```

  Confirms route A's hazard: **anything that renders a bullet cuts a release.**
- **`preprocessCommitMessage`** (`src/commit.ts:449–455`) does read `commit.pullRequest.body` and
  does split on `BEGIN_COMMIT_OVERRIDE` / `END_COMMIT_OVERRIDE`. **`splitMessages`**
  (`src/commit.ts:381`) splits on `BEGIN_NESTED_COMMIT` and on a blank line followed by one of
  exactly eleven hardcoded types — `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`.
  `user` is not among them, so route B's marker-free variant is incidental, not supported.
- **`/compare` returns full commit messages including trailers.** `d63d43de` comes back from
  `compare/v0.22.0...v0.23.0` as a 24-line message with `Release-As: 0.23.0` intact.
- **`picker.mjs`'s `SECTION_KINDS`** is a three-entry `Map` (`Features`→feat, `Bug Fixes`→fix,
  `Performance Improvements`→perf), consulted at `:164`. Route A's whole drafter change is a fourth
  entry.

### ☠️ Corrected — `/commits/{sha}/pulls` is **not** covered by `contents: read`

The 09-18 document's permissions table puts `GET /repos/{o}/{r}/commits/{sha}/pulls` under
**Contents: read** and marks the workflow as already having it. It does not have it.

Parsed out of GitHub's own *Permissions required for fine-grained personal access tokens* page
(2026-09-20) by locating each endpoint's enclosing `Repository permissions for "…"` heading:

```
/repos/{owner}/{repo}/commits/{commit_sha}/pulls  =>  Repository permissions for "Pull requests"
/repos/{owner}/{repo}/compare/{basehead}          =>  Repository permissions for "Contents"
/repos/{owner}/{repo}/issues/{issue_number}       =>  Repository permissions for "Issues"
/repos/{owner}/{repo}/issues/{issue_number}       =>  Repository permissions for "Pull requests"
```

Three consequences:

- **The SHA → PR fallback costs a permission line.** The 38 bullets with no `#N` can only be resolved
  through `/commits/{sha}/pulls`, which needs `pull-requests: read` added to the workflow.
- **The `#N` route really is free.** `GET /issues/{n}` appears under *both* Issues and Pull requests
  with `additional-permissions: false` in each — i.e. either permission grants it, so the workflow's
  existing `issues: write` suffices. That is the strongest documentary answer available without
  running a scoped `GITHUB_TOKEN` in Actions, and it closes the 09-18 document's open item as far as
  documentation can close it.
- Empirically, against this repo: `GET /repos/Selftend/selftend/issues/2587` returns
  `pull_request != null`, `labels: []`, a `body` of 2,268 characters, and the PR title.

### ✅ New measurement — the GraphQL batch is one request and one point

The 09-18 document left "GraphQL point cost for a batched aliased PR query: not measured" open.
Measured here: **90 aliased `pullRequest(number:)` nodes, each selecting `number title body
labels(first:20)`, in one request.**

```json
{ "cost": 1, "remaining": 4761, "nodeCount": 1800 }
```

One request, **one point**, every body and label set returned. So "79 calls worst case" is an upper
bound on the naive shape only; the batched shape is a single hop. Caveat: GraphQL `pullRequest`
reads need `pull-requests: read`, so D′ costs the workflow line D does not.

### ⚠️ Re-measured — `/compare` payloads are larger at default paging than the 09-18 table shows

The 09-18 table measured at `per_page=1`. At the **default** paging a workflow would actually use:

| Range | `total_commits` | payload, default | payload at `per_page=1` |
| --- | --- | --- | --- |
| `v0.15.0...v0.16.0` | 139 | **2.18 MB** | 1.18 MB |
| `v0.20.0...v0.21.0` | 52 | **1.68 MB** | — |
| `v0.19.0...v0.20.0` | 31 | **1.43 MB** | — |
| `v0.21.0...v0.22.0` | 7 | **0.15 MB** | — |
| `v0.22.0...v0.23.0` | 9 | **0.14 MB** | — |

`files` stays at **300 even at `per_page=1`** (confirmed: `{commits: 1, files: 300, tc: 139}`), so
the floor is ~1.2 MB whatever the paging. GitHub documents both caps on the endpoint page: *"the
returned list is limited to 250 commits"* when called without paging parameters, and *"it includes
up to 300 changed files for the entire comparison."* One call still always suffices for this repo's
history.

### ⚠️ New — the repo is a major version behind the action, and still unpinned

`release-please.yml` uses `googleapis/release-please-action@v4`, a mutable major tag whose
`package.json` declares `"release-please": "^17.3.0"`. **The action's latest release is `v5.0.0`,
published 2026-04-22**, so the repo is not merely unpinned within v4 — it is a major behind. Any
route leaning on 17.3.0 internals (the `splitMessages` type list, `preprocessCommitMessage`, the
blanked `body`) leans on a version this repo neither pins nor tracks. Routes A and G depend only on
*documented config keys*, which is the weakest coupling in the set; B, C and the trailer routes
depend on parser internals.

---

## Two things worth carrying into the authoring decision

**1. A PR-template field is readable by four transports at once, not one.**
`.github/pull_request_template.md` has no user-facing field today. If one were added, PRs into `dev`
are squash-merged and GitHub takes the squash *body* from the PR description, so the same text is
simultaneously (a) in `commit.pullRequest.body`, which release-please already reads for
`BEGIN_COMMIT_OVERRIDE` (route C), (b) in the commit body `/compare` returns (route E), (c) in the
commit body `git log` would see (route F), and (d) in the `body` field `/issues/{n}` returns (route
D). #2592's candidate 2 is therefore not a separate mechanism — it is a *source* that any of four
transports can carry. Choosing the transport and choosing the authoring moment are independent
decisions.

**2. Only E and F can see a signal release-please threw away, and that is a liability as much as a
capability.** `v0.22.0..v0.23.0` contains `4f32e164 draft(positioning): …` — discarded because
`draft` is not a known type, which is the very stranding `d63d43de` was written to document. A route
that *scans* the commit range would announce a change that never entered the changelog and never
entered `CHANGELOG.md`. Joining by the SHA each bullet already carries avoids that; scanning does
not. So E and F's distinguishing power exists only in the scanning mode that also produces the
defect.

---

## Still open

- Whether `issues: read`, as `GITHUB_TOKEN` scopes it inside Actions, really returns a **PR** through
  `/issues/{n}`. Documented under both permission sets with no "additional permissions" flag, and
  empirically true with a PAT; not exercised with a scoped `GITHUB_TOKEN` in a workflow run.
- Whether a `changelog-sections`-visible custom type and the `changelogEmpty` gate compose exactly as
  read here. Gate and bump were verified in isolation at v17.3.0; not run end-to-end.
- Clone timings for route F are carried forward from the 09-18 document (home connection, not a
  GitHub-hosted runner). The sizes are exact; the seconds are indicative.
- What `release-please-action@v5` changes, if the repo ever moves to it. Not investigated.

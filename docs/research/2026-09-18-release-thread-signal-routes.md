# What the release-thread drafter can read at release time, and what each route costs

Research for [What the drafter can read at release time, beyond the changelog body - and what each route costs](https://github.com/Selftend/selftend/issues/2601), under map [Who writes the user-facing sentence, and when](https://github.com/Selftend/selftend/issues/2596).

**All third-party facts checked 2026-09-18** against release-please `17.3.0` (see Finding 0 for why that version), `actions/checkout@v4`, and GitHub's REST documentation. Local claims are measured against `origin/main` at `aed79a244` (v0.23.0).

This document **chooses nothing**. It prices the routes; the authoring ticket picks one.

---

## Summary of what changed about the premise

The map's premise — "a release-please changelog carries commit subjects and links, nothing else" — is **true about the text** and **understates what the text identifies**. Two measurements:

- **414 of 415** corpus bullets carry the **full 40-character commit SHA** in the commit link's href. The single exception is a `### ⚠ BREAKING CHANGES` note line, which `parseChangelog` already gives `kind: null`. Every pickable entry, in every release, names its commit.
- **377 of 415** corpus bullets also carry the **PR number** as `([#N](…/issues/N))`. Coverage is 0/34 before v0.3.1 and 377/381 after, the four stragglers being unscoped v0.13.0 entries the picker spares anyway.
- **26 of 26** corpus bodies open with a compare link naming **both range endpoints** — `## [0.23.0](…/compare/v0.22.0...v0.23.0) (2026-09-18)`.

So the body the drafter reads today already contains the range endpoints and, per entry, a commit SHA and (usually) a PR number. That collapses most of the cost the ticket set out to price: the hard part was never "which commits", it was "one more network hop".

---

## Finding 0 — the pinned release-please version

`.github/workflows/release-please.yml` uses `googleapis/release-please-action@v4`. That is a **mutable major tag**: at the time of checking it resolves to action `4.4.1`, whose `package.json` declares `"release-please": "^17.3.0"`. The library is bundled into the action's `dist/`, so the effective version is whatever `^17.3.0` resolved to when that action release was built, and it can move without a change in this repo. Everything below was read at **release-please `v17.3.0`** and, where marked _(probe)_, executed against `release-please@17.3.0` installed from npm.

`release-please-config.json` is a plain `release-type: node` single-package config: no `changelog-sections`, no `changelog-type`, no changelog customisation of any kind.

Sources: [`release-please-action` `package.json` @ v4](https://github.com/googleapis/release-please-action/blob/v4/package.json), repo `.github/workflows/release-please.yml`, repo `release-please-config.json`.

---

## Finding 1 — why the commit body never reaches the changelog, exactly

Not an accident of the template. `DefaultChangelogNotes.buildNotes` builds each writer commit with the body **explicitly blanked**:

```ts
return {
  body: '', // commit.body,
  subject: htmlEscape(commit.bareMessage),
  type: commit.type,
  scope: commit.scope,
  notes,            // filtered to title === 'BREAKING CHANGE' only
  references: commit.references,
  …
  footer: commit.notes
    .filter(note => note.title === 'RELEASE AS')
    .map(note => `Release-As: ${note.text}`)
    .join('\n'),
  hash: commit.sha,
};
```

And the preset's `commit.hbs` renders only scope, subject (or header), the commit link and a `, closes …` reference list — never `body`, never `footer`.

Two consequences that matter downstream:

- A `User-Facing:` trailer can **never** reach the changelog as text, whatever its position or format.
- The `#N` link in every bullet comes from the preset's transform linkifying `#N` **inside the subject** (`config.issuePrefixes` → `[#N](issueUrlFormat)`), i.e. from GitHub's squash default appending `(#N)` to the PR title. It is not a `references` entry, which is why there is no `, closes` in this repo's bodies.

Sources: [`src/changelog-notes/default.ts` @ v17.3.0](https://github.com/googleapis/release-please/blob/v17.3.0/src/changelog-notes/default.ts), [`conventional-changelog-conventionalcommits@6.1.0` `writer-opts.js`](https://unpkg.com/conventional-changelog-conventionalcommits@6.1.0/writer-opts.js) and [`templates/commit.hbs`](https://unpkg.com/conventional-changelog-conventionalcommits@6.1.0/templates/commit.hbs).

---

## Finding 2 — `git log <prev-tag>..<tag>`: the range is free, the history is not

### The endpoints are already in the body

The compare link release-please writes into the header line **is** the range it used, ending at this release's own tag, in 26 of 26 corpus bodies. Nothing needs to guess "the previous tag", and the hotfix case the ticket worries about is answered by construction: release-please names the base it actually diffed.

### The history is not there today

`actions/checkout@v4` defaults are `fetch-depth: 1` and `fetch-tags: false`; `ref` defaults to the triggering ref (the tag, on a release event). So `git log v0.22.0..v0.23.0` fails today: neither the previous tag nor any ancestor is present.

### Measured cost of fixing that

Clones of this repo from GitHub (my link, not a runner's — treat the ratio, not the seconds, as the finding):

| Checkout                                                        | `.git` on disk | wall clock |
| --------------------------------------------------------------- | -------------- | ---------- |
| `--depth 1 --no-tags` (today)                                   | 32 MB          | 6 s        |
| full (`fetch-depth: 0`)                                         | 81 MB          | 10 s       |
| full + `--filter=blob:none` (checkout v4 has a `filter:` input) | 36 MB          | 12 s       |

GitHub reports the repo at 80,966 KB. So the honest price of the git route is **one workflow line** (`fetch-depth: 0`, or `fetch-depth: 0` + `filter: blob:none`) and **a few seconds**. It is the cheapest change in workflow terms of any route here.

### Fragility, which is where it actually costs

- **The range is a superset of the changelog.** `v0.22.0..v0.23.0` is 9 commits for a 1-bullet changelog: four merge commits, two back-merge merges, the release commit, and `4f32e164 draft(positioning): …` — a commit release-please **discarded** because `draft` is not a known type. Any git-log route must re-implement release-please's own inclusion rule, or join back to the changelog by SHA (which, per the Summary, is available).
- **`git interpret-trailers` is the wrong tool here.** Git only parses the _last_ paragraph as a trailer block. In `d63d43de`, `Release-As: 0.23.0` sits in its own paragraph above a blank line and then `Claude-Session:` / `Co-authored-by:`; `git interpret-trailers --parse` on it returns **only** `Co-authored-by`. A `User-Facing:` trailer read with `%(trailers:key=…)` would be silently missed unless the author put it in the same final block as the attribution lines this repo's agent convention already appends. A plain regex over `%B` avoids this — which is exactly what release-please does for `Release-As`.

Sources: [`actions/checkout@v4` `action.yml`](https://github.com/actions/checkout/blob/v4/action.yml), local clone measurements, `git log`/`git interpret-trailers` against `d63d43de`.

---

## Finding 3 — the GitHub API route: bounded, and already permitted

### Every endpoint works under the workflow's current permissions

`release-thread.yml` declares `contents: read` and `issues: write`. GitHub's fine-grained permissions reference maps:

| Endpoint                                 | Permission required | Workflow has it?                   |
| ---------------------------------------- | ------------------- | ---------------------------------- |
| `GET /repos/{o}/{r}/compare/{basehead}`  | **Contents: read**  | yes                                |
| `GET /repos/{o}/{r}/commits/{sha}/pulls` | **Contents: read**  | yes                                |
| `GET /repos/{o}/{r}/issues/{n}`          | **Issues: read**    | yes (`write` implies read)         |
| `GET /repos/{o}/{r}/pulls/{n}`           | Pull requests: read | **no** — would need one added line |

The third row is the useful one. "GitHub's REST API considers every pull request an issue" is documented, and I confirmed empirically that `GET /repos/Selftend/selftend/issues/2579` returns `pull_request != null`, the `labels` array, the full `body` and the `title` for a **PR** number. **A `user-facing` label and a PR-template field are both reachable with zero permission change.** (Caveat: the permissions table is written for fine-grained PATs; `GITHUB_TOKEN` uses the same permission model, but I did not exercise a scoped `GITHUB_TOKEN` to prove it.)

### Call counts are small

Distinct PR numbers among _eligible_ entries (`kind !== null`, not denied), across the 26-release corpus:

- worst case **79** (v0.16.0); next **71** (v0.13.0), **55** (v0.7.0); median 5.
- `GITHUB_TOKEN` is rate-limited to **1,000 requests per hour per repository**. 79 sequential calls on a workflow that fires ~150 times a year is not close to any limit.
- A single GraphQL query with aliased `pullRequest(number:)` nodes would collapse that to 1–2 calls. I did not measure its point cost.

### The compare endpoint gives whole commit messages in one call

`GET /compare/{base}...{head}` returns each commit's **full message including body and trailers** — verified: `d63d43de` comes back as a 24-line message with `Release-As:` intact. Limits: **250 commits without paging parameters**, paginated beyond that; the biggest range in this repo's history is **139** commits (v0.15.0→v0.16.0), so one call always suffices today.

The cost is payload, not calls. The `files` array is capped at 300 **for the whole comparison** and **cannot be suppressed** — `per_page=1` still returned 300 files. Measured response sizes:

| Range           | `total_commits` | payload at `per_page=1` |
| --------------- | --------------- | ----------------------- |
| v0.15.0…v0.16.0 | 139             | 1.17 MB                 |
| v0.12.0…v0.13.0 | 92              | 1.09 MB                 |
| v0.22.0…v0.23.0 | 9               | 0.09 MB                 |

So compare is ~1 MB for a promotion release, one call, no git history, no new permission. Per-PR lookups are ~79 small calls at worst and give **labels** as well as bodies, which compare does not.

Sources: [REST: commits](https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28), [REST: issues](https://docs.github.com/en/rest/issues/issues?apiVersion=2022-11-28), [Permissions required for fine-grained PATs](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens?apiVersion=2022-11-28), [REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28), live `gh api` calls against this repo.

---

## Finding 4 — release-please can put the sentence in the changelog itself

This is the answer to the ticket's question 3, and it is _yes_, four different ways, three of them documented and all four verified by probe against `release-please@17.3.0`.

### 4a. `changelog-sections` with a custom type — the near-zero-pipeline route

`changelog-sections` is a schema-documented config key: _"Override the Changelog configuration sections"_, an array of `{type, section, hidden?}`. The preset discards any commit whose type has no entry (`if (discard && (entry === undefined || entry.hidden)) return`), which is precisely why a custom type is inert today and visible the moment it is listed.

**Probe.** Feeding release-please's own `parseConventionalCommits` + `DefaultChangelogNotes` these commits, with `changelog-sections` extended by `{type: 'user', section: 'For people using Selftend'}`:

```
feat(seo): /habits, the second public explainer page (#2470)

some body text

user: You can now read about habits on the web.
```

produced:

```md
### Features

- **seo:** /habits, the second public explainer page ([#2470](…/issues/2470)) ([aaaaaaa](…/commit/aaaaaaa2))

### For people using Selftend

- **audio:** Beds no longer click at the start. ([aaaaaaa](…/commit/aaaaaaa3))
- **x:** A sentence written in the PR body. ([aaaaaaa](…/commit/aaaaaaa4))
- You can now read about habits on the web. ([aaaaaaa](…/commit/aaaaaaa2))
```

Two things this settles:

- The shape is **exactly what `parseChangelog` already handles** — `### <heading>` then `* **scope:** text ([sha](…))`. The whole picker change is adding one entry to `SECTION_KINDS`. The workflow does not change. The permissions do not change. The fixture format does not change.
- **Scope is not automatic.** An unscoped `user:` line renders unscoped and the picker spares it as `"unscoped"`. The convention would have to be `user(scope):`.

### 4b. The multi-message split, and what actually triggers it

Documented as _"Release Please allows you to represent multiple changes in a single commit, using footers"_, with the warning _"The additional messages must be added to the bottom of the commit."_

`splitMessages` only splits a message at a blank line followed by one of eleven hardcoded types:

```ts
.split(/\r?\n\r?\n(?=(?:feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(?:\(.*?\))?: )/)
```

**But the probe shows a custom `user:` line is still picked up as a separate commit** — the underlying `@conventional-commits/parser` finds it even though `splitMessages` did not split there. `BEGIN_NESTED_COMMIT` / `END_NESTED_COMMIT` wrapping also works and is the explicit mechanism. I would treat the unwrapped case as observed-but-incidental and the wrapped case as the supported one.

### 4c. `BEGIN_COMMIT_OVERRIDE` in the **PR body** — the documented "fix release notes" hook

Verified in source: `preprocessCommitMessage` reads `commit.pullRequest.body`, and if it contains a `BEGIN_COMMIT_OVERRIDE … END_COMMIT_OVERRIDE` block, **that block replaces the entire commit message**. The PR body is fetched live via GraphQL `associatedPullRequests`, so editing a merged PR's description changes the next changelog — the documented purpose. The docs warn it _"will not work with plain merges"_; this repo squash-merges into `dev`, so it applies.

Probe result — the block carried both the subject and a `user(x):` sentence, and both appeared. **The cost is that the override is total**: the probe's overridden entry rendered as `* **x:** overridden subject ([aaaaaaa](…/commit/aaaaaaa4))` with **no `#N` link**, because the `(#2470)` that GitHub appends to the squash subject is not part of the override text unless retyped. The edit window is also bounded: once the release PR merges and the release publishes, the body is fixed.

### 4d. `changelog-type: "github"` — possible, and it would demolish the corpus

The schema enum is `["default", "github"]`; there is **no config key for a custom `ChangelogNotes` implementation**. `GitHubChangelogNotes.buildNotes` ignores its `_commits` argument entirely and calls `github.generateReleaseNotes(...)`, i.e. GitHub's own generated release notes — which _are_ label-categorisable through `.github/release.yml`, making it the only route where a `user-facing` **label** shapes the body with no extra API call.

It also replaces every line's format (`* PR title by @author in #N`), discards scopes, and invalidates all 26 frozen bodies at once. Recording it as mechanically available, not as cheap.

Sources: [release-please README @ v17.3.0](https://github.com/googleapis/release-please/blob/v17.3.0/README.md), [`docs/manifest-releaser.md`](https://github.com/googleapis/release-please/blob/v17.3.0/docs/manifest-releaser.md), [`schemas/config.json`](https://github.com/googleapis/release-please/blob/v17.3.0/schemas/config.json), [`src/commit.ts`](https://github.com/googleapis/release-please/blob/v17.3.0/src/commit.ts), [`src/changelog-notes/github.ts`](https://github.com/googleapis/release-please/blob/v17.3.0/src/changelog-notes/github.ts), probes against `release-please@17.3.0`.

---

## Finding 5 — what each route does to the frozen corpus

`test/fixtures/github-releases.json` is `{source, fetched_at, releases: [{tag_name, name, published_at, prerelease, html_url, body}]}` — 26 entries, v0.2.0 to v0.17.0, frozen from the releases API on 2026-09-05. Four test files assert over it, and the picker's CLI reads it directly via `releaseFromCorpus`, which is how `--tag v0.16.0` works with no body.

The distinction that decides testability: **does the route change the fixture's _shape_, or only its _content_?**

| Route                                        | What the fixture becomes                                                                                                                                                                                                                                                                                                       | Corpus still usable?           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| **4a custom changelog section**              | unchanged shape; 26 real bodies keep testing parse/clean/pick/render exactly as today. A new section needs _synthetic_ bodies (the tests already build these inline — `test/release-thread-picker.test.ts` has several) or one hand-written 27th entry marked synthetic.                                                       | **yes, fully**                 |
| **4b / 4c (nested commit, commit override)** | same as 4a — both land as ordinary bullets in an existing or custom section.                                                                                                                                                                                                                                                   | **yes, fully**                 |
| **API: PR labels / PR bodies**               | a **second** fixture keyed by PR number (`{ "2579": { labels, body } }`) plus a seam in the drafter for the fetch. The 26 bodies stay authoritative for everything they test today; only the new signal needs new data. 91% of corpus bullets already carry a resolvable PR number, so the join is testable against real data. | **yes, with a second fixture** |
| **`git log` trailers**                       | a fixture of **commit messages** keyed by SHA, plus a seam. Same structure as the API case; 100% of pickable bullets carry a SHA.                                                                                                                                                                                              | **yes, with a second fixture** |
| **4d `changelog-type: github`**              | every one of the 26 bodies is a body release-please will never produce again. The corpus becomes a regression record of a retired format.                                                                                                                                                                                      | **no**                         |

Everything except 4d keeps `#1880`'s property — that the drafter is exercised against bodies the pipeline really emitted. The two-fixture routes add a **staleness** cost the single fixture does not have: a PR's labels and body are mutable after merge, so a frozen copy can drift from the live API in a way a frozen release body cannot.

---

## Finding 6 — failure modes, per route

### Signal absent

- **4a custom section / 4b / 4c:** the entry simply does not exist. The release renders with fewer bullets and, if nothing else is eligible, `postable: false` — the existing "nothing picked, no post" path (#1876 decision 8). Silent and safe, but also invisible: nothing tells anyone the sentence was forgotten.
- **API (label / PR body):** the PR resolves, the field is missing, the entry is treated as unsignalled. Same silence.
- **API (PR number missing from the bullet):** 38 of 415 corpus bullets have no `#N`. All are pre-v0.3.1 or unscoped. Needs a defined fallback — treat as unsignalled, or fall back to the SHA and `GET /commits/{sha}/pulls`.
- **`git log`:** no trailer found. Plus the `interpret-trailers` trap in Finding 2 — a trailer that _is_ present but not in the final paragraph reads as absent.

### Signal malformed

- **4a:** a `user:` line whose scope is missing renders unscoped → spared as `"unscoped"`, so a malformed signal degrades to "a human looks at it". That is the safe direction.
- **4a, worse:** a sentence containing American spelling or an underscore is caught by `hazardOf` and spared. A sentence containing a link is stripped by `cleanText` step 3. The cleaner does **not** know the difference between a commit imperative and an authored sentence, so a hand-written sentence gets the same capitalisation and dash-normalisation treatment — probably fine, but it is an unreviewed transform on new copy headed for a public surface.
- **4c:** a malformed override block is _worse than absent_. `preprocessCommitMessage` replaces the whole message with whatever is between the markers; if that text is not a valid conventional commit, `parseCommits` throws, the commit is logged at debug and **dropped entirely** — the real change vanishes from the changelog, not just the sentence.
- **`git log` / API body:** a multi-line or colon-bearing value needs a defined grammar; nothing enforces one.

### Signal present on a commit release-please excluded

This is the sharpest asymmetry between the routes.

- **4a / 4b / 4c:** _cannot happen by construction_. The signal only exists as a changelog entry; if release-please excluded it, there is no entry.
- **`git log` and compare:** _happens routinely_. `v0.22.0..v0.23.0` contains `4f32e164 draft(positioning): …`, excluded because `draft` is not a known type — this is the very commit whose stranding `d63d43de` documents. A git-log route that scanned all commits in the range would announce a change that never entered the changelog. Joining by the SHA the bullet carries avoids it; scanning the range does not.
- **API per-PR:** also avoided, because the PR numbers come from the bullets.

### A failure mode unique to 4a: the custom type can cut a release

release-please's skip gate is **not** a list of releasable types. `buildReleasePullRequest` renders the notes first and then:

```js
if (!bumpOnlyOptions && this.changelogEmpty(releaseNotesBody)) {
  this.logger.info(`No user facing commits found since … - skipping`);
  return undefined;
}
```

So _anything that renders a bullet_ makes a release. Today a `user:` line renders nothing and is inert. **Add it to `changelog-sections` and it becomes release-triggering:** a probe of `DefaultVersioningStrategy` bumps a lone `user:` commit to `0.23.1` — the same patch bump an unknown type or a `chore:` gets. A week of docs-and-copy work carrying `user:` sentences would cut a patch release on its own. I verified the gate and the bump in isolation; I did **not** run a full end-to-end release to confirm the two compose as I read them.

### A failure mode unique to the trailer routes

Verified by probe: a `User-Facing: <sentence>` line in a commit body **is not inert text** — `Foo-Bar: subject` matches the conventional-commit header grammar, so release-please parses it as a commit of type `User-Facing` with the sentence as its subject. Today it is discarded (unknown type, not in `config.types`), which is why nothing has gone wrong. But the trailer's _name_ is load-bearing: pick one that collides with a listed type and the behaviour changes.

---

## Open / unverified

- The **effective release-please version is not pinned** by this repo (`@v4` is mutable). Any route that leans on 17.3.0 behaviour — the `splitMessages` type list, `preprocessCommitMessage`, the blanked `body` — is leaning on a version this repo does not control.
- I did **not** exercise a scoped `GITHUB_TOKEN` to prove `issues: read` really returns a PR through `/issues/{n}` in Actions. Empirically true with a PAT; the docs' permission table says it should hold.
- GraphQL point cost for a batched aliased PR query: not measured.
- Whether a `changelog-sections`-visible custom type and the `changelogEmpty` gate compose exactly as Finding 6 reads: gate and bump verified separately, not end-to-end.
- Clone timings are from a home connection, not a GitHub-hosted runner. The sizes are exact; the seconds are indicative.

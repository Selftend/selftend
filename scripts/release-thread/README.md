# Release-thread drafter

Tooling for the r/Selftend release thread, decided across
[map #1873](https://github.com/Selftend/selftend/issues/1873). CI drafts, the
owner posts: nothing here touches the Reddit API.

**These scripts decide nothing.** Every rule cites the ticket that fixed it. If
a value looks wrong, the argument belongs on that ticket.

## The pipeline

1. **`picker.mjs`** (#1948) - a release's changelog body, as release-please wrote
   it, sorted into three tiers: denied (never shown), spares (shown, never
   auto-picked) and up to eight picks, one-per-scope round-robin. Nothing is
   authored: every entry passes through untouched.
2. The cleaner (#1949), the renderer (#1950) and the workflow (#1951) follow.

## Running the picker

```sh
node scripts/release-thread/picker.mjs --tag v0.16.0                       # any past release, from the corpus
node scripts/release-thread/picker.mjs --tag v0.18.0 --body-file body.md   # a body from a file
RELEASE_BODY="..." node scripts/release-thread/picker.mjs --tag v0.18.0    # the workflow's shape
```

It prints JSON:

```jsonc
{
  "tag": "v0.16.0",
  "version": "0.16.0",
  "postable": true, // false when nothing was picked - no thread (#1876 decision 8)
  "picked": [{ "text": "...", "scope": "act", "kind": "feat" }], // at most 8, round-robin order
  "spares": [{ "text": "...", "scope": null, "kind": "fix", "reason": "unscoped" }], // or "overflow"
}
```

Exit 0 whether or not anything was picked - `postable: false` is a skip, not a
failure. A non-zero exit means the picker broke.

## The rules, in one place

All from [#1876](https://github.com/Selftend/selftend/issues/1876):

- Only **Features**, **Bug Fixes** and **Performance Improvements** feed the
  menu. Chores and breaking-change notes reach neither picks nor spares.
- **Denied scopes** never reach the output: `deps ci build lint e2e dev github release scripts seed`.
  A denylist, never an allowlist - the corpus has 85 distinct scope strings with
  a long tail of one-offs, and an allowlist would swallow real news every time a
  feature area first appears. Matching is exact, so a compound scope
  (`ci,auth`) is never denied - it reaches a human as an ordinary entry.
- Every **unscoped** entry is a spare. About half of them are infrastructure
  and a scope filter cannot tell which, so a human sees them all.
- **Round-robin**, never "the first eight": release-please sorts scopes
  alphabetically, so the first eight is reliably the least representative
  eight. The lead is therefore structurally the least newsworthy line - the
  renderer numbers the picks so swapping it is one edit. The picker's order is
  the round-robin's and nothing else; any "features before fixes" ordering in
  the posted thread is the renderer's to impose.
- **Cap 8. Zero picked means no post.**

## The corpus

`test/fixtures/github-releases.json` holds the changelog bodies of all 26
published releases (v0.2.0 to v0.17.0, 413 entries, none a pre-release), fetched
from the GitHub releases API once on 2026-09-05 and frozen. Every drafter ticket
asserts over it in `test/release-thread-picker.test.ts` and its siblings, because
#1880 found that rendering against real releases caught defects the reasoning
had missed.

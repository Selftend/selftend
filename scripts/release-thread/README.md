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
   authored: `parseChangelog` returns every entry untouched.
2. **`cleaner.mjs`** (#1949) - the pure `Entry -> Entry` map `draft()` runs between
   parse and pick, so that every line the drafter shows is safe to paste into
   r/Selftend unchanged. Seven steps rewrite the markup; the eighth sends a line
   a machine must not touch to a human as a spare.
3. **`renderer.mjs`** (#1950) - the tiers to the three things the owner is
   handed: the thread (title and body), the prefilled r/Selftend submit link,
   and the body of the GitHub issue that carries both. The frame sentence and
   the rotated supporting line are constants pinned to `docs/positioning.md`
   by test.
4. The workflow (#1951) follows.

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
  "spares": [{ "text": "...", "scope": null, "kind": "fix", "reason": "unscoped" }], // or "overflow", "spelling", "underscore", "empty"
}
```

Every `text` is cleaned: `"Sign in with Apple"`, not
`"**auth:** Sign in with Apple ([#544](…)) ([7e2586b](…)), closes [#542](…)"`.

Exit 0 whether or not anything was picked - `postable: false` is a skip, not a
failure. A non-zero exit means the picker broke.

## Running the renderer

```sh
node scripts/release-thread/renderer.mjs --tag v0.16.0                    # everything, as JSON
node scripts/release-thread/renderer.mjs --tag v0.16.0 --format thread    # the title, a blank line, the body
node scripts/release-thread/renderer.mjs --tag v0.16.0 --format issue     # the issue body alone
RELEASE_BODY="..." node scripts/release-thread/renderer.mjs --tag v0.18.0 # the workflow's shape
```

The JSON carries `tag`, `version`, `postable`, and when postable also `title`,
`body`, `submitUrl` and `issue: { title, body }`. A release with nothing
picked renders to `postable: false` and no thread; `--format thread` and
`--format issue` print nothing for it. Exit 0 either way; a non-zero exit
means the renderer broke, and the workflow must then create no issue.

The thread, from [#1880](https://github.com/Selftend/selftend/issues/1880):

- **Title** `Selftend <version> - <lead>`: the version without its `v`, the
  first pick as the lead, a hyphen between. The lead is structurally the least
  newsworthy line (the round-robin walks alphabetically sorted scopes), which
  is why the issue numbers the picks.
- **Body**: the frame sentence, one supporting line rotated by
  `(major + minor + patch) mod <line count>`, `In <version>:`, up to eight
  hyphen bullets, and the fixed four-link footer (web, Google Play, App Store,
  full changelog) with no version label on any link.
- **The frame sentence and the supporting lines are constants**, in the sub's
  hyphens-only shape, because no i18n key holds the full sentence.
  `test/release-thread-renderer.test.ts` pins each to `docs/positioning.md`,
  dash-normalised, so a rewording of the doc goes red until the drafter
  follows; the doc's _What binds this document_ table names that test as the
  gate. The tools line stays out of the rotation - directly under a frame
  sentence that already names the everyday tools it restates the opening.
- What the thread may claim is [#1877](https://github.com/Selftend/selftend/issues/1877)'s
  seven rules: time-invariant, no per-platform availability claim (the version
  names a release in the title and the `In <version>:` line, never sits beside
  an availability sentence), third-person, the category declared in the frame
  shape.

The submit link is `https://www.reddit.com/r/Selftend/submit?title=…&text=…`,
both values URL-encoded and nothing else - no flair parameter is verified to
exist, so selecting the **App update** flair is an explicit step in the issue.
Over the corpus the longest link is well under the 3.5 KB
[#1878](https://github.com/Selftend/selftend/issues/1878) verified.

The issue body carries, in order: one line saying the thread is not yet
posted, the submit link outside any fence, the thread fenced (the exact-paste
fallback), the picks numbered, the spares each with the reason it was not
picked, and the steps - flair, submit, close. Closing without posting is a
valid outcome, and a closed issue is never re-drafted.

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

The cleaner's, from [#1880 §3](https://github.com/Selftend/selftend/issues/1880)
(which amends #1876 decision 7) and
[#1877 rule 4](https://github.com/Selftend/selftend/issues/1877), in order:

1. Decode HTML entities (`&quot; &gt; &lt; &#39;`, then `&amp;` last).
2. Drop the bold scope prefix.
3. Remove **every** markdown link wherever it sits - `closes [#974](…)` clauses,
   multi-link parentheticals, and the one where the link is a word mid-sentence.
4. Remove the orphaned `closes` clause and any emptied parentheses.
5. Normalise em dash and en dash to a hyphen (the sub is hyphens-only) and an
   arrow to "to".
6. Collapse whitespace; strip a trailing comma or semicolon.
7. Capitalise the first character. A first token that is an identifier rather
   than a word (`last-7-days`, `useSession`) keeps its case.
8. A line with a **non-British spelling** or **any underscore** is a spare with
   that reason - never picked, never auto-corrected. `favorites` and `colors`
   name identifiers, correct in code and wrong in a post, and no `verify` gate
   covers a changelog line on its way to Reddit; a human in front of it beats a
   mechanical fix that might corrupt a real identifier. The spelling list is a
   tripwire, not a dictionary: the American forms the house style in
   `docs/positioning.md` names. A line the first seven steps emptied (a bullet
   that was only a link) is a spare as `empty`. The ASCII `->` stays: it is
   plain ASCII and Reddit renders it as typed.

Step 8 runs before the round-robin, so a forced spare frees its slot rather
than leaving a hole. Measured over the corpus: 0 residual entities, links,
dashes or underscores in any picked line, the longest picked line 91
characters (down from 383 of raw markdown), 22 of 26 releases postable.

## The corpus

`test/fixtures/github-releases.json` holds the changelog bodies of all 26
published releases (v0.2.0 to v0.17.0, 413 entries, none a pre-release), fetched
from the GitHub releases API once on 2026-09-05 and frozen. Every drafter ticket
asserts over it - `test/release-thread-picker.test.ts`,
`test/release-thread-cleaner.test.ts` and their siblings - because #1880 found
that rendering against real releases caught defects the reasoning had missed.

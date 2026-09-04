#!/usr/bin/env node
/**
 * The release-thread picker — step one of the r/Selftend drafter (#1948).
 *
 * Takes a release tag and that release's changelog body — release-please's
 * conventional-commit changelog, exactly as the `release: published` event
 * delivers it — and prints three tiers as JSON: up to eight picked lines, the
 * spares, and whether anything was picked at all. Run against any past release
 * it shows in one glance which eight areas of the app the thread would lead with.
 *
 *   node scripts/release-thread/picker.mjs --tag v0.16.0                       # from the corpus
 *   node scripts/release-thread/picker.mjs --tag v0.18.0 --body-file body.md   # from a file
 *   RELEASE_BODY="..." node scripts/release-thread/picker.mjs --tag v0.18.0    # from the workflow
 *
 * **This script decides nothing.** Every rule below cites the ticket that fixed
 * it; if a value looks wrong, the argument belongs on that ticket. All ten
 * decisions are #1876's, and the numbers in the comments were measured there and
 * on #1880 over the 26-release corpus committed at `test/fixtures/github-releases.json`.
 *
 * ☠️ NOTHING IS AUTHORED HERE, EVER (#1876 decisions 1 and 2). `parseChangelog`
 * returns the text of every entry untouched — scope prefix, issue links and SHA
 * included — and `pick` only sorts entries into tiers. Between the two, `draft`
 * runs the cleaner (`cleaner.mjs`, #1949), which strips the markup and decodes
 * what the API encoded so every picked line is postable as pasted; the renderer
 * (#1950) lays them out; the owner curates in Reddit's composer.
 *
 * The three tiers (#1876 decision 3):
 *   - DENIED  never reaches the output. A scope that is never user-visible:
 *             `deps ci build lint e2e dev github release scripts seed`.
 *   - SPARES  shown in the draft, never auto-picked: every unscoped entry, plus
 *             everything eligible that did not make the cap.
 *   - PICKED  up to 8, one-per-scope round-robin.
 *   The principle that keeps the denylist maintainable: deny only what is NEVER
 *   user-visible, and send everything ambiguous to spares where a human sees it.
 *   `db` stays (a guest purge is postable privacy news); `ios`/`android`/`web`
 *   stay (a platform-scoped fix is a real fix).
 *
 * ☠️ A DENYLIST, NEVER AN ALLOWLIST. The corpus has 85 distinct scope strings
 * with a long tail of one-offs (`sortables`, `day-key`, `occurrence`, and
 * compounds like `breathing,grounding`). An allowlist would silently swallow
 * real news every time a feature area first appears — the worse failure.
 *
 * ☠️ UNSCOPED IS THE BIGGEST BUCKET: 48 of the 413 entries that feed the menu
 * (49 of 415 bullets, counting v0.4.2's release chore), about half of them
 * infrastructure (*"run wrangler on Node 22 so `_headers` applies"* beside
 * *"unmount dismissed dialogs on web"*). A scope filter cannot tell them apart,
 * so every one of them is a spare and a human reads them.
 *
 * ☠️ ROUND-ROBIN, NEVER "THE FIRST EIGHT". release-please sorts entries
 * alphabetically by scope (verified on v0.16.0: `act`×5, `app`×3, `audio`×2,
 * `auth`×7, `cbt`×7 …), so the first eight in changelog order is reliably the
 * least representative eight — on the 77-feature promotion release it is eight
 * `a11y`/`act`/`app`/`audio` lines. Round-robin shows eight AREAS of the app
 * moving instead (decision 6). Scopes walk in order of first appearance, which
 * is that same alphabetical order — the lead is therefore structurally the
 * least newsworthy line, which is why the renderer numbers the picks (#1880).
 *
 * Only Features, Bug Fixes and Performance Improvements feed the menu
 * (decision 4). An entry under any other section — Miscellaneous Chores, the
 * `⚠ BREAKING CHANGES` notes — reaches neither picks nor spares. The cap is 8
 * (decision 5, the owner's call). Zero picked means no post (decision 8): the
 * output says so with `postable: false`, and that is the state the workflow
 * (#1951) keys on. Exit code stays 0 — a green run with nothing picked is a
 * SKIP; only a red run means the drafter broke (#1878 decision 6).
 *
 * The seam the cleaner uses: an entry that arrives at `pick` with a `reason`
 * already set is honoured as a spare with that reason and never competes for a
 * slot, so a forced spare (a non-British spelling, an underscore — #1949 step 8)
 * frees its slot instead of leaving a hole.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { clean } from "./cleaner.mjs";

/**
 * @typedef {"feat" | "fix" | "perf"} Kind
 *
 * @typedef {object} Entry
 * @property {string} text   the raw entry, everything after the bullet, untouched
 * @property {string | null} scope   the conventional-commit scope, or null when unscoped
 * @property {Kind | null} kind   the section the entry sits under, or null for an ineligible section
 * @property {boolean} denied   true when the scope is on {@link DENIED_SCOPES}
 * @property {string} [reason]   set by the cleaner (#1949) to force the entry into spares
 *
 * @typedef {object} Tiered
 * @property {string} text
 * @property {string | null} scope
 * @property {Kind} kind
 *
 * @typedef {"unscoped" | "overflow"} PickerReason   the picker's own reasons (#1876 decision 3)
 * @typedef {PickerReason | import("./cleaner.mjs").Hazard} Reason
 *
 * @typedef {Tiered & { reason: Reason }} Spare
 *
 * @typedef {object} Draft
 * @property {string} tag
 * @property {string} version
 * @property {boolean} postable   false when nothing was picked — no thread (#1876 decision 8)
 * @property {Tiered[]} picked   at most {@link CAP}, in round-robin order
 * @property {Spare[]} spares   in changelog order, each with the reason it was not picked
 */

/** Scopes that are never user-visible (#1876 decision 3). Exact strings, lower-case. */
export const DENIED_SCOPES = new Set([
  "deps",
  "ci",
  "build",
  "lint",
  "e2e",
  "dev",
  "github",
  "release",
  "scripts",
  "seed",
]);

/** The most lines a thread carries (#1876 decision 5). */
export const CAP = 8;

/** release-please's section headings, and the kind each maps to (#1876 decision 4). */
const SECTION_KINDS = new Map([
  ["Features", "feat"],
  ["Bug Fixes", "fix"],
  ["Performance Improvements", "perf"],
]);

/** Repo-relative path of the frozen corpus, resolved from the working directory. */
const CORPUS_PATH = "test/fixtures/github-releases.json";

/**
 * Exact match against the denylist. A compound scope (`ci,deps`, `nav+design`)
 * is a different string, so it is never denied — it goes to a human as an
 * ordinary eligible entry, which is the safe side of #1876 decision 3.
 * @param {string} scope
 */
export function isDenied(scope) {
  return DENIED_SCOPES.has(scope);
}

/**
 * Parse a release-please changelog body into entries. Every bullet is returned,
 * whatever section it sits under — the kind is null for an ineligible section so
 * the caller can see what was dropped and why. Only `* ` bullets are entries;
 * the corpus has never carried a continuation line, and a line that is neither
 * a heading nor a bullet is ignored.
 *
 * @param {string} body
 * @returns {Entry[]}
 */
export function parseChangelog(body) {
  /** @type {Entry[]} */
  const entries = [];
  /** @type {Kind | null} */
  let kind = null;
  for (const raw of (body ?? "").split(/\r?\n/)) {
    const line = raw.trimEnd();
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      // `### Features` → feat; `## [0.16.0](...) (date)`, `### Miscellaneous
      // Chores`, `### ⚠ BREAKING CHANGES` → null.
      kind = SECTION_KINDS.get(heading[1].trim()) ?? null;
      continue;
    }
    const bullet = /^\*\s+(.*)$/.exec(line);
    if (!bullet) continue;
    const text = bullet[1];
    const scoped = /^\*\*([^*]+?):\*\*\s/.exec(text);
    // The scope is a bucket key, so it is lower-cased here once; `text` keeps
    // whatever case the commit carried. The corpus has never had an upper-case
    // scope, but `Auth` and `auth` must not become two round-robin slots.
    const scope = scoped ? scoped[1].trim().toLowerCase() : null;
    entries.push({ text, scope, kind, denied: scope !== null && isDenied(scope) });
  }
  return entries;
}

/**
 * Sort parsed entries into picks and spares.
 *
 * @param {Entry[]} entries
 * @param {{ cap?: number }} [options]
 * @returns {{ picked: Tiered[], spares: Spare[] }}
 */
export function pick(entries, { cap = CAP } = {}) {
  /** @type {Array<{ index: number, spare: Spare }>} spares, tagged with changelog position */
  const spared = [];
  /** @type {Map<string, Array<{ index: number, tiered: Tiered }>>} scope → its eligible entries, in changelog order */
  const byScope = new Map();

  entries.forEach((entry, index) => {
    if (entry.kind === null || entry.denied) return; // never shown
    const tiered = { text: entry.text, scope: entry.scope, kind: entry.kind };
    if (entry.reason) {
      spared.push({ index, spare: { ...tiered, reason: /** @type {Reason} */ (entry.reason) } });
    } else if (entry.scope === null) {
      spared.push({ index, spare: { ...tiered, reason: "unscoped" } });
    } else {
      const bucket = byScope.get(entry.scope) ?? [];
      bucket.push({ index, tiered });
      byScope.set(entry.scope, bucket);
    }
  });

  // Round-robin: one from each scope in order of first appearance, then the
  // second of each, and so on until the cap. Whatever is left over is a spare.
  /** @type {Tiered[]} */
  const picked = [];
  const buckets = [...byScope.values()];
  const deepest = Math.max(0, ...buckets.map((bucket) => bucket.length));
  for (let round = 0; round < deepest; round += 1) {
    for (const bucket of buckets) {
      const candidate = bucket[round];
      if (!candidate) continue;
      if (picked.length < cap) picked.push(candidate.tiered);
      else
        spared.push({ index: candidate.index, spare: { ...candidate.tiered, reason: "overflow" } });
    }
  }

  // Spares read in changelog order whatever tier logic put them there.
  spared.sort((a, b) => a.index - b.index);

  return { picked, spares: spared.map(({ spare }) => spare) };
}

/**
 * The version a tag names, without its `v`. Refuses anything that is not a
 * dotted triple — the renderer's rotation arithmetic (#1880) needs the three parts.
 * @param {string} tag
 */
export function versionOf(tag) {
  const match = /^v?(\d+\.\d+\.\d+)$/.exec(tag ?? "");
  if (!match) throw new Error(`not a release tag: ${JSON.stringify(tag)}`);
  return match[1];
}

/**
 * The whole step: a release (as the releases API and the fixture shape it, or
 * just `{ tag_name, body }`) to the tiered draft — parse, clean, pick. The
 * cleaner sits between the other two so that a line it refuses (#1949 step 8)
 * frees its slot in the round-robin rather than leaving a hole.
 *
 * @param {{ tag_name: string, body: string }} release
 * @param {{ cap?: number }} [options]
 * @returns {Draft}
 */
export function draft(release, options) {
  const { picked, spares } = pick(parseChangelog(release.body).map(clean), options);
  return {
    tag: release.tag_name,
    version: versionOf(release.tag_name),
    postable: picked.length > 0,
    picked,
    spares,
  };
}

/**
 * Look a tag up in the committed corpus.
 * @param {string} tag
 * @param {string} [path]
 * @returns {{ tag_name: string, body: string }}
 */
export function releaseFromCorpus(tag, path = resolve(process.cwd(), CORPUS_PATH)) {
  const corpus = JSON.parse(readFileSync(path, "utf8"));
  const release = corpus.releases.find((r) => r.tag_name === tag);
  if (!release) {
    throw new Error(`${tag} is not in ${CORPUS_PATH} - pass --body-file or set RELEASE_BODY`);
  }
  return release;
}

// ---------------------------------------------------------------------------
// The command line
// ---------------------------------------------------------------------------

const USAGE = `
usage:
  node scripts/release-thread/picker.mjs --tag <tag> [--body-file <path>]

  --tag        the release tag, e.g. v0.16.0 (the version is derived from it)
  --body-file  the release's changelog body, as release-please wrote it
  RELEASE_BODY the same body via the environment, the shape the workflow uses
               (\`\${{ github.event.release.body }}\` must never be interpolated
               into a shell line - pass it as env)

With neither a file nor RELEASE_BODY, the tag is looked up in the committed
corpus at ${CORPUS_PATH}, so any past release can be drafted for a look.

Prints the tiers as JSON. Exit 0 whether or not anything was picked - a run
with \`postable: false\` is a skip, not a failure; only a non-zero exit means
the picker broke.
`.trim();

/** @param {string} name */
function flag(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function main() {
  const tag = flag("tag");
  if (!tag) {
    console.error(USAGE);
    process.exit(1);
  }
  const bodyFile = flag("body-file");
  const release = bodyFile
    ? { tag_name: tag, body: readFileSync(bodyFile, "utf8") }
    : process.env.RELEASE_BODY !== undefined
      ? { tag_name: tag, body: process.env.RELEASE_BODY }
      : releaseFromCorpus(tag);
  process.stdout.write(`${JSON.stringify(draft(release), null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

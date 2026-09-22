import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// #2676 - googleapis/release-please-action is the ONE action in this repo that
// is pinned to a full-length commit SHA rather than a floating major tag, and
// this test is what keeps it that way.
//
// Why it alone: every other action here fails LOUDLY and locally if it
// misbehaves - a broken checkout or wrangler-action reddens its own job. This
// one can SUCCEED while publishing a GitHub Release whose authorship silently
// decides whether three other workflows run at all. release.yml (production
// migration, then every deploy), release-thread.yml and back-merge.yml all fire
// on `release: published`, and only because the Release is authored by a PAT -
// GITHUB_TOKEN-authored events do not trigger `on: release` (Invariant 2 in
// docs/releasing.md). A silent retag of a floating tag could change that with
// no diff in this repository, and the result would be a green release that
// deployed nothing.
//
// It is also the only action handed a long-lived, write-scoped PAT.
//
// Deliberately a text scan rather than a YAML parse: no YAML parser is a
// declared dependency, and the repo's dependency policy would rather this
// convention test stayed dependency-free (see workflow-supabase-cli-pin.test.ts
// and migration-conventions.test.ts).

const WORKFLOWS_DIR = resolve(__dirname, "../.github/workflows");

const SHA_PINNED_ACTIONS = ["googleapis/release-please-action"];

// A full-length commit SHA: 40 lowercase hex characters. GitHub treats a short
// SHA as a mutable-ish ref, so only the full length counts as a pin.
const FULL_SHA = /^[0-9a-f]{40}$/;

// The trailing comment that says which release the SHA is. Dependabot rewrites
// it alongside the SHA, and without it the pin is unreadable to a human.
const VERSION_COMMENT = /#\s*v\d+\.\d+\.\d+\s*$/;

function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f));
}

type Reference = { file: string; line: number; ref: string; rest: string };

// Every `uses:` line referencing one of the named actions.
function referencesTo(action: string): Reference[] {
  const found: Reference[] = [];

  for (const file of workflowFiles()) {
    const lines = readFileSync(resolve(WORKFLOWS_DIR, file), "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      const match = line.match(
        new RegExp(`^\\s*(?:-\\s*)?uses:\\s*${action.replace(/\//g, "\\/")}@(\\S+)(.*)$`),
      );
      if (match) {
        found.push({ file, line: index + 1, ref: match[1], rest: match[2] });
      }
    });
  }

  return found;
}

describe.each(SHA_PINNED_ACTIONS)("%s is pinned to a commit SHA (#2676)", (action) => {
  const references = referencesTo(action);

  it("still finds the action in the workflows", () => {
    // Guards the assertions below from silently passing on an empty list if the
    // workflows are ever restructured or the action is renamed.
    expect(references.length).toBeGreaterThan(0);
  });

  it("pins every reference to a full-length commit SHA, never a tag", () => {
    const offenders = references
      .filter((reference) => !FULL_SHA.test(reference.ref))
      .map((reference) => `${reference.file}:${reference.line} -> @${reference.ref}`);

    expect(offenders).toEqual([]);
  });

  it("records the version the SHA corresponds to, in a trailing comment", () => {
    // `@45996ed1... # v5.0.0`. Without this nobody can tell what is pinned
    // without resolving the SHA by hand.
    const offenders = references
      .filter((reference) => !VERSION_COMMENT.test(reference.rest))
      .map((reference) => `${reference.file}:${reference.line} -> "${reference.rest.trim()}"`);

    expect(offenders).toEqual([]);
  });

  it("pins every reference to the same SHA", () => {
    // If the action ever appears in a second workflow, a bump must sweep both
    // rather than leaving the two to drift.
    const pinned = [...new Set(references.map((reference) => reference.ref))];

    expect(pinned).toHaveLength(1);
  });
});

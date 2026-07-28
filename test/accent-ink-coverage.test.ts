import { readFileSync } from "node:fs";
import { join } from "node:path";

import { HUE_NAMES } from "@/src/lib/design-tokens";
import { sourceFiles, stripComments } from "@/test/source-scan";

// The holding line for #412, while the accent-ink survivors are classified.
//
// #368/#403 swept every `text-<hue>` that needed moving onto the ink tokens.
// 94 occurrences survive, judged safe by whoever swept their area - icons,
// decorations, large text, and the three hues that genuinely clear 4.5:1 on a
// plain surface. Only 23 of those judgements were written down.
//
// test/accent-ink-call-sites.test.ts is the real gate: it enumerates every
// survivor in a fully-classified area with its measured contrast and the reason
// it may stay, keyed on the source line. Today those are the areas in
// FULLY_CLASSIFIED below: `src/features/act`, `src/features/home`,
// `src/components/app` and `app`. Home classified 25 sites and swept the other
// 2, which is why the app-wide total is 92 rather than the 94 above.
//
// This suite is deliberately weaker, and says so. It cannot tell a safe survivor
// from an unsafe one; it only refuses to let an area GROW. That stops the ninth
// room quietly adding accent ink beside the unclassified sites, without
// pretending the unclassified sites have been checked.
//
// It is a ratchet: as an area is classified into the real gate, delete its row
// here. Lowering a number is always fine. Raising one is the thing this exists
// to prevent - if a change genuinely needs a new `text-<hue>` site, classify it
// in the real gate instead.

const ROOT = join(__dirname, "..");

/**
 * Bare hue accent used as a colour: `text-act`, but not `text-act-ink` and not
 * `text-accent-ink`. The trailing guard rejects any further word character or
 * hyphen - `\b` alone would not, since the hyphen in `act-ink` is itself a word
 * boundary, so `\btext-act\b` matches inside `text-act-ink`.
 */
const BARE_HUE = new RegExp(String.raw`text-(${HUE_NAMES.join("|")})(?![\w-])`, "g");

/** The area a file belongs to, for the budget below. */
function areaOf(file: string): string {
  const feature = /^src\/features\/([^/]+)\//.exec(file);
  if (feature) return `src/features/${feature[1]}`;
  if (file.startsWith("src/components/app/")) return "src/components/app";
  if (file.startsWith("src/lib/")) return "src/lib";
  if (file.startsWith("app/")) return "app";
  return "other";
}

/**
 * Survivors per area, measured 2026-07-28 once every #403 sweep had landed.
 *
 * The areas in FULLY_CLASSIFIED are absent on purpose: they are classified in
 * test/accent-ink-call-sites.test.ts, which asserts their exact sets. Listing
 * one here as well would let a site be added there and merely counted rather
 * than classified.
 */
const BUDGET: Readonly<Record<string, number>> = {
  "src/features/mindfulness": 8,
  "src/features/settings": 5,
  "src/features/breathing": 4,
  "src/features/mood": 4,
  "src/features/tools": 3,
  "src/features/modules": 3,
  "src/features/meditation": 3,
  "src/features/sleep": 2,
  "src/features/security": 2,
  "src/features/cbt": 2,
  "src/features/journal": 1,
  "src/features/habits": 1,
  "src/features/grounding": 1,
  "src/features/gratitude": 1,
};

/** The areas whose survivors are enumerated in the real gate instead. */
const FULLY_CLASSIFIED: ReadonlySet<string> = new Set([
  "src/features/act",
  "src/features/home",
  "src/components/app",
  "app",
]);

function survivorsByArea(): Map<string, number> {
  const counts = new Map<string, number>();

  for (const file of sourceFiles(ROOT, { dirs: ["app", "src"] })) {
    const source = stripComments(readFileSync(join(ROOT, file), "utf8"));
    const hits = [...source.matchAll(BARE_HUE)].length;
    if (hits === 0) continue;
    const area = areaOf(file);
    counts.set(area, (counts.get(area) ?? 0) + hits);
  }

  return counts;
}

describe("unclassified accent-ink survivors never grow (#412)", () => {
  const counts = survivorsByArea();

  it("walks a plausible number of source files", () => {
    // Guards the suite itself: a broken walk finds nothing and passes vacuously.
    expect(sourceFiles(ROOT, { dirs: ["app", "src"] }).length).toBeGreaterThan(100);
  });

  it("finds the survivors it was calibrated against", () => {
    // If this drops to zero the ratchet below would pass while measuring
    // nothing, so the total is asserted to be in the right order of magnitude.
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
    expect(total).toBeGreaterThan(50);
  });

  it("no area exceeds its recorded survivor count", () => {
    const grown = [...counts.entries()]
      .filter(([area]) => !FULLY_CLASSIFIED.has(area))
      .filter(([area, count]) => count > (BUDGET[area] ?? 0))
      .map(([area, count]) => `${area}: ${count} > ${BUDGET[area] ?? 0}`);

    // A new `text-<hue>` site was added without classifying it. Put it in
    // test/accent-ink-call-sites.test.ts with its measured contrast instead of
    // raising the number here.
    expect(grown).toEqual([]);
  });

  it("no area appears that the budget has never seen", () => {
    const unknown = [...counts.keys()]
      .filter((area) => !FULLY_CLASSIFIED.has(area))
      .filter((area) => !(area in BUDGET));

    expect(unknown).toEqual([]);
  });

  it("the budget carries no rows that have already been cleared", () => {
    // A row left behind after its area was classified would silently permit
    // that many new sites. Shrink to zero and delete the row.
    const stale = Object.keys(BUDGET).filter((area) => !counts.has(area));

    expect(stale).toEqual([]);
  });
});

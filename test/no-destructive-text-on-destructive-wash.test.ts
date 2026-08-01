import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sourceFiles, stripComments } from "./source-scan";

// `text-destructive` on a wash of its OWN red (#603).
//
// Text on a translucent wash of its own colour is always tighter than the same
// text on the bare surface, because the wash drags the surface toward the text.
// Two panels shipped that way and both measured below AA on the default palette
// — the ACT submit-error panel at 4.03:1 on `bg-destructive/10`, and the support
// screen's CRISIS WARNING on `bg-destructive/5`. Neither was visible to any
// existing gate: `--destructive` itself is held above 4.5 on the bare
// background and card by the per-style audit, so the token was fine and only the
// pairing was wrong.
//
// The palette cannot fix this. Darkening the shared red to clear its own wash
// would repaint every destructive button and badge in the app and break the
// pixel-identical guarantee on the default style, to fix two panels. So the
// pairing is banned instead, and this is what keeps it banned: put the red on a
// neutral surface (`bg-card`) and keep the border and the text red.

const ROOT = join(__dirname, "..");

/**
 * Files that legitimately name both, with the measurement that justifies it.
 * A wash is only a problem under text that has to be READ; a MARK on the same
 * wash owes 1.4.11's weaker 3:1.
 */
const ALLOWED: { file: string; evidence: string }[] = [
  {
    file: "src/features/home/widget-tint.ts",
    evidence:
      "The destructive tint keeps its red /10 chip and its red GLYPH - a mark, " +
      "which owes 3:1 and measures 3.96 at worst across the eight palettes. Its " +
      "LABEL is `--foreground`, not the red: 9.27 at worst on that same chip. " +
      "The pairing this gate bans is red text on the red wash, and it is gone.",
  },
];

/** `bg-destructive/10`, `bg-destructive/5`, and any other alpha spelling. */
const DESTRUCTIVE_WASH = /\bbg-destructive\/\d+/;

/**
 * Only the states that are painted while the text is READ. `active:` and
 * `hover:` washes are momentary and sit under an icon rather than body copy —
 * an icon owes 1.4.11's 3:1, which those clear.
 */
const TRANSIENT_STATE =
  /(?:^|[\s"'`:])(?:active|hover|focus|group-hover|disabled):bg-destructive\//;

function washesOutsideTransientStates(source: string): boolean {
  return source
    .split("\n")
    .some((line) => DESTRUCTIVE_WASH.test(line) && !TRANSIENT_STATE.test(line));
}

describe("no surface pairs destructive text with a wash of its own red", () => {
  const files = sourceFiles(ROOT, { dirs: ["src", "app"] });

  it("scans a meaningful number of files, so it cannot pass vacuously", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("every allowlisted file still exists, so a stale exemption cannot hide a new one", () => {
    for (const { file } of ALLOWED) {
      expect(files).toContain(file);
    }
  });

  it("no file carries a persistent bg-destructive wash together with text-destructive", () => {
    const allowed = new Set(ALLOWED.map((entry) => entry.file));
    const offenders = files.filter((file) => {
      if (allowed.has(file)) return false;
      const source = stripComments(readFileSync(join(ROOT, file), "utf8"));
      if (!source.includes("text-destructive")) return false;
      return washesOutsideTransientStates(source);
    });

    expect(offenders).toEqual([]);
  });

  // The allowlist buys widget-tint.ts an exemption from the file-level scan, so
  // its LABEL is asserted directly - otherwise flipping `ink` back to the red
  // would be exactly the regression this gate exists to stop, hidden behind the
  // exemption that was granted for its glyph.
  it("the destructive widget tint labels in foreground, not in the red", () => {
    const source = stripComments(
      readFileSync(join(ROOT, "src/features/home/widget-tint.ts"), "utf8"),
    );
    const block = source.slice(source.indexOf("const DESTRUCTIVE"));
    const ink = block.slice(0, block.indexOf("};")).match(/ink:([^,]+)/)?.[1];

    expect(ink).toBeDefined();
    expect(ink).not.toContain("text-destructive");
  });

  // The two the fix removed, named so the gate is provably about them and a
  // future reader can find the measurement.
  it.each(["src/features/act/act-choice-point-new-screen.tsx", "app/(app)/support.tsx"])(
    "%s puts its destructive text on a neutral surface",
    (file) => {
      const source = stripComments(readFileSync(join(ROOT, file), "utf8"));

      expect(source).toContain("text-destructive");
      expect(source).not.toMatch(DESTRUCTIVE_WASH);
    },
  );
});

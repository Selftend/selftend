import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sourceFiles, stripComments } from "./source-scan";

// `text-destructive` on a wash of its OWN red (#603).
//
// Text on a translucent wash of its own colour is always tighter than the same
// text on the bare surface, because the wash drags the surface toward the text.
// Three surfaces shipped that way and all measured below AA on the default
// palette — the ACT submit-error panel at 4.03:1 on `bg-destructive/10`, the
// support screen's CRISIS WARNING on `bg-destructive/5`, and the home widget
// picker's destructive tint, whose label was the raw red on its own /10 chip.
// None was visible to any existing gate: `--destructive` itself is held above
// 4.5 on the bare background and card by the per-style audit, so the token was
// fine and only the pairing was wrong.
//
// The palette cannot fix this. Darkening the shared red to clear its own wash
// would repaint every destructive button and badge in the app and break the
// pixel-identical guarantee on the default style, to fix two panels. So the
// pairing is banned instead, and this is what keeps it banned: put the red on a
// neutral surface (`bg-card`) and keep the border and the text red, or - where
// the tint itself is the point - keep the wash and move the LABEL to
// `--foreground`, leaving only the glyph in red.

const ROOT = join(__dirname, "..");

/**
 * Files that legitimately name both, with the measurement that justifies it.
 * A wash is only a problem under text that has to be READ; a MARK on the same
 * wash owes 1.4.11's weaker 3:1.
 */
const ALLOWED: { file: string; evidence: string }[] = [
  {
    file: "src/features/widgets/widget-tint.ts",
    evidence:
      "The destructive tint keeps its red /10 chip and its red GLYPH - a mark, " +
      "which owes 3:1 and measures 3.96 at worst across the eight palettes. Its " +
      "LABEL is `--foreground`, not the red: 9.27 at worst on that same chip. " +
      "The pairing this gate bans is red text on the red wash, and it is gone.",
  },
];

/**
 * The opacity half of a wash: either the shorthand (`/10`, `/5`) or Tailwind's
 * ARBITRARY value (`/[0.08]`).
 *
 * The bracketed form is not hypothetical here — the repo already uses it in
 * thirteen places (`text-white/[0.88]` across the field headers), so a
 * `bg-destructive/[0.08]` is the natural next spelling. Matching only `\d+`
 * would let exactly the pairing this file bans walk straight through, which is
 * the same blind spot the arbitrary-value syntax opened in #421 and hid ~78
 * sites behind.
 */
const WASH_ALPHA = String.raw`\/(?:\d+|\[[^\]]*\])`;

/** `bg-destructive/10`, `bg-destructive/5`, `bg-destructive/[0.08]`. */
const DESTRUCTIVE_WASH = new RegExp(String.raw`\bbg-destructive${WASH_ALPHA}`);

/**
 * One whole utility token ending in a destructive wash, variant prefixes and
 * all — `bg-destructive/10`, `active:bg-destructive/10`,
 * `dark:hover:bg-destructive/20`, `bg-destructive/[0.08]`.
 *
 * `!` is part of the token, not a terminator. Tailwind's important modifier
 * sits between the variants and the utility (`hover:!bg-destructive/[0.08]`),
 * so a character class that stops at `!` captures only the bare utility and
 * loses the `hover:` in front of it. The classifier would then read a
 * hover-only wash as persistent and reject a file that is perfectly fine — the
 * mirror image of the under-reporting bug, and just as wrong.
 */
const WASH_TOKEN = new RegExp(String.raw`[\w:!-]*bg-destructive${WASH_ALPHA}`, "g");

/**
 * The states painted only while the element is being pressed or pointed at, and
 * never while the label is simply being READ. Those washes sit under an icon,
 * which owes 1.4.11's weaker 3:1 rather than 4.5.
 */
const TRANSIENT_VARIANT =
  /(?:^|:)(?:active|hover|focus|focus-visible|focus-within|group-hover|group-active|disabled|pressed):/;

/**
 * Tokens are inspected ONE AT A TIME, not line by line.
 *
 * Exempting a whole line the moment it mentions a transient wash is what a
 * line-level check does, and it is wrong: `bg-destructive/10
 * hover:bg-destructive/20` would then hide a persistent wash behind its own
 * hover state, which is the exact pairing this gate exists to catch.
 */
function hasPersistentWash(source: string): boolean {
  return (source.match(WASH_TOKEN) ?? []).some((token) => !TRANSIENT_VARIANT.test(token));
}

describe("no surface pairs destructive text with a wash of its own red", () => {
  const files = sourceFiles(ROOT, { dirs: ["src", "app"] });

  // The classifier itself, because the whole gate rests on it and its failure
  // mode is silent - it under-reports rather than erroring.
  it.each([
    ["bg-destructive/10", true],
    ["bg-destructive/5", true],
    ["rounded-lg border border-destructive bg-destructive/10 p-3", true],
    ["active:bg-destructive/10", false],
    ["hover:bg-destructive/10", false],
    ["dark:hover:bg-destructive/20", false],
    ["group-hover:bg-destructive/10 disabled:bg-destructive/5", false],
    ["bg-card active:bg-destructive/10", false],
    // The hole a line-level check leaves: a persistent wash standing next to
    // its own hover state must still be caught.
    ["bg-destructive/10 hover:bg-destructive/20", true],
    ["hover:bg-destructive/20 bg-destructive/10", true],
    ["bg-card text-destructive", false],
    // Tailwind's ARBITRARY opacity, which the repo already uses thirteen times
    // as `text-white/[0.88]`. A matcher that only accepts `/\d+` lets the
    // banned pairing through entirely - the #421 blind spot, repeated.
    ["bg-destructive/[0.08]", true],
    ["rounded-lg border border-destructive bg-destructive/[0.08] p-3", true],
    ["hover:bg-destructive/[0.08]", false],
    ["dark:active:bg-destructive/[0.12]", false],
    // Mixed spellings must not let either form hide the other.
    ["bg-destructive/[0.08] hover:bg-destructive/20", true],
    ["hover:bg-destructive/[0.12] bg-destructive/10", true],
    // Tailwind's important modifier sits between the variants and the utility.
    // If `!` terminates the token the `hover:` is lost and a legitimate
    // hover-only wash reads as persistent - a false REJECTION rather than a
    // false pass, but a broken gate either way.
    ["hover:!bg-destructive/[0.08]", false],
    ["active:!bg-destructive/10", false],
    ["dark:hover:!bg-destructive/20", false],
    // ...while an important wash with no transient variant is still persistent.
    ["!bg-destructive/10", true],
    ["!bg-destructive/[0.08] text-destructive", true],
  ])("classifies %p as persistent=%s", (source, expected) => {
    expect(hasPersistentWash(source)).toBe(expected);
  });

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
      return hasPersistentWash(source);
    });

    expect(offenders).toEqual([]);
  });

  // The allowlist buys widget-tint.ts an exemption from the file-level scan, so
  // its LABEL is asserted directly - otherwise flipping `ink` back to the red
  // would be exactly the regression this gate exists to stop, hidden behind the
  // exemption that was granted for its glyph.
  it("the destructive widget tint labels in foreground, not in the red", () => {
    const source = stripComments(
      readFileSync(join(ROOT, "src/features/widgets/widget-tint.ts"), "utf8"),
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

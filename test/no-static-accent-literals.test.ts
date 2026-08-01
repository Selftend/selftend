import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PRIMARY_TRIPLES } from "@/src/lib/design-tokens";
import { sourceFiles, stripComments } from "./source-scan";

// The bug class every other theme gate is blind to: the default palette's accent
// COPIED OUT as a literal.
//
// The lint rule in eslint.config.js matches hue class names and `var(--hue)`.
// test/module-identity-neutral.test.ts adds hue arguments to known helpers. None
// of them can see `stroke="hsla(262, 62%, 56%, 0.20)"` - it is not a class, not
// a CSS variable, and not an argument to anything recognisable. It is just a
// colour, and it is the RIGHT colour on the default palette, so it looks correct
// in review and in every screenshot taken before the style axis existed.
//
// It was not hypothetical. Three surfaces shipped this way and all three were
// reported by the owner as "this purple should be part of the theme": the pillar
// card's 3px stripe, the profile avatar's wash, and the home screen's breathing
// rings. Each sat beside an element that DID follow the palette (`text-primary`,
// the avatar initial, the `+` glyph), which is what made the mismatch visible.
//
// A colour that must follow the selected palette has to come from a hook -
// useAccentHsl / useAccentGradient / useThemePalette in src/lib/theme-palette.ts.

const ROOT = join(__dirname, "..");

/**
 * The files allowed to name the default accent, because defining it is their
 * job. Everything else must reach it through a hook.
 */
const ALLOWED = [
  // Declares PRIMARY_TRIPLES itself.
  "src/lib/design-tokens.ts",
  // Authors quiet-lilac's twenty tokens; the accent is authored input here.
  "src/lib/theme/styles.ts",
];

/** `262 62% 56%` and `264 72% 72%`, in every spelling a component could use. */
function accentPatterns(): { label: string; pattern: RegExp }[] {
  return Object.entries(PRIMARY_TRIPLES).flatMap(([scheme, triple]) => {
    const [h, s, l] = triple.split(/\s+/);
    const sep = String.raw`[\s,]+`;
    return [
      {
        label: `${scheme} accent as hsl()/hsla() — ${triple}`,
        pattern: new RegExp(String.raw`hsla?\(\s*${h}${sep}${s}${sep}${l}`, "i"),
      },
      {
        label: `${scheme} accent as a bare triple — ${triple}`,
        pattern: new RegExp(String.raw`(?<![\d.])${h}\s+${s}\s+${l}(?![\d.])`),
      },
    ];
  });
}

describe("no component hard-codes the default palette's accent", () => {
  const files = sourceFiles(ROOT, { dirs: ["src", "app"], exclude: ALLOWED });

  it("scans a meaningful number of files, so it cannot pass vacuously", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it.each(accentPatterns())("no file contains the $label", ({ pattern }) => {
    const offenders = files.filter((file) => {
      // Comments are stripped: several files legitimately DISCUSS the literal,
      // including the ones that were fixed, and a gate that fails on its own
      // explanation teaches people to delete the explanation.
      const source = stripComments(readFileSync(join(ROOT, file), "utf8"));
      return pattern.test(source);
    });

    expect(offenders).toEqual([]);
  });
});

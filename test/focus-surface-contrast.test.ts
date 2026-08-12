// The focus shell's surface (#777, built on #779) is theme-derived: a neutral
// base under a low-alpha wash of the active style's accent. That makes it a
// MOVING surface - eight styles × two schemes - so nothing about it is
// assumed: this suite composites the wash exactly as it renders (same alpha,
// same base token the shell's class paints) and re-measures every colour the
// session screen paints on it.
//
// Three floors:
//  - body and muted text keep WCAG 1.4.3 AA (4.5) on the washed surface;
//  - the pacer's full-strength arc keeps WCAG 1.4.11 (3:1) on it, for every
//    colour the picker can PRODUCE, on every style. Retired grandfathered
//    names resolve through the alias map, and one of them (`amber` → think's
//    gold) cannot carry a 2px arc in light mode (~1.8:1) - the same luminance
//    problem design-tokens.ts documents for `think` as text. That is accepted:
//    the ring is reinforcement, and every datum it shows (phase, countdown,
//    cycle, time left) renders as AA-gated text on the same screen;
//  - the timing line's ink (the chip recipe's, the one stop rendered as small
//    text in a pattern's own hue) keeps AA on it - for ALL eleven stored
//    colours, aliases included, because it is text and text has no fallback.

import { FOCUS_WASH_ALPHA, FOCUS_WASH_BASE } from "@/src/components/app/focus-session-shell";
import { BREATHING_COLOR_TINTS } from "@/src/features/breathing/exercise-colors";
import {
  BREATHING_EXERCISE_COLOR_CHOICES,
  type BreathingExerciseColor,
} from "@/src/features/breathing/exercise-types";
import { HUE_TRIPLES, type HueName } from "@/src/lib/design-tokens";
import { chipTriples } from "@/src/lib/hue-chip";
import {
  AA_MARK,
  AA_TEXT,
  compositeOver,
  contrastRatio,
  tripleToRgb,
} from "@/src/lib/theme/contrast";
import { STYLE_NAMES, THEME_TOKENS } from "@/src/lib/theme/styles";

const SCHEMES = ["light", "dark"] as const;
const ALL_PATTERN_COLORS = Object.keys(BREATHING_COLOR_TINTS) as BreathingExerciseColor[];

/** The focus surface as it actually renders for one (style, scheme). */
function focusSurface(style: (typeof STYLE_NAMES)[number], scheme: (typeof SCHEMES)[number]) {
  const tokens = THEME_TOKENS[style][scheme];
  return compositeOver(
    tripleToRgb(tokens["--primary"]),
    FOCUS_WASH_ALPHA[scheme],
    tripleToRgb(tokens[FOCUS_WASH_BASE[scheme]]),
  );
}

describe("the focus shell's washed surface", () => {
  it.each(STYLE_NAMES.flatMap((style) => SCHEMES.map((scheme) => [style, scheme] as const)))(
    "%s %s keeps body and muted text at AA",
    (style, scheme) => {
      const surface = focusSurface(style, scheme);
      const tokens = THEME_TOKENS[style][scheme];
      expect(contrastRatio(tripleToRgb(tokens["--foreground"]), surface)).toBeGreaterThanOrEqual(
        AA_TEXT,
      );
      expect(
        contrastRatio(tripleToRgb(tokens["--muted-foreground"]), surface),
      ).toBeGreaterThanOrEqual(AA_TEXT);
    },
  );

  it.each(SCHEMES)("holds every offered colour's arc at 3:1 on every style (%s)", (scheme) => {
    const failures: string[] = [];
    for (const style of STYLE_NAMES) {
      const surface = focusSurface(style, scheme);
      for (const color of BREATHING_EXERCISE_COLOR_CHOICES) {
        const tint = BREATHING_COLOR_TINTS[color] as HueName;
        const arc = contrastRatio(tripleToRgb(HUE_TRIPLES[tint][scheme]), surface);
        if (arc < AA_MARK) {
          failures.push(`${style}/${color} arc ${arc.toFixed(2)} < ${AA_MARK}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it.each(SCHEMES)("holds every colour's timing ink at AA on every style (%s)", (scheme) => {
    const failures: string[] = [];
    for (const style of STYLE_NAMES) {
      const surface = focusSurface(style, scheme);
      for (const color of ALL_PATTERN_COLORS) {
        const tint = BREATHING_COLOR_TINTS[color] as HueName;
        const ink = contrastRatio(tripleToRgb(chipTriples(tint)[scheme].ink), surface);
        if (ink < AA_TEXT) {
          failures.push(`${style}/${color} timing ink ${ink.toFixed(2)} < ${AA_TEXT}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

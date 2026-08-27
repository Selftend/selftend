// A breathing pattern's colour, as the chip stops its consumers paint: the
// editor's swatch, and the dot that heads each pattern row on the overview.
//
// Stored `color` values are an ALIAS LAYER over the design-token hues, exactly
// as habits' src/features/habits/habit-color.ts is (#278, #715). Four of the
// eleven names - amber, emerald, violet, rose - predate the token system and
// used to render raw Tailwind palette literals (`bg-amber-500/10`), so they
// missed palette retunes, carried hand-picked dark variants, and had no
// contrast certification. Each now points at its nearest token hue.
//
// The stored strings deliberately stay as they are: aliasing costs nothing and
// keeps every existing breathing_exercises row untouched. No migration, ever.
//
// ⚠️ Aliasing MERGES some pairs. `violet` and `iris` both resolve to the iris
// tint, `rose` and `clay` both to clay, `emerald` and `mist` both to mist - so
// a user who once picked `violet` and `iris` for two patterns now sees one
// colour twice. That is accepted, and it is bounded: three of each pair are
// retired names that the picker can no longer produce, so the collision can
// only exist on patterns that predate this change and never spreads.
//
// There is deliberately no `text` entry (#403). One existed on the old
// utility-class version and no caller ever read it - both consumers
// destructured `bg` and `border` only - so it shipped four unreachable
// `text-<hue>` classes that a future label would have picked up as if they were
// vetted. They were not: `text-iris` and `text-clay` are 3.42 and 3.51 on the
// app background, under AA. Anything drawing a label on a chip wants `ink`,
// which chipHsl computes to clear AA on the fill.

import {
  BREATHING_EXERCISE_COLOR_CHOICES,
  type BreathingExerciseColor,
} from "@/src/features/breathing/exercise-types";
import type { TintToken } from "@/src/lib/design-tokens";
import { chipHsl, type ChipColors } from "@/src/lib/hue-chip";
import { useColorSchemeName, type ColorSchemeName } from "@/src/lib/color-scheme";

export const BREATHING_COLOR_TINTS: Record<BreathingExerciseColor, TintToken> = {
  aqua: "aqua",
  mist: "mist",
  iris: "iris",
  clay: "clay",
  ink: "ink",
  be: "be",
  act: "act",
  // amber → think's gold, emerald → mist's teal, violet → iris, rose → clay's
  // terracotta: the nearest token hue to each retired literal. Same four
  // mappings habits uses, so the two features cannot drift on what "rose" is.
  amber: "think",
  emerald: "mist",
  violet: "iris",
  rose: "clay",
};

const PALETTE: Record<ColorSchemeName, Record<BreathingExerciseColor, ChipColors>> = (() => {
  const light = {} as Record<BreathingExerciseColor, ChipColors>;
  const dark = {} as Record<BreathingExerciseColor, ChipColors>;
  for (const color of Object.keys(BREATHING_COLOR_TINTS) as BreathingExerciseColor[]) {
    const colors = chipHsl(BREATHING_COLOR_TINTS[color]);
    light[color] = colors.light;
    dark[color] = colors.dark;
  }
  return { light, dark };
})();

/** A pattern colour's chip stops in one scheme. Node-side callers and tests. */
export function breathingChipColors(
  color: BreathingExerciseColor,
  scheme: ColorSchemeName,
): ChipColors {
  return PALETTE[scheme][color];
}

/**
 * The whole pattern-colour palette for the current scheme. Returns the map
 * rather than one colour's stops so a screen can read it once and index it
 * inside a render loop - the overview draws a dot per pattern row, and the
 * rules of hooks forbid a per-colour hook there. Identity-stable per scheme.
 */
export function useBreathingChipPalette(): Record<BreathingExerciseColor, ChipColors> {
  return PALETTE[useColorSchemeName()];
}

/**
 * The swatches the editor shows for a pattern currently stored as `selected`.
 *
 * The six offered colours, plus - when the pattern wears a retired one - that
 * colour prepended as a seventh, already selected. The user sees their colour,
 * keeps it by doing nothing, and loses it only by deliberately choosing
 * another. A picker with nothing selected would silently reassign the colour on
 * the next save, which is the one outcome a colour picker must never have.
 */
export function breathingColorChoicesFor(
  selected: BreathingExerciseColor,
): readonly BreathingExerciseColor[] {
  const offered = BREATHING_EXERCISE_COLOR_CHOICES as readonly BreathingExerciseColor[];
  return offered.includes(selected) ? offered : [selected, ...offered];
}

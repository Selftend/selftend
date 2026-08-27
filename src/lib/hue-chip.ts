// A chip is a low-chroma tint of a hue scaled down to a single element - the
// idea the retired room pour (#586/#1292) applied to whole screens. It gives a
// habit color swatch, a learn-card icon tile, or a ticked checkbox: a
// hue-tinted fill, a border for its edge, the raw accent as a pure color
// sample, and ink for the label or glyph that sits on the fill.
//
// The ink is why this recipe exists at all. A hue's published accent is tuned
// to sit on a neutral surface, not on a tint of itself: light `think` on a
// pale think fill is 1.78:1, nowhere near AA. Fixing the ink's lightness
// instead keeps the hue identity and clears AA for every token. Floors live in
// test/chip-contrast.test.ts.
//
// Only the saturation/lightness recipe lives here; the hue degree comes from
// the token source of truth in src/lib/design-tokens.ts, so a palette retune
// re-tints every chip.

import { TINT_TRIPLES, type TintToken } from "@/src/lib/design-tokens";
import type { ColorSchemeName } from "@/src/lib/color-scheme";

export interface ChipTriples {
  /** The chip's surface: a pale (light) / deep (dark) tint of the hue. */
  fill: string;
  /**
   * The fill's resting edge, on a chip whose meaning is already carried in
   * words. It is a soft tint and does not clear the 3:1 non-text floor against
   * the surface behind it, so anything that encodes *state* by outline alone - a ticked day
   * cell has no label and no glyph - outlines in `ink` instead.
   */
  border: string;
  /** Ink on `fill`: labels, glyphs, and any outline that carries state. */
  ink: string;
  /** The hue's published accent, for a swatch that samples the color itself. */
  accent: string;
}

// [saturation%, lightness%] per stop. `accent` comes from the token instead.
// The light fill carries most of its chroma from saturation rather than
// lightness: a habit's color has to survive as a 24px week-strip cell with no
// label next to it, and a paler wash makes seven colors read as one.
const RECIPE: Record<ColorSchemeName, Record<"fill" | "border" | "ink", [number, number]>> = {
  light: { fill: [58, 86], border: [48, 60], ink: [60, 26] },
  dark: { fill: [30, 24], border: [32, 42], ink: [65, 80] },
};

/**
 * The leading hue degree of a tint token, e.g. "clay" → 20, "primary" → 262.
 * The light triple is the reference for both schemes: a scheme pair is the
 * same hue at two lightnesses (primary's 262/264 is rounding, not a second
 * hue), so a chip stays one color across the theme toggle.
 */
export function tintDegree(tint: TintToken): number {
  return Number.parseInt(TINT_TRIPLES[tint].light, 10);
}

/**
 * Space-separated HSL triples for a tint's chip stops, keyed by scheme - the
 * `h s% l%` form the theme tokens use, so the contrast tests share their math.
 */
export function chipTriples(tint: TintToken): Record<ColorSchemeName, ChipTriples> {
  const h = tintDegree(tint);
  const accent = TINT_TRIPLES[tint];
  const stops = (scheme: ColorSchemeName): ChipTriples => ({
    fill: `${h} ${RECIPE[scheme].fill[0]}% ${RECIPE[scheme].fill[1]}%`,
    border: `${h} ${RECIPE[scheme].border[0]}% ${RECIPE[scheme].border[1]}%`,
    ink: `${h} ${RECIPE[scheme].ink[0]}% ${RECIPE[scheme].ink[1]}%`,
    // The published accent already carries the hue degree; re-emitting it
    // through the same shape keeps callers on one type.
    accent: accent[scheme],
  });
  return { light: stops("light"), dark: stops("dark") };
}

export type ChipColors = Record<keyof ChipTriples, string>;

/**
 * A tint's chip stops as comma-form hsl() strings. Chips are drawn with style
 * props rather than utility classes: the ink is a computed lightness, not a
 * token, so there is no class for NativeWind to compile (same escape hatch as
 * hueHsl in src/features/mindfulness/exercise-hue.ts).
 */
export function chipHsl(tint: TintToken): Record<ColorSchemeName, ChipColors> {
  const triples = chipTriples(tint);
  const toHsl = (triple: string) => `hsl(${triple.split(" ").join(", ")})`;
  const toColors = (scheme: ColorSchemeName): ChipColors =>
    Object.fromEntries(
      Object.entries(triples[scheme]).map(([stop, triple]) => [stop, toHsl(triple)]),
    ) as ChipColors;
  return { light: toColors("light"), dark: toColors("dark") };
}

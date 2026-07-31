// Contrast: the measured half of the theme engine (#580, resolved on #560).
//
// Two things live here, and they are the same idea from opposite ends. The
// SOLVER picks a style's ink by measuring rather than by formula. The AUDIT
// re-measures every pairing a style actually paints and reports what falls
// short. Nothing in this file writes a contrast number down — every figure is
// computed, which is the point: the suites this replaces baked in measurements
// like "iris clears by 0.0023", and a hand-measured table cannot survive being
// multiplied by eight styles.
//
// Why the old recipe had to go. `--primary-ink` used to be the accent at a fixed
// HSL lightness (28% light, 80% dark). Measured across eight palettes that fails
// five times — deep-field light 4.13 / 3.81 / 3.17, plum-manuscript dark 4.49,
// amber-noir's button label 4.43 — because **HSL lightness is not perceptual
// luminance**. Green weighs 0.7152 in the relative-luminance sum against blue's
// 0.0722, so at the same L a teal carries far more light than a violet:
// deep-field's teal accent already sits at L≈27%, and "fix L to 28%" *lightens*
// it. A constant tuned against one violet cannot generalise, and 28 was.

import { hexToRgb, hslTripleToHex, parseHslTriple, withLightness, type Rgb } from "./color";
import type { ColorScheme, ThemeTokens } from "./contract";

/** WCAG 1.4.3, small text. */
export const AA_TEXT = 4.5;

/** WCAG 1.4.11, non-text marks: icons, rules, dots. */
export const AA_MARK = 3;

/**
 * What the solver aims for, deliberately above the 4.5 floor it has to clear.
 *
 * At a 4.5 target the tightest style lands on 4.51 — passing with no headroom,
 * so the next retune breaks the build. The whole set still solves at 4.8
 * (tightest 4.81), 5.0 (5.02) and 5.2 (5.20); 5.0 buys ~11% headroom for a few
 * lightness points, and the ink still reads as the brand colour — the solved
 * moves are small (violet 56→50, teal 27→22, gold 35→28).
 */
export const INK_TARGET = 5;

/** The alpha a tinted chip/badge paints its own accent at. */
const CHIP_ALPHA = 0.15;

/** The alpha a decorative mark's wash is laid at (the densest of the three). */
const MARK_ALPHA = 0.1;

export function tripleToRgb(triple: string): Rgb {
  return hexToRgb(hslTripleToHex(triple));
}

export function relativeLuminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Alpha-composite fg over bg — how `bg-primary/15` actually renders. */
export function compositeOver(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return fg.map((c, i) => alpha * c + (1 - alpha) * bg[i]) as Rgb;
}

export interface Surface {
  where: string;
  rgb: Rgb;
}

/**
 * The four surfaces `--primary-ink` lands on, and the only four the solver has
 * to clear. The nested chip is the one that pinned today's dark constant: 76%
 * cleared every other surface while leaving a badge-on-a-tinted-card at 4.33, so
 * a three-surface solver would certify an ink that still fails in the app.
 *
 * They depend on the accent and the neutrals, never on the ink — which is what
 * makes the solve a monotone search rather than a fixed point.
 */
export function inkSurfaces(accent: string, background: string, card: string): Surface[] {
  const accentRgb = tripleToRgb(accent);
  const cardRgb = tripleToRgb(card);
  const chip = compositeOver(accentRgb, CHIP_ALPHA, cardRgb);

  return [
    { where: "background", rgb: tripleToRgb(background) },
    { where: "card", rgb: cardRgb },
    { where: "chip (accent/15 on card)", rgb: chip },
    {
      where: "nested chip (accent/15 on accent/15 on card)",
      rgb: compositeOver(accentRgb, CHIP_ALPHA, chip),
    },
  ];
}

/** The worst ratio `colour` scores across a set of surfaces, and where. */
export function worstAgainst(colour: Rgb, surfaces: Surface[]): { ratio: number; where: string } {
  let worst = { ratio: Infinity, where: "" };
  for (const { where, rgb } of surfaces) {
    const ratio = contrastRatio(colour, rgb);
    if (ratio < worst.ratio) worst = { ratio, where };
  }
  return worst;
}

/**
 * Solve for a style's ink: the SMALLEST move away from the published accent —
 * darker in light, lighter in dark — that clears `target` on all four binding
 * surfaces.
 *
 * Degree and saturation are untouched, exactly as the old recipe left them, so
 * the ink still reads as that style's accent rather than as near-black. What
 * changes is that the stopping point is measured per style instead of assumed:
 * the search walks one lightness point at a time and stops at the first value
 * that clears, so no style is darkened further than it needs to be.
 *
 * Throws when no lightness clears the target. That is deliberate and is ruling 4
 * of #560: there is no experimental escape and no per-style exemption, because
 * the only thing such an escape could buy is shipping a palette nobody
 * re-measured. A style that cannot solve fails the build.
 */
export function solveInk(
  accent: string,
  neutrals: { background: string; card: string },
  scheme: ColorScheme,
  target: number = INK_TARGET,
): string {
  const surfaces = inkSurfaces(accent, neutrals.background, neutrals.card);
  const [, , startLightness] = parseHslTriple(accent);
  const step = scheme === "light" ? -1 : 1;
  const limit = scheme === "light" ? 0 : 100;

  for (let l = Math.round(startLightness); step < 0 ? l >= limit : l <= limit; l += step) {
    const candidate = withLightness(accent, l);
    if (worstAgainst(tripleToRgb(candidate), surfaces).ratio >= target) return candidate;
  }

  throw new Error(
    `No ${scheme} ink off accent "${accent}" clears ${target} on all four binding surfaces`,
  );
}

/**
 * Pick the label colour for a filled accent button by measurement.
 *
 * The rule this replaces — "light → surface, dark → background" — is what fails
 * `amber-noir`, whose gold accent cannot carry its own white label (4.43).
 * Measuring instead lifts it to 4.74 and changes nothing for the styles that
 * already passed. White and black are the fallbacks so a style whose own
 * neutrals are all mid-tone still has something legible to reach for.
 */
export function pickPrimaryForeground(accent: string, candidates: string[]): string {
  const accentRgb = tripleToRgb(accent);
  const pool = [...candidates, "0 0% 100%", "0 0% 0%"];

  let best = { triple: pool[0], ratio: -Infinity };
  for (const triple of pool) {
    const ratio = contrastRatio(tripleToRgb(triple), accentRgb);
    if (ratio > best.ratio) best = { triple, ratio };
  }
  return best.triple;
}

export interface ContrastFinding {
  check: string;
  where: string;
  ratio: number;
  floor: number;
}

/**
 * Re-measure every pairing a resolved style actually paints, and report the ones
 * that fall short. Returns an empty array for a style that passes.
 *
 * This is a pure function over tokens rather than a set of assertions so that a
 * test can run it on a DELIBERATELY BROKEN palette and prove the gate bites —
 * a gate nobody has ever seen fail is a gate nobody knows works.
 *
 * `inkFloor` is the floor the ink must clear, not the target it was solved to:
 * an authored style keeps its authored ink (quiet-lilac's dark ink measures 4.71
 * on the nested chip, comfortably legible and below the solver's 5.0 headroom),
 * and forcing authored styles up to the target would re-solve the shipping app.
 */
export function auditTokens(tokens: ThemeTokens, inkFloor: number = AA_TEXT): ContrastFinding[] {
  const findings: ContrastFinding[] = [];
  const background = tokens["--background"];
  const card = tokens["--card"];
  const accent = tokens["--primary"];
  const neutralSurfaces: Surface[] = [
    { where: "background", rgb: tripleToRgb(background) },
    { where: "card", rgb: tripleToRgb(card) },
  ];

  const record = (check: string, worst: { ratio: number; where: string }, floor: number) => {
    if (worst.ratio < floor) {
      findings.push({ check, where: worst.where, ratio: worst.ratio, floor });
    }
  };

  // The accent as small text, on the four surfaces it lands on.
  record(
    "primary ink",
    worstAgainst(tripleToRgb(tokens["--primary-ink"]), inkSurfaces(accent, background, card)),
    inkFloor,
  );

  // Body and secondary text on the neutrals.
  record("body ink", worstAgainst(tripleToRgb(tokens["--foreground"]), neutralSurfaces), AA_TEXT);
  record(
    "muted ink",
    worstAgainst(tripleToRgb(tokens["--muted-foreground"]), neutralSurfaces),
    AA_TEXT,
  );

  // The label on a filled accent button — amber-noir's failure, and the reason
  // primary-foreground is measured rather than picked by scheme.
  record(
    "button label",
    {
      ratio: contrastRatio(tripleToRgb(tokens["--primary-foreground"]), tripleToRgb(accent)),
      where: "primary",
    },
    AA_TEXT,
  );

  // A decorative mark owes 1.4.11's weaker 3:1 — a weaker floor, not no floor.
  record(
    "accent as a mark",
    worstAgainst(
      tripleToRgb(accent),
      neutralSurfaces.map(({ where, rgb }) => ({
        where: `${where} /${MARK_ALPHA}`,
        rgb: compositeOver(tripleToRgb(accent), MARK_ALPHA, rgb),
      })),
    ),
    AA_MARK,
  );

  return findings;
}

/** A finding as one line, for a test failure message that names the surface. */
export function describeFinding({ check, where, ratio, floor }: ContrastFinding): string {
  return `${check} on ${where}: ${ratio.toFixed(2)} < ${floor}`;
}

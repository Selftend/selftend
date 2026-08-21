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
 * A component's boundary against the surface behind it. Unlike its two
 * neighbours this answers to no standard - 1.4.11's 3:1 is for marks whose
 * SHAPE carries information, and a card edge is not one, so 3:1 would fail
 * every pair here and most shipped design systems.
 *
 * It is a RATCHET: measured from the palettes that ship, set just under the
 * worst of them, and there to catch a derived `--border` collapsing toward the
 * surface it sits on - an edge going to 1.00 with every other gate still green.
 * The shipped pairs run 1.14 (worst, on background) to 2.01. #1337 proposed
 * 1.2, which would have failed three styles the day it landed; do not raise it
 * without re-running the numbers.
 */
export const BOUNDARY_RATCHET = 1.1;

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

/** The alpha a destructive button/badge paints its red at in dark mode. */
const DESTRUCTIVE_BUTTON_ALPHA = 0.6;

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
 * already passed.
 *
 * The style's OWN neutrals are preferred, and pure white/black are a fallback
 * rather than a default. That ordering is load-bearing: maximising contrast
 * outright would hand almost every dark palette a pure-black label, because
 * black beats the style's own near-black on any light accent — legible, and off
 * the palette on every button in the app. The floor is what has to be cleared;
 * beyond it, staying in the palette wins. A style whose neutrals are all
 * mid-tone still has white and black to reach for.
 */
export function pickPrimaryForeground(accent: string, candidates: string[]): string {
  const accentRgb = tripleToRgb(accent);
  const against = (triple: string) => contrastRatio(tripleToRgb(triple), accentRgb);
  const best = (pool: string[]) =>
    pool.reduce((winner, triple) => (against(triple) > against(winner) ? triple : winner));

  const legible = candidates.filter((triple) => against(triple) >= AA_TEXT);
  return legible.length > 0 ? best(legible) : best(["0 0% 100%", "0 0% 0%"]);
}

/**
 * Solve a style's destructive red the way `solveInk` solves its accent: the
 * smallest move in lightness that keeps it legible as small text on that style's
 * own background and card.
 *
 * One shared red across eight palettes was the original ruling, and the reason
 * given was that a per-style destructive would be "eight more pairs to gate for
 * no legibility gain". Measuring shows the gain is real: the red is shared but
 * the SURFACES under it are not, and on sage-garden dark it lands at 3.97 and on
 * plum-manuscript dark at 4.49 — both below AA for inline save and validation
 * errors. Same failure shape as the fixed ink recipe (#560) and the fixed field
 * formula (#586).
 *
 * Degree and saturation are untouched, so it still reads as the danger red; only
 * the lightness moves, and only for the styles that need it. A style that
 * already clears gets its authored value back unchanged.
 */
export function solveDestructive(
  destructive: string,
  neutrals: { background: string; card: string },
  scheme: ColorScheme,
  target: number = AA_TEXT,
): string {
  const surfaces: Surface[] = [
    { where: "background", rgb: tripleToRgb(neutrals.background) },
    { where: "card", rgb: tripleToRgb(neutrals.card) },
  ];
  const [, , startLightness] = parseHslTriple(destructive);
  // Darker against a light page, lighter against a dark one — the direction that
  // moves away from the surface rather than toward it.
  const step = scheme === "light" ? -1 : 1;
  const limit = scheme === "light" ? 0 : 100;

  for (let l = Math.round(startLightness); step < 0 ? l >= limit : l <= limit; l += step) {
    const candidate = withLightness(destructive, l);
    if (worstAgainst(tripleToRgb(candidate), surfaces).ratio >= target) return candidate;
  }

  throw new Error(
    `No ${scheme} destructive off "${destructive}" clears ${target} on background and card`,
  );
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

  // The destructive pair, measured HERE rather than only in
  // test/theme-token-sync.test.ts, which reads `global.css` — the DEFAULT
  // palette's first-paint copy — and so certified exactly one style.
  //
  // `--destructive` is one shared red for all eight (derive.ts: a per-style
  // destructive would be eight more pairs for no legibility gain), but the
  // SURFACES under it are not shared: every derived style authors its own
  // background and card. A fixed red on a moving surface is precisely the shape
  // that failed for primary ink (#560) and again for the field (#586), so it is
  // gated the same way rather than assumed.
  const destructive = tripleToRgb(tokens["--destructive"]);
  record("destructive ink", worstAgainst(destructive, neutralSurfaces), AA_TEXT);

  // The label on a destructive button. Light paints the solid red; dark paints
  // `bg-destructive/60` over the page, which is a lighter surface than the solid
  // and therefore the harder one — measuring the solid in both would let the
  // real dark surface through unmeasured.
  const isDark = relativeLuminance(tripleToRgb(background)) < 0.5;
  const destructiveSurface = isDark
    ? compositeOver(destructive, DESTRUCTIVE_BUTTON_ALPHA, tripleToRgb(background))
    : destructive;
  record(
    "destructive button label",
    {
      ratio: contrastRatio(tripleToRgb(tokens["--destructive-foreground"]), destructiveSurface),
      where: isDark ? `destructive /${DESTRUCTIVE_BUTTON_ALPHA} over background` : "destructive",
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

  // A component's own boundary against the surfaces it lands on. Nothing paired
  // `--border` with anything before #1337 restored the toast's border, so a
  // palette could drift it into invisibility with every existing gate green.
  //
  // See BOUNDARY_RATCHET for why this floor answers to no standard, and where
  // its number came from.
  record(
    "component boundary",
    worstAgainst(tripleToRgb(tokens["--border"]), neutralSurfaces),
    BOUNDARY_RATCHET,
  );

  return findings;
}

/** A finding as one line, for a test failure message that names the surface. */
export function describeFinding({ check, where, ratio, floor }: ContrastFinding): string {
  return `${check} on ${where}: ${ratio.toFixed(2)} < ${floor}`;
}

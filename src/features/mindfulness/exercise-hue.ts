// Per-exercise accent hue. Class strings are written out in full so NativeWind's
// compiler can see them (same convention as src/features/home/tool-accent.ts).
// HSL triples come from the hue source of truth in src/lib/design-tokens.ts and
// feed LinearGradient and reanimated colour props, which cannot read CSS variables.

import {
  HUE_NAMES,
  HUE_TRIPLES,
  PRIMARY_TRIPLES,
  type HueName,
  type SchemeTriples,
  type TintToken,
} from "@/src/lib/design-tokens";

export type ExerciseHue = HueName;

// Alias for tool-level usage (the hero spans the full tool palette).
export type ToolHue = ExerciseHue;

export const EXERCISE_HUES: ExerciseHue[] = [...HUE_NAMES];

interface HueClasses {
  text: string;
  chipBg: string;
  border: string;
  fill: string;
}

interface HueDef {
  classes: HueClasses;
  hsl: HslPair;
}

type HslPair = { light: string; dark: string };

/** "330 56% 47%" (the css/global.css form) → "330, 56%, 47%" (the hsla() builder form). */
const commaTriple = (spaceTriple: string): string => spaceTriple.split(/\s+/).join(", ");

const commaPair = (triples: SchemeTriples): HslPair => ({
  light: commaTriple(triples.light),
  dark: commaTriple(triples.dark),
});

const HUE_HSL = Object.fromEntries(
  HUE_NAMES.map((hue) => [hue, commaPair(HUE_TRIPLES[hue])]),
) as Record<ExerciseHue, HslPair>;

const HUES: Record<ExerciseHue, HueDef> = {
  mist: {
    classes: { text: "text-mist", chipBg: "bg-mist/15", border: "border-mist/30", fill: "bg-mist" },
    hsl: HUE_HSL.mist,
  },
  iris: {
    classes: { text: "text-iris", chipBg: "bg-iris/15", border: "border-iris/30", fill: "bg-iris" },
    hsl: HUE_HSL.iris,
  },
  be: {
    classes: { text: "text-be", chipBg: "bg-be/15", border: "border-be/30", fill: "bg-be" },
    hsl: HUE_HSL.be,
  },
  ink: {
    classes: { text: "text-ink", chipBg: "bg-ink/15", border: "border-ink/30", fill: "bg-ink" },
    hsl: HUE_HSL.ink,
  },
  act: {
    classes: { text: "text-act", chipBg: "bg-act/15", border: "border-act/30", fill: "bg-act" },
    hsl: HUE_HSL.act,
  },
  clay: {
    classes: { text: "text-clay", chipBg: "bg-clay/15", border: "border-clay/30", fill: "bg-clay" },
    hsl: HUE_HSL.clay,
  },
  think: {
    classes: {
      text: "text-think",
      chipBg: "bg-think/15",
      border: "border-think/30",
      fill: "bg-think",
    },
    hsl: HUE_HSL.think,
  },
  aqua: {
    classes: {
      text: "text-aqua",
      chipBg: "bg-aqua/15",
      border: "border-aqua/30",
      fill: "bg-aqua",
    },
    hsl: HUE_HSL.aqua,
  },
};

export function exerciseHue(hue: ExerciseHue): HueDef {
  return HUES[hue] ?? HUES.mist;
}

// ---------------------------------------------------------------------------
// Raw-HSL escape hatch
// ---------------------------------------------------------------------------
// hueHsl() and hueRamp() are the only sanctioned paths for raw HSL colour
// strings into SVG, LinearGradient, and reanimated props (which cannot read
// CSS variables). Never hardcode HSL literals in charts or gradients — these
// helpers read the hue source of truth in src/lib/design-tokens.ts, which
// test/theme-token-sync.test.ts keeps in parity with global.css.

/** Hue colour string with alpha for the given scheme, e.g. "hsla(330, 56%, 47%, 0.15)". */
export function hueHsl(hue: ExerciseHue, isDark: boolean, alpha: number): string {
  const triple = isDark ? exerciseHue(hue).hsl.dark : exerciseHue(hue).hsl.light;
  return `hsla(${triple}, ${alpha})`;
}

const RAMP_ALPHAS = [0.16, 0.32, 0.52, 0.74, 1] as const;

/**
 * Five-step sequential single-hue ramp, faintest → fullest, for chart
 * intensity encodings (heatmap cells, score tones). Steps are alpha tints of
 * the module hue so they sit correctly on both light and dark surfaces.
 */
export function hueRamp(
  hue: ExerciseHue,
  isDark: boolean,
): [string, string, string, string, string] {
  return RAMP_ALPHAS.map((alpha) => hueHsl(hue, isDark, alpha)) as [
    string,
    string,
    string,
    string,
    string,
  ];
}

export function hueGradient(hue: ExerciseHue, isDark: boolean): [string, string] {
  const triple = isDark ? exerciseHue(hue).hsl.dark : exerciseHue(hue).hsl.light;
  return [`hsla(${triple}, ${isDark ? 0.18 : 0.14})`, `hsla(${triple}, 0)`];
}

/**
 * ToolHue is a strict subset of TintToken - all 8 hue values exist as tint tokens
 * with the same name. This identity function makes the relationship explicit
 * and type-checks the subset constraint at compile time.
 */
export function hueToTint(hue: ToolHue): TintToken {
  return hue;
}

// HSL triples for every TintToken in light + dark mode. ExerciseHue values
// mirror the HUES table above; primary is added here (not in HUES because
// it isn't an exercise tint).
const STRIPE_HSL: Record<TintToken, HslPair> = {
  primary: commaPair(PRIMARY_TRIPLES),
  ...HUE_HSL,
};

/** Two-stop gradient pair (full opacity → half opacity) for a tint token in the given color scheme. */
export function tintStripeColors(tint: TintToken, isDark: boolean): [string, string] {
  const triple = isDark ? STRIPE_HSL[tint].dark : STRIPE_HSL[tint].light;
  return [`hsl(${triple})`, `hsla(${triple}, 0.5)`];
}

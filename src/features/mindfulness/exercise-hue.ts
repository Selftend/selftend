// Per-exercise accent hue. Class strings are written out in full so NativeWind's
// compiler can see them (same convention as src/features/home/tool-accent.ts).
// HSL triples are copied verbatim from global.css and used for LinearGradient and
// reanimated colour props, which cannot read CSS variables.

import type { TintToken } from "@/src/lib/design-tokens";

export type ExerciseHue = "mist" | "iris" | "be" | "ink" | "act" | "clay" | "think" | "aqua";

// Alias for tool-level usage (the hero spans the full tool palette).
export type ToolHue = ExerciseHue;

export const EXERCISE_HUES: ExerciseHue[] = [
  "mist",
  "iris",
  "be",
  "ink",
  "act",
  "clay",
  "think",
  "aqua",
];

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
const HUE_HSL: Record<ExerciseHue, HslPair> = {
  mist: { light: "178, 40%, 40%", dark: "178, 48%, 58%" },
  iris: { light: "280, 48%, 60%", dark: "280, 58%, 74%" },
  be: { light: "330, 56%, 60%", dark: "330, 62%, 72%" },
  ink: { light: "232, 46%, 56%", dark: "232, 56%, 72%" },
  act: { light: "160, 46%, 38%", dark: "160, 56%, 55%" },
  clay: { light: "20, 52%, 50%", dark: "20, 60%, 66%" },
  think: { light: "43, 74%, 52%", dark: "43, 86%, 65%" },
  aqua: { light: "196, 52%, 45%", dark: "196, 58%, 62%" },
};

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

export function hueHsl(hue: ExerciseHue, isDark: boolean, alpha: number): string {
  const triple = isDark ? exerciseHue(hue).hsl.dark : exerciseHue(hue).hsl.light;
  return `hsla(${triple}, ${alpha})`;
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
  primary: { light: "262, 62%, 56%", dark: "264, 72%, 72%" },
  ...HUE_HSL,
};

/** Two-stop gradient pair (full opacity → half opacity) for a tint token in the given color scheme. */
export function tintStripeColors(tint: TintToken, isDark: boolean): [string, string] {
  const triple = isDark ? STRIPE_HSL[tint].dark : STRIPE_HSL[tint].light;
  return [`hsl(${triple})`, `hsla(${triple}, 0.5)`];
}

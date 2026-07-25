// Single TypeScript source of truth for the raw hue HSL triples (light + dark),
// space-separated exactly as written in global.css. The hand-written global.css
// stays (NativeWind needs it at build time); test/theme-token-sync.test.ts
// asserts CSS ↔ TS parity so drift fails CI. Consumers that cannot read CSS
// variables (LinearGradient, reanimated, SVG) reach these triples only through
// hueHsl()/hueRamp() in src/features/mindfulness/exercise-hue.ts.

export const HUE_NAMES = ["mist", "iris", "be", "ink", "act", "clay", "think", "aqua"] as const;

export type HueName = (typeof HUE_NAMES)[number];

export interface SchemeTriples {
  light: string;
  dark: string;
}

export const HUE_TRIPLES: Record<HueName, SchemeTriples> = {
  mist: { light: "178 40% 40%", dark: "178 48% 58%" },
  iris: { light: "280 48% 60%", dark: "280 58% 74%" },
  be: { light: "330 56% 47%", dark: "330 62% 72%" },
  ink: { light: "232 46% 54%", dark: "232 56% 72%" },
  act: { light: "160 46% 38%", dark: "160 56% 55%" },
  clay: { light: "20 52% 50%", dark: "20 60% 66%" },
  think: { light: "43 74% 52%", dark: "43 86% 65%" },
  aqua: { light: "196 52% 36%", dark: "196 58% 62%" },
};

export const PRIMARY_TRIPLES: SchemeTriples = { light: "262 62% 56%", dark: "264 72% 72%" };

export const TINT_TOKENS = [
  "primary",
  "act",
  "be",
  "think",
  "aqua",
  "iris",
  "ink",
  "clay",
  "mist",
] as const;

export type TintToken = (typeof TINT_TOKENS)[number];

// The app-wide 5-step score/quality encoding: background classes at the same
// alphas as RAMP_ALPHAS in src/features/mindfulness/exercise-hue.ts (hueRamp,
// which feeds the heatmap) — test/hue-ramp-classes.test.ts enforces the match.
// Class literals are written out in full so NativeWind compiles them.
export const HUE_RAMP_CLASSES: Record<HueName, readonly [string, string, string, string, string]> =
  {
    mist: ["bg-mist/[0.16]", "bg-mist/[0.32]", "bg-mist/[0.52]", "bg-mist/[0.74]", "bg-mist"],
    iris: ["bg-iris/[0.16]", "bg-iris/[0.32]", "bg-iris/[0.52]", "bg-iris/[0.74]", "bg-iris"],
    be: ["bg-be/[0.16]", "bg-be/[0.32]", "bg-be/[0.52]", "bg-be/[0.74]", "bg-be"],
    ink: ["bg-ink/[0.16]", "bg-ink/[0.32]", "bg-ink/[0.52]", "bg-ink/[0.74]", "bg-ink"],
    act: ["bg-act/[0.16]", "bg-act/[0.32]", "bg-act/[0.52]", "bg-act/[0.74]", "bg-act"],
    clay: ["bg-clay/[0.16]", "bg-clay/[0.32]", "bg-clay/[0.52]", "bg-clay/[0.74]", "bg-clay"],
    think: ["bg-think/[0.16]", "bg-think/[0.32]", "bg-think/[0.52]", "bg-think/[0.74]", "bg-think"],
    aqua: ["bg-aqua/[0.16]", "bg-aqua/[0.32]", "bg-aqua/[0.52]", "bg-aqua/[0.74]", "bg-aqua"],
  };

/**
 * Background class for a 1-5 score/quality step on a hue's ramp, faintest →
 * fullest. Non-integer or out-of-range steps round and clamp into 1..5 —
 * callers that instead want a neutral fallback for invalid input handle that
 * before calling (see mood's scoreToneClass).
 */
export function hueRampClass(hue: HueName, step: number): string {
  const clamped = Math.min(5, Math.max(1, Math.round(step)));
  return HUE_RAMP_CLASSES[hue][clamped - 1];
}

export const TINT_TEXT: Record<TintToken, string> = {
  primary: "text-primary",
  act: "text-[hsl(var(--act))]",
  be: "text-[hsl(var(--be))]",
  think: "text-[hsl(var(--think))]",
  aqua: "text-[hsl(var(--aqua))]",
  iris: "text-[hsl(var(--iris))]",
  ink: "text-[hsl(var(--ink))]",
  clay: "text-[hsl(var(--clay))]",
  mist: "text-[hsl(var(--mist))]",
};

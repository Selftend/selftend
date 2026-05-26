// Per-exercise accent hue. Class strings are written out in full so NativeWind's
// compiler can see them (same convention as src/features/home/tool-accent.ts).
// HSL triples are copied verbatim from global.css and used for LinearGradient and
// reanimated colour props, which cannot read CSS variables.

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

export interface HueClasses {
  text: string;
  chipBg: string;
  border: string;
  fill: string;
}

export interface HueDef {
  classes: HueClasses;
  hsl: { light: string; dark: string };
}

const HUES: Record<ExerciseHue, HueDef> = {
  mist: {
    classes: { text: "text-mist", chipBg: "bg-mist/15", border: "border-mist/30", fill: "bg-mist" },
    hsl: { light: "178, 40%, 40%", dark: "178, 48%, 58%" },
  },
  iris: {
    classes: { text: "text-iris", chipBg: "bg-iris/15", border: "border-iris/30", fill: "bg-iris" },
    hsl: { light: "280, 48%, 60%", dark: "280, 58%, 74%" },
  },
  be: {
    classes: { text: "text-be", chipBg: "bg-be/15", border: "border-be/30", fill: "bg-be" },
    hsl: { light: "330, 56%, 60%", dark: "330, 62%, 72%" },
  },
  ink: {
    classes: { text: "text-ink", chipBg: "bg-ink/15", border: "border-ink/30", fill: "bg-ink" },
    hsl: { light: "232, 46%, 56%", dark: "232, 56%, 72%" },
  },
  act: {
    classes: { text: "text-act", chipBg: "bg-act/15", border: "border-act/30", fill: "bg-act" },
    hsl: { light: "160, 46%, 38%", dark: "160, 56%, 55%" },
  },
  clay: {
    classes: { text: "text-clay", chipBg: "bg-clay/15", border: "border-clay/30", fill: "bg-clay" },
    hsl: { light: "20, 52%, 50%", dark: "20, 60%, 66%" },
  },
  think: {
    classes: {
      text: "text-think",
      chipBg: "bg-think/15",
      border: "border-think/30",
      fill: "bg-think",
    },
    hsl: { light: "43, 74%, 52%", dark: "43, 86%, 65%" },
  },
  aqua: {
    classes: {
      text: "text-aqua",
      chipBg: "bg-aqua/15",
      border: "border-aqua/30",
      fill: "bg-aqua",
    },
    hsl: { light: "196, 52%, 45%", dark: "196, 58%, 62%" },
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

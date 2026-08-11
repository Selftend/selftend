// Colours for the breathing session's focal pacer (`4c`). Reanimated and SVG
// props can't read CSS variables, so the values come through hueHsl() — the
// sanctioned raw-HSL escape hatch, which reads the hue source of truth in
// src/lib/design-tokens.ts so a palette retune reaches the pacer too (#310;
// the screen used to hardcode the triple, and a lighter one at that).
//
// Since #779 the pacer wears the RUNNING PATTERN's colour — the same colour
// the pattern's overview row, setup tab and timing bar wear — instead of a
// tool-pinned aqua. That is the `breathing-pacer` encoding in
// src/lib/theme/encoding.ts: categorical, pinned to the encoding palette, and
// resolved through the same BREATHING_COLOR_TINTS alias map as every other
// surface that draws a pattern's colour, so the eleven stored names cannot
// drift between the pacer and the chips.

import type { BreathingExerciseColor } from "@/src/features/breathing/exercise-types";
import { BREATHING_COLOR_TINTS } from "@/src/features/breathing/exercise-colors";
import { hueHsl, type ExerciseHue } from "@/src/features/mindfulness/exercise-hue";
import { chipHsl } from "@/src/lib/hue-chip";
import type { ColorSchemeName } from "@/src/lib/module-room";

export interface PacerColors {
  /** Full-strength hue for the halo's radial-gradient stops (alpha lives in the stops). */
  halo: string;
  /** The disc that scales with the breath. Decorative wash, far below any floor. */
  circleFill: string;
  /** The progress ring's resting track. */
  ringTrack: string;
  /**
   * The progress arc — the full-strength edge that carries state, and the only
   * stop held to a contrast floor (WCAG 1.4.11, 3:1, in
   * test/focus-surface-contrast.test.ts). The phase marks' active dot shares it.
   */
  ringFill: string;
  /** A phase mark the session hasn't reached. */
  markIdle: string;
  /**
   * Ink for the timing line under the phase name. The raw hue as TEXT fails AA
   * on several hues (#691 measured 3.81:1) — this is the chip recipe's
   * AA-tuned ink, the same stop the pattern tabs label themselves with.
   */
  timingInk: string;
}

/**
 * The running pattern's pacer stops in one scheme. All alpha steps of the
 * pattern's tint token; `timingInk` alone comes from the chip recipe because it
 * is the one stop that renders as small text.
 */
export function pacerColors(color: BreathingExerciseColor, scheme: ColorSchemeName): PacerColors {
  // Every BREATHING_COLOR_TINTS value is one of the eight hue names, never
  // "primary" — the pacer is a pinned encoding and must not follow the style.
  const tint = BREATHING_COLOR_TINTS[color] as ExerciseHue;
  const isDark = scheme === "dark";
  return {
    halo: hueHsl(tint, isDark, 1),
    circleFill: hueHsl(tint, isDark, 0.14),
    ringTrack: hueHsl(tint, isDark, 0.18),
    ringFill: hueHsl(tint, isDark, 1),
    markIdle: hueHsl(tint, isDark, 0.35),
    timingInk: chipHsl(tint)[scheme].ink,
  };
}

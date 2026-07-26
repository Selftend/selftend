// Colours for the breathing session's pacer circle. Reanimated props can't read
// CSS variables, so the values come through hueHsl() — the sanctioned raw-HSL
// escape hatch, which reads the hue source of truth in src/lib/design-tokens.ts
// so an aqua retune reaches the pacer too (#310; the screen used to hardcode the
// triple, and a lighter one at that).

import { hueHsl, type ExerciseHue } from "@/src/features/mindfulness/exercise-hue";

/** The breathing tool's hue - the same one the session screen's room is poured in. */
export const PACER_HUE: ExerciseHue = "aqua";

export interface PacerColors {
  /** Inner circle: the disc that scales with the breath. */
  innerFill: string;
  innerBorder: string;
  /** Outer ring: the constant-size halo the inner circle breathes inside. */
  outerFill: string;
  outerBorder: string;
}

/**
 * Alpha steps of the aqua token, faintest → fullest. Only innerBorder is a
 * full-strength edge: it is the ring that has to stay legible against the room
 * field, so test/room-contrast.test.ts holds it to WCAG 1.4.11 (3:1). The fills
 * and the outer halo are decorative and deliberately far below that.
 */
export function pacerColors(isDark: boolean): PacerColors {
  return {
    innerFill: hueHsl(PACER_HUE, isDark, 0.22),
    innerBorder: hueHsl(PACER_HUE, isDark, 1),
    outerFill: hueHsl(PACER_HUE, isDark, 0.1),
    outerBorder: hueHsl(PACER_HUE, isDark, 0.3),
  };
}

import type { BreathingExerciseColor } from "@/src/features/breathing/exercise-types";

export type PhaseLabel = "inhale" | "hold" | "exhale" | "holdOut";

export interface BreathingPhase {
  label: PhaseLabel;
  /** May be fractional for custom exercises (Phase 2); built-ins are integers. */
  durationSeconds: number;
}

export const breathingPatterns: {
  slug: string;
  phases: BreathingPhase[];
  defaultCycles: number;
  cycleOptions: number[];
  /**
   * The dot that heads this pattern's row on the overview (`4a`). Built-ins had
   * no colour before the redesign because nothing drew one; now they sit in the
   * same list as the user's own patterns and need to be told apart in it.
   *
   * The design assigns aqua / ink / mist. `mist` is one of the two hues #715
   * cut from the offered palette - it measures ΔE76 8.2 from `aqua`, under the
   * 10 floor test/chip-contrast.test.ts now enforces - so coherent takes `clay`
   * instead. All three are members of BREATHING_EXERCISE_COLOR_CHOICES and no
   * pair among them is below ΔE 11.8.
   */
  color: BreathingExerciseColor;
}[] = [
  {
    slug: "box-breathing",
    color: "aqua",
    phases: [
      { label: "inhale", durationSeconds: 4 },
      { label: "hold", durationSeconds: 4 },
      { label: "exhale", durationSeconds: 4 },
      { label: "holdOut", durationSeconds: 4 },
    ],
    defaultCycles: 8, // 8 x 16s = 128s
    cycleOptions: [4, 8, 12],
  },
  {
    slug: "4-7-8",
    color: "ink",
    phases: [
      { label: "inhale", durationSeconds: 4 },
      { label: "hold", durationSeconds: 7 },
      { label: "exhale", durationSeconds: 8 },
    ],
    defaultCycles: 4, // 4 x 19s = 76s
    cycleOptions: [4, 6, 8],
  },
  {
    slug: "coherent-breathing",
    color: "clay",
    phases: [
      { label: "inhale", durationSeconds: 5 },
      { label: "exhale", durationSeconds: 5 },
    ],
    defaultCycles: 12, // 12 x 10s = 120s
    cycleOptions: [6, 12, 18],
  },
];

export const breathingLookup = Object.fromEntries(breathingPatterns.map((p) => [p.slug, p]));
export const breathingSlugs = breathingPatterns.map((p) => p.slug);

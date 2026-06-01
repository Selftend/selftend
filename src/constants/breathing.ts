export type PhaseLabel = "inhale" | "hold" | "exhale" | "holdOut";

export interface BreathingPhase {
  label: PhaseLabel;
  /** May be fractional for custom exercises (Phase 2); built-ins are integers. */
  durationSeconds: number;
}

export interface BreathingPattern {
  slug: string;
  phases: BreathingPhase[];
  /** Pre-selected cycle count when the runner opens. */
  defaultCycles: number;
  /** Quick-pick chips in the cycles selector; must include defaultCycles. */
  cycleOptions: number[];
}

export const breathingPatterns: BreathingPattern[] = [
  {
    slug: "box-breathing",
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

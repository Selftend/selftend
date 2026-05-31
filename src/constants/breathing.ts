export interface BreathingPhase {
  label: "inhale" | "hold" | "exhale" | "holdOut";
  durationSeconds: number;
}

interface BreathingPattern {
  slug: string;
  phases: BreathingPhase[];
  durations: number[];
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
    durations: [1, 2, 4],
  },
  {
    slug: "4-7-8",
    phases: [
      { label: "inhale", durationSeconds: 4 },
      { label: "hold", durationSeconds: 7 },
      { label: "exhale", durationSeconds: 8 },
    ],
    durations: [1, 2, 4],
  },
  {
    slug: "coherent-breathing",
    phases: [
      { label: "inhale", durationSeconds: 5 },
      { label: "exhale", durationSeconds: 5 },
    ],
    durations: [1, 2, 4],
  },
];

export const breathingLookup = Object.fromEntries(breathingPatterns.map((p) => [p.slug, p]));
export const breathingSlugs = breathingPatterns.map((p) => p.slug);

import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";
import type { ExerciseHue } from "@/src/features/mindfulness/exercise-hue";

export interface MeditationPractice {
  slug: string;
  durations: number[];
  icon: MaterialIconName;
  hue: ExerciseHue;
}

// The 4 seated techniques carried over from the retired mindfulness tool.
export const MEDITATION_PRACTICES: MeditationPractice[] = [
  { slug: "breath-awareness", durations: [3, 5, 10], icon: "air", hue: "mist" },
  { slug: "body-scan", durations: [5, 10, 15], icon: "accessibility-new", hue: "iris" },
  { slug: "loving-kindness", durations: [5, 10], icon: "favorite-border", hue: "be" },
  { slug: "observing-thoughts", durations: [5, 10], icon: "cloud-queue", hue: "ink" },
];

export const practicesLookup = Object.fromEntries(MEDITATION_PRACTICES.map((p) => [p.slug, p]));

export function suggestedDuration(p: MeditationPractice): number {
  return p.durations[Math.floor(p.durations.length / 2)] ?? p.durations[0];
}

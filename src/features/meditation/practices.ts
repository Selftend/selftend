import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";
import type { ExerciseHue } from "@/src/features/mindfulness/exercise-hue";

interface MeditationPractice {
  slug: string;
  durations: number[];
  icon: MaterialIconName;
  hue: ExerciseHue;
}

// The techniques carried over from the retired mindfulness tool. This is a
// reference list, not a launcher, so the two off-cushion practices belong here
// alongside the seated ones - they were dropped in bb5e7a9a on the reasoning
// that neither is a sit, which stopped applying once the section launched
// nothing (#1530).
export const MEDITATION_PRACTICES: MeditationPractice[] = [
  { slug: "breath-awareness", durations: [3, 5, 10], icon: "air", hue: "mist" },
  { slug: "body-scan", durations: [5, 10, 15], icon: "accessibility-new", hue: "iris" },
  { slug: "loving-kindness", durations: [5, 10], icon: "favorite-border", hue: "be" },
  { slug: "observing-thoughts", durations: [5, 10], icon: "cloud-queue", hue: "ink" },
  { slug: "mindful-walking", durations: [5, 10, 15], icon: "directions-walk", hue: "act" },
  { slug: "mindful-eating", durations: [5, 10], icon: "restaurant", hue: "clay" },
];

export const practicesLookup = Object.fromEntries(MEDITATION_PRACTICES.map((p) => [p.slug, p]));

export function suggestedDuration(p: MeditationPractice): number {
  return p.durations[Math.floor(p.durations.length / 2)] ?? p.durations[0];
}

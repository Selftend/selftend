import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";
import type { ExerciseHue } from "@/src/features/mindfulness/exercise-hue";

export interface MindfulnessExercise {
  slug: string;
  durations: number[];
  icon: MaterialIconName;
  hue: ExerciseHue;
}

export const mindfulnessExercises: MindfulnessExercise[] = [
  { slug: "breath-awareness", durations: [3, 5, 10], icon: "air", hue: "mist" },
  { slug: "body-scan", durations: [5, 10, 15], icon: "accessibility-new", hue: "iris" },
  { slug: "loving-kindness", durations: [5, 10], icon: "favorite-border", hue: "be" },
  { slug: "observing-thoughts", durations: [5, 10], icon: "cloud-queue", hue: "ink" },
  { slug: "mindful-walking", durations: [5, 10, 15], icon: "directions-walk", hue: "act" },
  { slug: "mindful-eating", durations: [5, 10], icon: "restaurant", hue: "clay" },
];

export const mindfulnessLookup = Object.fromEntries(mindfulnessExercises.map((e) => [e.slug, e]));

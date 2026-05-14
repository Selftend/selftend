export interface MindfulnessExercise {
  slug: string;
  durations: number[];
}

export const mindfulnessExercises: MindfulnessExercise[] = [
  { slug: "breath-awareness", durations: [3, 5, 10] },
  { slug: "body-scan", durations: [5, 10, 15] },
  { slug: "grounding-54321", durations: [3, 5] },
  { slug: "loving-kindness", durations: [5, 10] },
  { slug: "observing-thoughts", durations: [5, 10] },
  { slug: "mindful-walking", durations: [5, 10, 15] },
  { slug: "mindful-eating", durations: [5, 10] },
];

export const mindfulnessLookup = Object.fromEntries(mindfulnessExercises.map((e) => [e.slug, e]));

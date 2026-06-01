export const BREATHING_EXERCISE_COLORS = [
  "aqua",
  "mist",
  "iris",
  "clay",
  "amber",
  "emerald",
  "violet",
  "rose",
] as const;

export type BreathingExerciseColor = (typeof BREATHING_EXERCISE_COLORS)[number];

export interface BreathingExercise {
  id: string;
  userId: string;
  name: string;
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
  cycles: number;
  color: BreathingExerciseColor;
  createdAt: string;
  updatedAt: string;
}

export interface BreathingExerciseInput {
  name: string;
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
  cycles: number;
  color: BreathingExerciseColor;
}

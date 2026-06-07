import { z } from "zod";

import {
  BREATHING_EXERCISE_COLORS,
  type BreathingExerciseInput,
} from "@/src/features/breathing/exercise-types";

export const BREATHING_NAME_MAX = 80;
export const PHASE_SECONDS_MAX = 60;
export const PHASE_STEP = 0.5;
export const CYCLES_MIN = 1;
export const CYCLES_MAX = 999;

const phaseSeconds = z
  .number()
  .min(0)
  .max(PHASE_SECONDS_MAX)
  .refine((v) => Number.isInteger(v / PHASE_STEP), { message: "step" });

export const breathingExerciseInputSchema = z
  .object({
    name: z
      .string()
      .max(BREATHING_NAME_MAX)
      .refine((v) => v.trim().length > 0, { message: "required" }),
    inhaleSeconds: phaseSeconds,
    holdInSeconds: phaseSeconds,
    exhaleSeconds: phaseSeconds,
    holdOutSeconds: phaseSeconds,
    cycles: z.number().int().min(CYCLES_MIN).max(CYCLES_MAX),
    color: z.enum(BREATHING_EXERCISE_COLORS),
  })
  .refine((v) => v.inhaleSeconds > 0 || v.exhaleSeconds > 0, {
    message: "activePhase",
    path: ["inhaleSeconds"],
  });

export const EMPTY_EXERCISE_INPUT: BreathingExerciseInput = {
  name: "",
  inhaleSeconds: 4,
  holdInSeconds: 4,
  exhaleSeconds: 4,
  holdOutSeconds: 4,
  cycles: 6,
  color: "aqua",
};

interface SuggestedPattern {
  key: string;
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
}

// Quick-fill chips in the builder (the reference's "Suggested Patterns").
export const SUGGESTED_PATTERNS: SuggestedPattern[] = [
  { key: "box", inhaleSeconds: 4, holdInSeconds: 4, exhaleSeconds: 4, holdOutSeconds: 4 },
  { key: "478", inhaleSeconds: 4, holdInSeconds: 7, exhaleSeconds: 8, holdOutSeconds: 0 },
  { key: "coherent", inhaleSeconds: 5.5, holdInSeconds: 0, exhaleSeconds: 5.5, holdOutSeconds: 0 },
  { key: "relaxing", inhaleSeconds: 6, holdInSeconds: 0, exhaleSeconds: 2, holdOutSeconds: 0 },
];

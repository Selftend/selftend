import {
  breathingExerciseInputSchema,
  EMPTY_EXERCISE_INPUT,
  PHASE_SECONDS_MAX,
  SUGGESTED_PATTERNS,
} from "@/src/features/breathing/exercise-schema";

const valid = {
  name: "Evening wind-down",
  inhaleSeconds: 4,
  holdInSeconds: 7,
  exhaleSeconds: 8,
  holdOutSeconds: 0,
  cycles: 6,
  color: "aqua" as const,
};

describe("breathingExerciseInputSchema", () => {
  it("accepts a valid input", () => {
    expect(breathingExerciseInputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts half-second durations", () => {
    expect(
      breathingExerciseInputSchema.safeParse({ ...valid, inhaleSeconds: 5.5, exhaleSeconds: 5.5 })
        .success,
    ).toBe(true);
  });

  it("rejects a blank name", () => {
    expect(breathingExerciseInputSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });

  it("rejects sub-half-second granularity", () => {
    expect(breathingExerciseInputSchema.safeParse({ ...valid, inhaleSeconds: 4.3 }).success).toBe(
      false,
    );
  });

  it("rejects durations over the max", () => {
    expect(
      breathingExerciseInputSchema.safeParse({ ...valid, inhaleSeconds: PHASE_SECONDS_MAX + 0.5 })
        .success,
    ).toBe(false);
  });

  it("rejects when neither inhale nor exhale is positive", () => {
    expect(
      breathingExerciseInputSchema.safeParse({
        ...valid,
        inhaleSeconds: 0,
        exhaleSeconds: 0,
        holdInSeconds: 4,
      }).success,
    ).toBe(false);
  });

  it("rejects cycles below 1 or non-integer", () => {
    expect(breathingExerciseInputSchema.safeParse({ ...valid, cycles: 0 }).success).toBe(false);
    expect(breathingExerciseInputSchema.safeParse({ ...valid, cycles: 2.5 }).success).toBe(false);
  });

  it("exposes a valid empty default and suggested patterns", () => {
    // EMPTY default has no active phase yet, so it is intentionally invalid until edited.
    expect(EMPTY_EXERCISE_INPUT.cycles).toBeGreaterThan(0);
    expect(SUGGESTED_PATTERNS.length).toBeGreaterThan(0);
    for (const p of SUGGESTED_PATTERNS) {
      expect(p.inhaleSeconds > 0 || p.exhaleSeconds > 0).toBe(true);
    }
  });
});

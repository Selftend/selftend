import { resolveBuiltin, resolveCustom } from "@/src/features/breathing/resolve-exercise";
import type { BreathingExercise } from "@/src/features/breathing/exercise-types";

describe("resolveBuiltin", () => {
  it("resolves a known slug to phases + cycles + session name", () => {
    const r = resolveBuiltin("box-breathing");
    expect(r).not.toBeNull();
    expect(r!.source).toBe("builtin");
    expect(r!.exerciseName).toBe("box-breathing");
    expect(r!.phases).toHaveLength(4);
    expect(r!.defaultCycles).toBe(8);
    expect(r!.cycleOptions).toEqual([4, 8, 12]);
    expect(r!.color).toBeNull();
  });

  it("returns null for an unknown slug", () => {
    expect(resolveBuiltin("not-a-slug")).toBeNull();
  });
});

describe("resolveCustom", () => {
  const exercise: BreathingExercise = {
    id: "e-1",
    userId: "user-1",
    name: "Evening wind-down",
    inhaleSeconds: 5.5,
    holdInSeconds: 0,
    exhaleSeconds: 5.5,
    holdOutSeconds: 0,
    cycles: 6,
    color: "iris",
    createdAt: "2026-06-01T08:00:00.000Z",
    updatedAt: "2026-06-01T08:00:00.000Z",
  };

  it("maps a custom row, dropping zero-duration phases", () => {
    const r = resolveCustom(exercise);
    expect(r.source).toBe("custom");
    expect(r.exerciseName).toBe("e-1");
    expect(r.title).toBe("Evening wind-down");
    expect(r.phases).toEqual([
      { label: "inhale", durationSeconds: 5.5 },
      { label: "exhale", durationSeconds: 5.5 },
    ]);
    expect(r.defaultCycles).toBe(6);
    expect(r.cycleOptions).toContain(6);
    expect(r.color).toBe("iris");
  });
});

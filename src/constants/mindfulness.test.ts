import { mindfulnessExercises, mindfulnessLookup } from "@/src/constants/mindfulness";
import { EXERCISE_HUES } from "@/src/features/mindfulness/exercise-hue";

describe("mindfulness constants", () => {
  it("gives every exercise an icon and a known hue", () => {
    for (const ex of mindfulnessExercises) {
      expect(typeof ex.icon).toBe("string");
      expect(ex.icon.length).toBeGreaterThan(0);
      expect(EXERCISE_HUES).toContain(ex.hue);
      expect(ex.durations.length).toBeGreaterThan(0);
    }
  });

  it("lookup resolves by slug", () => {
    expect(mindfulnessLookup["breath-awareness"].hue).toBe("mist");
    expect(mindfulnessLookup["mindful-eating"].icon).toBe("restaurant");
  });
});

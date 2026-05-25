import {
  EXERCISE_HUES,
  exerciseHue,
  hueHsl,
  hueGradient,
} from "@/src/features/mindfulness/exercise-hue";

describe("exercise-hue", () => {
  it("exposes a definition for every hue", () => {
    for (const hue of EXERCISE_HUES) {
      const def = exerciseHue(hue);
      expect(def.classes.text).toBe(`text-${hue}`);
      expect(def.classes.fill).toBe(`bg-${hue}`);
      expect(def.hsl.light).toMatch(/^\d+, \d+%, \d+%$/);
      expect(def.hsl.dark).toMatch(/^\d+, \d+%, \d+%$/);
    }
  });

  it("falls back to mist for an unknown hue", () => {
    expect(exerciseHue("nope" as never)).toBe(exerciseHue("mist"));
  });

  it("builds an hsla colour string", () => {
    expect(hueHsl("mist", false, 0.18)).toBe("hsla(178, 40%, 40%, 0.18)");
    expect(hueHsl("mist", true, 0.18)).toBe("hsla(178, 48%, 58%, 0.18)");
  });

  it("builds a top-fade gradient pair", () => {
    expect(hueGradient("act", false)).toEqual([
      "hsla(160, 46%, 38%, 0.14)",
      "hsla(160, 46%, 38%, 0)",
    ]);
    expect(hueGradient("act", true)).toEqual([
      "hsla(160, 56%, 55%, 0.18)",
      "hsla(160, 56%, 55%, 0)",
    ]);
  });
});

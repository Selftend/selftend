import {
  EXERCISE_HUES,
  exerciseHue,
  hueHsl,
  hueGradient,
} from "@/src/features/mindfulness/exercise-hue";

describe("exercise-hue", () => {
  it("includes the think and aqua tool hues", () => {
    expect(EXERCISE_HUES).toEqual(
      expect.arrayContaining(["mist", "iris", "be", "ink", "act", "clay", "think", "aqua"]),
    );
  });

  it("exposes Tailwind classes for aqua", () => {
    expect(exerciseHue("aqua").classes).toEqual({
      text: "text-aqua",
      chipBg: "bg-aqua/15",
      border: "border-aqua/30",
      fill: "bg-aqua",
    });
  });

  it("returns light and dark gradient stops for think", () => {
    expect(hueGradient("think", false)).toEqual([
      "hsla(43, 74%, 52%, 0.14)",
      "hsla(43, 74%, 52%, 0)",
    ]);
    expect(hueGradient("think", true)).toEqual([
      "hsla(43, 86%, 65%, 0.18)",
      "hsla(43, 86%, 65%, 0)",
    ]);
  });

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

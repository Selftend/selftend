import {
  EXERCISE_HUES,
  exerciseHue,
  hueHsl,
  hueGradient,
  hueRamp,
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
      ink: "text-aqua-ink",
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
      // `think` is the single exception, and deliberately so (#412): its accent
      // reads 1.72:1 as a glyph on a bg-think/14 badge in light mode, and that
      // badge is reachable - the 5-4-3-2-1 grounding technique's fourth step
      // carries `hue: "think"` and grounding-session.tsx paints the step hue.
      // So `text` holds the ink token there, which reads 4.97 on the same
      // surface. Asserted as an exception rather than relaxed to a wildcard, so
      // that a second hue joining it has to be argued for here.
      expect(def.classes.text).toBe(hue === "think" ? "text-think-ink" : `text-${hue}`);
      // Every hue carries its ink twin, so a text consumer never has to reach
      // for `text` and land under AA (#403).
      expect(def.classes.ink).toBe(`text-${hue}-ink`);
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

  it("builds a five-step faintest-to-fullest ramp", () => {
    expect(hueRamp("be", false)).toEqual([
      "hsla(330, 56%, 47%, 0.16)",
      "hsla(330, 56%, 47%, 0.32)",
      "hsla(330, 56%, 47%, 0.52)",
      "hsla(330, 56%, 47%, 0.74)",
      "hsla(330, 56%, 47%, 1)",
    ]);
    expect(hueRamp("be", true)[4]).toBe("hsla(330, 62%, 72%, 1)");
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

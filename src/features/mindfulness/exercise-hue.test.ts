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

  // INVERTED by #588: `exerciseHue(hue).classes` no longer exists. It held five
  // Tailwind class names per hue and its two consumers - grounding's icon badge
  // and meditation's practice stripes - are both neutral now, so the map had no
  // callers left. What the definition still carries is the raw HSL the four
  // keeps-hue encodings read; that is asserted below.
  it("exposes no Tailwind class map, only the raw hue", () => {
    expect(Object.keys(exerciseHue("aqua"))).toEqual(["hsl"]);
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
      // The per-hue contrast exceptions that used to be asserted here are gone
      // with the class map: `think`'s `text` held the ink token because its
      // accent read 1.72:1 as a 48px glyph on a bg-think/14 badge, which the
      // grounding session actually painted. No consumer paints a hue as chrome
      // any more, so there is no such surface to except.
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

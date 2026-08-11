import { pacerColors } from "@/src/features/breathing/pacer-colors";

// The aqua expectations are pinned to literal strings rather than to hueHsl()
// calls: restating the implementation's own expression would pass whatever
// alphas the module used. These are the aqua token (src/lib/design-tokens.ts)
// at 1 / 0.14 / 0.18 / 1 / 0.35, plus the chip recipe's ink stops (60% 26%
// light, 65% 80% dark - src/lib/hue-chip.ts). Before #310 the screen mixed its
// own light-mode triple at L 45%; the token's L 36% is what these assert, so a
// drift back to a bespoke value fails here.

describe("pacerColors", () => {
  it("paints box breathing's light pacer in the aqua token", () => {
    expect(pacerColors("aqua", "light")).toEqual({
      halo: "hsla(196, 52%, 36%, 1)",
      circleFill: "hsla(196, 52%, 36%, 0.14)",
      ringTrack: "hsla(196, 52%, 36%, 0.18)",
      ringFill: "hsla(196, 52%, 36%, 1)",
      markIdle: "hsla(196, 52%, 36%, 0.35)",
      timingInk: "hsl(196, 60%, 26%)",
    });
  });

  it("paints box breathing's dark pacer in the aqua token", () => {
    expect(pacerColors("aqua", "dark")).toEqual({
      halo: "hsla(196, 58%, 62%, 1)",
      circleFill: "hsla(196, 58%, 62%, 0.14)",
      ringTrack: "hsla(196, 58%, 62%, 0.18)",
      ringFill: "hsla(196, 58%, 62%, 1)",
      markIdle: "hsla(196, 58%, 62%, 0.35)",
      timingInk: "hsl(196, 65%, 80%)",
    });
  });

  // The pacer follows the running pattern's colour (#779), through the same
  // BREATHING_COLOR_TINTS alias map every other pattern-colour surface uses -
  // so a pattern saved under a retired name renders exactly as its alias.
  it("resolves retired colour names through the alias map", () => {
    for (const scheme of ["light", "dark"] as const) {
      expect(pacerColors("violet", scheme)).toEqual(pacerColors("iris", scheme));
      expect(pacerColors("rose", scheme)).toEqual(pacerColors("clay", scheme));
      expect(pacerColors("emerald", scheme)).toEqual(pacerColors("mist", scheme));
    }
    // `amber` aliases to the `think` tint, which is not itself a storable
    // pattern colour - so its arc is pinned to think's gold directly.
    expect(pacerColors("amber", "light").ringFill).toBe("hsla(43, 74%, 52%, 1)");
    expect(pacerColors("amber", "dark").ringFill).toBe("hsla(43, 86%, 65%, 1)");
  });

  it("gives every pattern colour a distinct full-strength arc from its own hue", () => {
    // Different tint tokens must not collapse onto one colour - the whole point
    // of the encoding is telling the running pattern apart.
    const arcs = (["aqua", "ink", "clay", "iris"] as const).map(
      (c) => pacerColors(c, "light").ringFill,
    );
    expect(new Set(arcs).size).toBe(arcs.length);
  });
});

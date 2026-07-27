import { pacerColors } from "@/src/features/breathing/pacer-colors";

// Pinned to literal strings rather than to hueHsl() calls: restating the
// implementation's own expression would pass whatever alphas the module used.
// These are the aqua token (src/lib/design-tokens.ts) at 0.22 / 1 / 0.1 / 0.3.
// Before #310 the screen mixed its own light-mode triple at L 45%; the token's
// L 36% is what these assert, so a drift back to a bespoke value fails here.

describe("pacerColors", () => {
  it("paints the light pacer in the aqua token", () => {
    expect(pacerColors(false)).toEqual({
      innerFill: "hsla(196, 52%, 36%, 0.22)",
      innerBorder: "hsla(196, 52%, 36%, 1)",
      outerFill: "hsla(196, 52%, 36%, 0.1)",
      outerBorder: "hsla(196, 52%, 36%, 0.3)",
    });
  });

  it("paints the dark pacer in the aqua token", () => {
    expect(pacerColors(true)).toEqual({
      innerFill: "hsla(196, 58%, 62%, 0.22)",
      innerBorder: "hsla(196, 58%, 62%, 1)",
      outerFill: "hsla(196, 58%, 62%, 0.1)",
      outerBorder: "hsla(196, 58%, 62%, 0.3)",
    });
  });
});

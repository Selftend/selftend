import { fieldGradient } from "@/src/lib/module-room";

describe("fieldGradient", () => {
  it("keeps the shipped be and ink gradients byte-identical to the standard recipe", () => {
    // Known-good stops from the mood and sleep rooms as shipped — the override
    // table must not disturb hues that don't opt in.
    expect(fieldGradient("be", false)).toEqual(["hsl(330, 50%, 42%)", "hsl(330, 58%, 32%)"]);
    expect(fieldGradient("be", true)).toEqual(["hsl(330, 34%, 20%)", "hsl(330, 40%, 12%)"]);
    expect(fieldGradient("ink", false)).toEqual(["hsl(232, 50%, 42%)", "hsl(232, 58%, 32%)"]);
    expect(fieldGradient("ink", true)).toEqual(["hsl(232, 34%, 20%)", "hsl(232, 40%, 12%)"]);
  });

  it("overrides think's light stops to the deep-gold recipe and keeps its dark stops standard", () => {
    // Spec #267 §1: at 43° the composited 88%-white body floor forces L ≤ ~32%,
    // so think's light field drops to these stops; dark mode passes untouched.
    expect(fieldGradient("think", false)).toEqual(["hsl(43, 64%, 31%)", "hsl(43, 70%, 25%)"]);
    expect(fieldGradient("think", true)).toEqual(["hsl(43, 34%, 20%)", "hsl(43, 40%, 12%)"]);
  });
});

import { ACCENT_RAMP_CLASSES, RAMP_ALPHAS, accentRampClass } from "@/src/lib/design-tokens";
import { compositeOver, contrastRatio, tripleToRgb } from "@/src/lib/theme/contrast";
import { STYLE_NAMES, THEME_TOKENS } from "@/src/lib/theme/styles";

// The app-wide 5-step score ramp, on the active style's accent (#924 — it was
// HUE_RAMP_CLASSES on mood's pinned `be` pink before, which clashed with every
// non-default style). Two forms render it: the class table here (the
// distribution bar) and useAccentRamp's hsla strings (the heatmap cells).
// NativeWind needs literal class strings, so the table can't derive from
// RAMP_ALPHAS at runtime — this suite keeps the two in lockstep instead.

/** "bg-primary/[0.32]" → 0.32; "bg-primary" → 1. */
function classAlpha(cls: string): number {
  if (cls === "bg-primary") return 1;
  const match = cls.match(/^bg-primary\/\[(0\.\d+)\]$/);
  if (!match) throw new Error(`Unexpected ramp class shape: "${cls}"`);
  return Number(match[1]);
}

describe("ACCENT_RAMP_CLASSES matches the heatmap ramp", () => {
  it("carries the RAMP_ALPHAS opacities, faintest to fullest", () => {
    expect(ACCENT_RAMP_CLASSES).toHaveLength(RAMP_ALPHAS.length);
    ACCENT_RAMP_CLASSES.forEach((cls, i) => {
      expect(classAlpha(cls)).toBe(RAMP_ALPHAS[i]);
    });
  });

  it("accentRampClass rounds and clamps steps into 1..5", () => {
    expect(accentRampClass(0)).toBe(ACCENT_RAMP_CLASSES[0]);
    expect(accentRampClass(2.6)).toBe(ACCENT_RAMP_CLASSES[2]);
    expect(accentRampClass(9)).toBe(ACCENT_RAMP_CLASSES[4]);
  });
});

// The measured half, and the reason the ramp could leave HUE_ENCODINGS at all:
// a scale is only a scale if its steps stay tellable apart on the surface that
// renders them. Sleep's retired quality ramp is the cautionary tale — shipped
// as alpha steps, later measured 1.23 against its own track. So every style's
// accent is measured here, over that style's own card, before it is allowed to
// carry the mood scale.
//
// Measured at #924: step-1-vs-card 1.22 (amber-noir light) – 1.39 (deep-field
// dark); adjacent steps 1.24–1.75. The retired `be` pink read 1.27–1.34 and
// 1.29–1.60 on the same surfaces, so the floor below is set just under today's
// worst case: it exists to catch a FUTURE style whose accent sits so close to
// its card that the scale collapses, not to force a retune of the shipping
// eight.
const DISTINGUISHABILITY_FLOOR = 1.15;

describe("every style's accent can carry the 5-step scale (#924)", () => {
  it.each(STYLE_NAMES)("%s keeps all steps apart on its own card", (style) => {
    for (const scheme of ["light", "dark"] as const) {
      const tokens = THEME_TOKENS[style][scheme];
      const card = tripleToRgb(tokens["--card"]);
      const accent = tripleToRgb(tokens["--primary"]);
      const steps = RAMP_ALPHAS.map((alpha) => compositeOver(accent, alpha, card));

      // A no-entry cell is the bare card, so step 1 must read against it…
      expect(contrastRatio(steps[0], card)).toBeGreaterThanOrEqual(DISTINGUISHABILITY_FLOOR);
      // …and each step against its neighbour, or the ordinal collapses.
      steps.slice(1).forEach((step, i) => {
        expect(contrastRatio(step, steps[i])).toBeGreaterThanOrEqual(DISTINGUISHABILITY_FLOOR);
      });
    }
  });
});

import { RAMP_ALPHAS } from "@/src/features/mindfulness/exercise-hue";
import { HUE_NAMES, HUE_RAMP_CLASSES, hueRampClass } from "@/src/lib/design-tokens";
import { scoreToneClass } from "@/src/features/mood/score-tone";

// HUE_RAMP_CLASSES is the class-string form of the same 5-step encoding the
// heatmap renders via hueRamp() — one ramp app-wide. The class table can't
// derive from RAMP_ALPHAS at runtime (NativeWind needs literal strings), so
// this suite keeps the two in lockstep instead.

/** "bg-be/[0.32]" → 0.32; "bg-be" → 1. */
function classAlpha(cls: string, hue: string): number {
  if (cls === `bg-${hue}`) return 1;
  const match = cls.match(new RegExp(`^bg-${hue}/\\[(0\\.\\d+)\\]$`));
  if (!match) throw new Error(`Unexpected ramp class shape: "${cls}"`);
  return Number(match[1]);
}

describe("HUE_RAMP_CLASSES matches the heatmap ramp", () => {
  it.each(HUE_NAMES)("%s steps carry the RAMP_ALPHAS opacities", (hue) => {
    const classes = HUE_RAMP_CLASSES[hue];
    expect(classes).toHaveLength(RAMP_ALPHAS.length);
    classes.forEach((cls, i) => {
      expect(classAlpha(cls, hue)).toBe(RAMP_ALPHAS[i]);
    });
  });

  it("hueRampClass rounds and clamps steps into 1..5", () => {
    expect(hueRampClass("be", 0)).toBe(HUE_RAMP_CLASSES.be[0]);
    expect(hueRampClass("be", 2.6)).toBe(HUE_RAMP_CLASSES.be[2]);
    expect(hueRampClass("be", 9)).toBe(HUE_RAMP_CLASSES.be[4]);
  });
});

describe("module tone helpers ride the shared ramp", () => {
  // sleep's qualityTint sat here too, until #855 deleted it: the sleep
  // redesign (#771) took the quality level out of hue entirely, so no sleep
  // helper rides the ramp anymore.
  it("mood scoreToneClass delegates for valid scores and stays neutral otherwise", () => {
    expect(scoreToneClass(1)).toBe(HUE_RAMP_CLASSES.be[0]);
    expect(scoreToneClass(5)).toBe(HUE_RAMP_CLASSES.be[4]);
    expect(scoreToneClass(0)).toBe("bg-muted");
    expect(scoreToneClass(2.5)).toBe("bg-muted");
  });
});

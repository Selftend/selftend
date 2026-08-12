import { TIMING_SEGMENT_CLASSES } from "@/src/features/breathing/phase-timing-bar";
import { compositeOver, contrastRatio, tripleToRgb } from "@/src/lib/theme/contrast";
import { STYLE_NAMES, THEME_TOKENS } from "@/src/lib/theme/styles";

// The breathing timing bar's three stops moved off the pattern's colour and
// onto theme tokens (#926), which makes them the accent ramp's problem in
// miniature: a scale is only a scale if its steps stay tellable apart on the
// surface that renders them, and the accent now varies with the active style.
// So every style is measured here, over its own `--background` (the setup and
// editor screens both draw the bar straight on the background), before it is
// allowed to carry the bar.
//
// Measured at #926: strong-vs-background 4.08 (amber-noir light) – 10.01
// (deep-field dark); strong-vs-soft 2.10–2.85; soft-vs-hold 1.40–2.34. The
// floors below sit well under those, on the same reasoning as
// test/accent-ramp-classes.test.ts: they exist to catch a FUTURE style whose
// accent sits too close to its background, not to force a retune of the
// shipping eight.
const DISTINGUISHABILITY_FLOOR = 1.15;
// WCAG 1.4.11: the strong segment is the bar's full-strength stop and must
// read as a graphical object in its own right.
const GRAPHICAL_FLOOR = 3;

/** "bg-primary" → [--primary, 1]; "bg-primary/[0.52]" → [--primary, 0.52]. */
function stopAlpha(cls: string): { token: string; alpha: number } {
  const match = cls.match(/^bg-([a-z-]+?)(?:\/(?:\[(0\.\d+)\]|(\d+)))?$/);
  if (!match) throw new Error(`Unexpected segment class shape: "${cls}"`);
  const alpha = match[2] ? Number(match[2]) : match[3] ? Number(match[3]) / 100 : 1;
  return { token: `--${match[1]}`, alpha };
}

describe("every style's accent can carry the timing bar (#926)", () => {
  const strong = stopAlpha(TIMING_SEGMENT_CLASSES.strong);
  const soft = stopAlpha(TIMING_SEGMENT_CLASSES.soft);
  const neutral = stopAlpha(TIMING_SEGMENT_CLASSES.neutral);

  it("reads the accent for the breath stops and a neutral for the holds", () => {
    // The point of #926: the bar follows the style, so both breath stops must
    // ride `--primary` — a hue token reappearing here is the regression.
    expect(strong.token).toBe("--primary");
    expect(soft.token).toBe("--primary");
    expect(neutral.token).toBe("--muted-foreground");
  });

  it.each(STYLE_NAMES)("%s keeps the stops apart on its own background", (style) => {
    for (const scheme of ["light", "dark"] as const) {
      const tokens = THEME_TOKENS[style][scheme];
      const bg = tripleToRgb(tokens["--background"]);
      const stop = ({ token, alpha }: { token: string; alpha: number }) =>
        compositeOver(tripleToRgb(tokens[token as keyof typeof tokens]), alpha, bg);

      const inhale = stop(strong);
      const exhale = stop(soft);
      const hold = stop(neutral);

      expect(contrastRatio(inhale, bg)).toBeGreaterThanOrEqual(GRAPHICAL_FLOOR);
      // Inhale vs exhale vs hold: three distinct weights, or the bar reads as
      // one long segment and the phase labels carry everything alone.
      expect(contrastRatio(inhale, exhale)).toBeGreaterThanOrEqual(DISTINGUISHABILITY_FLOOR);
      expect(contrastRatio(exhale, hold)).toBeGreaterThanOrEqual(DISTINGUISHABILITY_FLOOR);
      expect(contrastRatio(hold, bg)).toBeGreaterThanOrEqual(DISTINGUISHABILITY_FLOOR);
    }
  });
});

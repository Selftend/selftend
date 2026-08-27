import { HUE_TRIPLES, PRIMARY_TRIPLES, TINT_TOKENS } from "@/src/lib/design-tokens";
import { chipHsl, chipTriples, tintDegree } from "@/src/lib/hue-chip";
import { DEFAULT_STYLE, THEME_TOKENS } from "@/src/lib/theme/styles";

// A chip (src/lib/hue-chip.ts) is a hue-tinted fill, a border, a raw accent
// swatch, and ink. These floors are the certification the habit color chips
// used to lack (#278) - a hue's raw accent cannot carry small text on a tint
// of itself (light `think` on a pale think fill is 1.78:1), so `ink` fixes the
// lightness instead, and this suite proves it.
//
// The room pour is gone (#586/#1292), so chips sit on the app's own surfaces;
// the "on the app surfaces" pairings below are measured against the default
// palette's background and card.

function hslTripleToRgb(triple: string): [number, number, number] {
  const match = triple.match(/^(\d+)\s+(\d+)%\s+(\d+)%$/);
  if (!match) throw new Error(`Unparseable HSL triple: "${triple}"`);
  const h = Number(match[1]);
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgb.map((v) => Math.round((v + m) * 255)) as [number, number, number];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SCHEMES = ["light", "dark"] as const;

describe("chip ink meets WCAG AA on its own fill", () => {
  it.each(TINT_TOKENS)("%s ink passes on the %s fill", (tint) => {
    for (const scheme of SCHEMES) {
      const chip = chipTriples(tint)[scheme];
      const ink = hslTripleToRgb(chip.ink);
      const fill = hslTripleToRgb(chip.fill);
      // The habit color picker labels its swatches in chip ink at text-xs.
      expect(contrastRatio(ink, fill)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("chip ink meets WCAG AA on the app surfaces", () => {
  it.each(TINT_TOKENS)("%s ink passes on the background and card", (tint) => {
    for (const scheme of SCHEMES) {
      const chip = chipTriples(tint)[scheme];
      const surfaces = THEME_TOKENS[DEFAULT_STYLE][scheme];
      const ink = hslTripleToRgb(chip.ink);

      // Ink doubles as the selected swatch's outline and the accent-swatch
      // ring, both drawn straight on the screen surface. Clearing 4.5 there
      // clears the 3.0 non-text floor (WCAG 1.4.11) with room to spare.
      expect(contrastRatio(ink, hslTripleToRgb(surfaces["--background"]))).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrastRatio(ink, hslTripleToRgb(surfaces["--card"]))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("chip colors derive from the hue source of truth", () => {
  it.each(TINT_TOKENS)("every recipe stop carries %s's hue degree", (tint) => {
    const degree = tintDegree(tint);
    for (const scheme of SCHEMES) {
      const { fill, border, ink } = chipTriples(tint)[scheme];
      for (const stop of [fill, border, ink]) {
        expect(stop).toMatch(new RegExp(`^${degree} \\d+% \\d+%$`));
      }
    }
  });

  it.each(TINT_TOKENS)("passes %s's published accent through untouched", (tint) => {
    const published = tint === "primary" ? PRIMARY_TRIPLES : HUE_TRIPLES[tint];
    for (const scheme of SCHEMES) {
      expect(chipTriples(tint)[scheme].accent).toBe(published[scheme]);
    }
  });

  it("emits comma-form hsl() strings for style props", () => {
    const chip = chipHsl("clay").light;
    expect(chip.fill).toMatch(/^hsl\(20, \d+%, \d+%\)$/);
    expect(chip.ink).toMatch(/^hsl\(20, \d+%, \d+%\)$/);
    expect(chip.border).toMatch(/^hsl\(20, \d+%, \d+%\)$/);
    // The accent swatch is the token's own published value, not a recipe stop.
    expect(chip.accent).toBe("hsl(20, 52%, 50%)");
  });
});

import { neutralFieldGradient } from "@/src/lib/theme/chrome";
import { STYLE_NAMES } from "@/src/lib/theme/styles";

// The surviving half of test/room-contrast.test.ts (#586). The rooms it
// measured are gone, but the FIELD it measured is not: module and tool headers
// still paint white ink over a full-bleed gradient, and that pairing still owes
// WCAG AA. Deleting the room checks without relocating these would have left the
// only legibility floor on the field unguarded.
//
// It is also strictly stronger than what it replaces. The old suite measured one
// field - the default palette's violet - because that was the only one that
// existed. The neutral field now derives its hue from the SELECTED palette, so
// the floor has to hold for all eight, in both schemes, at both gradient stops.
// A palette whose accent is too light fails here rather than in someone's eyes.

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

/** "hsl(330, 50%, 42%)" — the comma form the field gradient emits — to rgb. */
function hslStringToRgb(hsl: string): [number, number, number] {
  const match = hsl.match(/^hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)$/);
  if (!match) throw new Error(`Unparseable hsl() string: "${hsl}"`);
  if (match[4] !== undefined && Number(match[4]) !== 1) {
    throw new Error(`Translucent colour needs compositing, not parsing: "${hsl}"`);
  }
  return hslTripleToRgb(`${match[1]} ${match[2]}% ${match[3]}%`);
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

/** Alpha-composite fg over bg — how `text-white/[0.88]` actually renders. */
function compositeOver(
  fg: [number, number, number],
  alpha: number,
  bg: [number, number, number],
): [number, number, number] {
  return fg.map((c, i) => alpha * c + (1 - alpha) * bg[i]) as [number, number, number];
}

const WHITE: [number, number, number] = [255, 255, 255];
const AA_SMALL_TEXT = 4.5;

describe("field header ink meets WCAG AA on every palette's neutral field", () => {
  it.each(STYLE_NAMES)("white title and 88%%-white body pass on the %s field", (style) => {
    for (const isDark of [false, true]) {
      for (const stop of neutralFieldGradient(style, isDark)) {
        const field = hslStringToRgb(stop);

        // Title and stat values: solid white.
        expect(contrastRatio(WHITE, field)).toBeGreaterThanOrEqual(AA_SMALL_TEXT);

        // Description, stat labels, breadcrumb, subline: text-white/[0.88].
        const body = compositeOver(WHITE, 0.88, field);
        expect(contrastRatio(body, field)).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
      }
    }
  });
});

import { fieldGradient, roomTriples } from "@/src/lib/module-room";

// Hues with a validated room recipe. The field recipe holds one S/L formula
// whose white ink is only guaranteed on the darker hues — a light hue (think's
// yellow, act's green) needs a per-hue stop override in FIELD_STOP_OVERRIDES
// before a room can adopt it. When a new module becomes a room, add its hue
// here; if these floors then fail, add or tune its override first.
const ROOM_HUES = ["be", "ink", "think", "act", "aqua", "clay"] as const;

// The Direction B field header paints white ink (title, description at 88%,
// stats) on a full-bleed module-hue gradient, and the room re-pours the
// neutral surface tokens as hue tints (src/lib/module-room.ts). These floors
// keep every on-field pairing at or above WCAG AA (1.4.3, small text) in both
// schemes for every module hue, so a future recipe retune can't quietly ship
// illegible ink. Helper math mirrors test/theme-token-sync.test.ts.

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

/** "hsl(330, 50%, 42%)" (the comma form fieldGradient emits) → rgb. */
function hslStringToRgb(hsl: string): [number, number, number] {
  const match = hsl.match(/^hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)$/);
  if (!match) throw new Error(`Unparseable hsl() string: "${hsl}"`);
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

/** Alpha-composite fg over bg (how text-white/[0.88] renders on the field). */
function compositeOver(
  fg: [number, number, number],
  alpha: number,
  bg: [number, number, number],
): [number, number, number] {
  return fg.map((c, i) => alpha * c + (1 - alpha) * bg[i]) as [number, number, number];
}

const WHITE: [number, number, number] = [255, 255, 255];

describe("field header ink meets WCAG AA on the hue field", () => {
  it.each(ROOM_HUES)("white title and 88%-white body pass on the %s field", (hue) => {
    for (const isDark of [false, true]) {
      for (const stop of fieldGradient(hue, isDark)) {
        const field = hslStringToRgb(stop);
        // Title / stat values: solid white.
        expect(contrastRatio(WHITE, field)).toBeGreaterThanOrEqual(4.5);
        // Description, stat labels, breadcrumb, subline: text-white/[0.88].
        const body = compositeOver(WHITE, 0.88, field);
        expect(contrastRatio(body, field)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("room surface pairings meet WCAG AA", () => {
  it.each(ROOM_HUES)("%s room ink passes on its background and card", (hue) => {
    for (const scheme of ["light", "dark"] as const) {
      const room = roomTriples(hue)[scheme];
      const background = hslTripleToRgb(room.background);
      const card = hslTripleToRgb(room.card);
      const foreground = hslTripleToRgb(room.foreground);
      const mutedForeground = hslTripleToRgb(room["muted-foreground"]);

      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(foreground, card)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(mutedForeground, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(mutedForeground, card)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

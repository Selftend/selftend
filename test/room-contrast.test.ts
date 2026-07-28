import { pacerColors } from "@/src/features/breathing/pacer-colors";
import { HUE_TRIPLES } from "@/src/lib/design-tokens";
import { fieldGradient, roomTriples } from "@/src/lib/module-room";

// Hues with a validated room recipe. The field recipe holds one S/L formula
// whose white ink is only guaranteed on the darker hues — a light hue (think's
// yellow, act's green) needs a per-hue stop override in FIELD_STOP_OVERRIDES
// before a room can adopt it. When a new module becomes a room, add its hue
// here; if these floors then fail, add or tune its override first.
const ROOM_HUES = ["be", "ink", "think", "act", "aqua", "clay", "iris"] as const;

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

/**
 * "hsl(330, 50%, 42%)" (the comma form fieldGradient emits) → rgb. The hsla()
 * form hueHsl() emits is accepted only at full strength: rgb alone can't carry
 * a translucent colour, and silently dropping the alpha would hand back a
 * confidently wrong ratio. Composite translucent stops with compositeOver()
 * against what is actually behind them first.
 */
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

// The third pairing, and the one the two suites above were silent about until
// #368: accent ink on the room surfaces the same hue pours. Seven rooms shipped
// `text-<hue>` on `bg-background` / `bg-card` through that hole — `think` at
// 1.90:1 since the CBT room, plus iris 3.33, clay 3.48 and act 3.68, all in
// light mode. The published accent is tuned as a colour, not as ink, and has
// nowhere near AA's 4.5 on a pale tint of itself. `accent-ink` in roomTriples is
// the certified value (`text-accent-ink`), and this suite is what makes the
// eighth room's absence of it a build failure rather than a launch.
//
// This was first read as a room-surface problem. It is not: the same four hues
// fail within 0.05 of these numbers on the *neutral app surface* too (#403), so
// the room only reproduces a gap the accent already had. The room-less half is
// `text-<hue>-ink`, floored in test/theme-token-sync.test.ts; both halves read
// the same HUE_INK_TRIPLES.
describe("accent ink meets WCAG AA on the room surfaces its own hue pours", () => {
  it.each(ROOM_HUES)("%s accent ink passes on the room background and card", (hue) => {
    for (const scheme of ["light", "dark"] as const) {
      const room = roomTriples(hue)[scheme];
      const accentInk = hslTripleToRgb(room["accent-ink"]);

      expect(contrastRatio(accentInk, hslTripleToRgb(room.background))).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(accentInk, hslTripleToRgb(room.card))).toBeGreaterThanOrEqual(4.5);
    }
  });

  // A floor alone can be satisfied by throwing the colour away — near-black ink
  // clears 4.5 in every room and reads as no hue at all. These pin the shape the
  // floor is meant to be met *with*: the room's own hue, darkened.
  it.each(ROOM_HUES)("%s light accent ink is the published accent, darkened", (hue) => {
    // "43 74% 52%" → the same hue and saturation at the certified lightness.
    const [degree, saturation] = HUE_TRIPLES[hue].light.split(" ");
    expect(roomTriples(hue).light["accent-ink"]).toBe(`${degree} ${saturation} 28%`);
  });

  it.each(ROOM_HUES)("%s dark accent ink is the published accent untouched", (hue) => {
    expect(roomTriples(hue).dark["accent-ink"]).toBe(HUE_TRIPLES[hue].dark);
  });
});

// The fourth pairing, and the one #368's table did not reach: the room hue used
// as ink on a *tint of itself*. Rooms are full of these - a selected chip is
// `bg-<hue>/10` with `text-<hue>` on it, sometimes nested inside a `bg-<hue>/
// [0.06]` box, and each tint darkens the surface the same accent has to carry.
// #368 measured the bare surfaces and found four failing hues; through a single
// /10 chip the published accent fails for *all seven*, `be` and `ink` included
// (4.12 and 4.16 on the room background). That is why mood - a "passing" be room
// - still had a 3.81:1 chip label. Accent ink clears every one of these with
// headroom (worst case 5.00), so the floor holds at AA without a per-pairing
// exception.
describe("accent ink meets WCAG AA on tints of the room's own hue", () => {
  it.each(ROOM_HUES)("%s accent ink passes on a chip fill of its own hue", (hue) => {
    for (const scheme of ["light", "dark"] as const) {
      const room = roomTriples(hue)[scheme];
      const accent = hslTripleToRgb(HUE_TRIPLES[hue][scheme]);
      const accentInk = hslTripleToRgb(room["accent-ink"]);

      for (const surface of ["background", "card"] as const) {
        const base = hslTripleToRgb(room[surface]);
        // `bg-<hue>/10` — the selected-chip fill.
        const chip = compositeOver(accent, 0.1, base);
        // ...and that chip nested in a `bg-<hue>/[0.06]` panel, which mood's
        // "go deeper" body chips actually do.
        const nested = compositeOver(accent, 0.1, compositeOver(accent, 0.06, base));

        expect(contrastRatio(accentInk, chip)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(accentInk, nested)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("the breathing pacer ring reads on the aqua room", () => {
  // The inner circle's edge is the graphic carrying the breath phase, so WCAG
  // 1.4.11 (non-text contrast, 3:1) applies to it. It is never drawn on the
  // room background directly — it breathes inside the outer halo, whose aqua
  // fill at 0.1 sits over that background — so the comparison composites the
  // halo first. #310 swapped the pacer's hardcoded light triple (L 45%) for the
  // aqua token (L 36%); this floor is what keeps that swap, and any later
  // retune, from pushing the ring below legibility. It is a floor only:
  // "too heavy on the pale field" is an aesthetic call a lower bound can't
  // make, and was settled by looking at the rendered circle, not here. The
  // fills and the halo's own edge are decorative and deliberately below it.
  it.each(["light", "dark"] as const)("the ring clears 3:1 in the %s room", (scheme) => {
    const isDark = scheme === "dark";
    const background = hslTripleToRgb(roomTriples("aqua")[scheme].background);
    const ring = hslStringToRgb(pacerColors(isDark).innerBorder);
    const halo = compositeOver(ring, 0.1, background);

    expect(contrastRatio(ring, halo)).toBeGreaterThanOrEqual(3);
  });
});

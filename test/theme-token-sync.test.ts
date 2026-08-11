import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { CARD_COLOR, POPOVER_COLOR } from "@/lib/theme";
import { exerciseHue, EXERCISE_HUES } from "@/src/features/mindfulness/exercise-hue";
import {
  HUE_INK_LIGHTNESS,
  HUE_INK_TRIPLES,
  HUE_NAMES,
  HUE_TRIPLES,
  PRIMARY_INK_LIGHTNESS,
  PRIMARY_INK_TRIPLES,
  PRIMARY_TRIPLES,
} from "@/src/lib/design-tokens";
import { roomTriples } from "@/src/lib/module-room";
import { PALETTE, TINTS, type TintName } from "@/src/features/widgets/palette";

// Since #579 the surface tokens' single source of truth is the TypeScript
// contract in src/lib/theme/, and global.css is the first-paint copy of it that
// test/theme-contract.test.ts pins. src/lib/design-tokens.ts is the single TS
// source for the hue triples, mirrored into global.css because NativeWind needs
// the CSS at build time. Several other TS modules mirror token values because
// LinearGradient / reanimated / SVG / the Android widget renderer cannot read
// CSS variables at all.
//
// This suite reads the CSS — which the contract gate has already pinned to the
// TypeScript — and holds the two things that pinning cannot: the measured
// contrast floors, and the mirrors those unreachable modules carry. It fails the
// build whenever a mirror drifts (e.g. a contrast retune that forgets a copy),
// instead of shipping same-screen two-tone accents.

const ROOT = join(__dirname, "..");
const globalCss = readFileSync(join(ROOT, "global.css"), "utf8");

function tokensOf(block: "root" | "dark"): Record<string, string> {
  const pattern = block === "root" ? /:root\s*\{([^}]*)\}/ : /\.dark\s*\{([^}]*)\}/;
  const body = globalCss.match(pattern)?.[1];
  if (!body) throw new Error(`Could not find ${block} block in global.css`);
  const map: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
    map[name] = value.trim();
  }
  return map;
}

const css = { light: tokensOf("root"), dark: tokensOf("dark") };

/** "330 56% 47%" → "330, 56%, 47%" (the comma form used by hsla() string builders). */
function commaTriple(spaceTriple: string): string {
  return spaceTriple.split(/\s+/).join(", ");
}

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

function hexToRgb(hex: string): [number, number, number] {
  const match = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) throw new Error(`Unparseable hex: "${hex}"`);
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

/**
 * Hand-resolved hex mirrors may round a channel one step differently at exact
 * .5 float boundaries; ±1/255 per channel is visually identical while a real
 * drift (a forgotten retune) is dozens of steps off.
 */
function expectHexMatchesHsl(hex: string, hslTriple: string, context: string) {
  const actual = hexToRgb(hex);
  const expected = hslTripleToRgb(hslTriple);
  for (let i = 0; i < 3; i++) {
    const delta = Math.abs(actual[i] - expected[i]);
    if (delta > 1) {
      throw new Error(
        `${context}: ${hex} does not match hsl(${hslTriple}) ` +
          `(channel ${i}: ${actual[i]} vs ${expected[i]})`,
      );
    }
  }
}

// The CSS ↔ TS parity that used to live here MOVED to
// test/theme-contract.test.ts in #579 — it was not dropped, and it got stronger
// on the way: the contract suite checks both directions (a var in the CSS that
// is in no contract, and a contract name missing from the CSS), which the
// assertions here could not see. It is a move rather than an addition because
// the spec asked for a replacement: two suites asserting the same direction
// would both have to be updated by every retune, which is how mirrors drift.
//
// What stays in this file is what the contract suite deliberately does not do:
// the measured contrast floors, and the mirrors held by modules that cannot read
// a CSS variable at all (the widget renderer, exercise-hue, the chart layer).
describe("lib/theme.ts mirrors global.css", () => {
  // The one parity check that stays, because it is not a copy of the contract:
  // these two are hex projections, so this fails if the triple → hex conversion
  // is wrong even when every token value is right.
  it("CARD_COLOR and POPOVER_COLOR match --card / --popover", () => {
    expectHexMatchesHsl(CARD_COLOR.light, css.light["--card"], "CARD_COLOR.light");
    expectHexMatchesHsl(CARD_COLOR.dark, css.dark["--card"], "CARD_COLOR.dark");
    expectHexMatchesHsl(POPOVER_COLOR.light, css.light["--popover"], "POPOVER_COLOR.light");
    expectHexMatchesHsl(POPOVER_COLOR.dark, css.dark["--popover"], "POPOVER_COLOR.dark");
  });
});

// ---------------------------------------------------------------------------
// Contrast floors
// ---------------------------------------------------------------------------

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

/** Alpha-composite fg over bg (how bg-destructive/60 etc. renders). */
function compositeOver(
  fg: [number, number, number],
  alpha: number,
  bg: [number, number, number],
): [number, number, number] {
  return fg.map((c, i) => alpha * c + (1 - alpha) * bg[i]) as [number, number, number];
}

describe("destructive contrast floors (WCAG 1.4.3, 14px text)", () => {
  // The inline save/validation errors render text-destructive at 14px directly
  // on --background and on --card; the destructive button/badge render white on
  // bg-destructive (light) / bg-destructive/60 over --background (dark). A
  // retune of any of these tokens must keep every pairing at or above 4.5:1.
  const white: [number, number, number] = [255, 255, 255];

  it.each(["light", "dark"] as const)("text-destructive pairings pass in %s", (scheme) => {
    const destructive = hslTripleToRgb(css[scheme]["--destructive"]);
    const background = hslTripleToRgb(css[scheme]["--background"]);
    const card = hslTripleToRgb(css[scheme]["--card"]);

    expect(contrastRatio(destructive, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(destructive, card)).toBeGreaterThanOrEqual(4.5);
  });

  it("white on the destructive button surface passes in both schemes", () => {
    const lightSolid = hslTripleToRgb(css.light["--destructive"]);
    expect(contrastRatio(white, lightSolid)).toBeGreaterThanOrEqual(4.5);

    // Dark buttons/badges use bg-destructive/60 over the page background.
    const darkSurface = compositeOver(
      hslTripleToRgb(css.dark["--destructive"]),
      0.6,
      hslTripleToRgb(css.dark["--background"]),
    );
    expect(contrastRatio(white, darkSurface)).toBeGreaterThanOrEqual(4.5);
  });
});

// INVERTED by #589: `--accent-ink` is gone, so this asserts its absence.
//
// It was a ROOM token - src/lib/module-room.ts re-poured it per hue so that
// `text-accent-ink` resolved to that room's hue darkened to clear AA on the
// surfaces the room poured (#368). The two tests here covered the fallback the
// rooms did not: outside a room there is no hue, so :root kept it equal to
// --primary purely to stop the class resolving to an undefined variable.
//
// That fallback was also the trap. `text-accent-ink` used room-lessly rendered
// violet with no error and no wrong-looking code - #403 spent a sweep on it -
// and once rooms went neutral (#586) the token had no other value left to take.
// The class is `text-primary-ink` at every former call site now, which says what
// it paints.
//
// Fails on the old behaviour, where both blocks emitted it.
describe("--accent-ink is gone", () => {
  it.each(["light", "dark"] as const)("is not emitted in the %s block", (scheme) => {
    expect(css[scheme]).not.toHaveProperty("--accent-ink");
  });
});

// The room-less half of the accent-ink problem (#403). #368 certified accent
// ink on the surfaces a *room* pours and left the neutral app surface alone —
// on the assumption, written into test/room-contrast.test.ts, that "the
// published accent is tuned for the neutral app surface". It is not: `think` is
// 1.88:1 on `--background`, `iris` 3.42, `clay` 3.51 and `act` 3.64, within 0.05
// of their in-room numbers. Most `text-<hue>` sites are room-less (only eight
// modules wear a room), and `text-accent-ink` cannot serve them — outside a room
// it resolves to `--primary`, so it would change the colour, not the contrast.
// `text-<hue>-ink` is the token for those sites, and this suite is its floor.
describe("hue ink meets WCAG AA on the neutral app surface", () => {
  it.each(HUE_NAMES)("--%s-ink mirrors HUE_INK_TRIPLES in both schemes", (hue) => {
    expect({ light: css.light[`--${hue}-ink`], dark: css.dark[`--${hue}-ink`] }).toEqual(
      HUE_INK_TRIPLES[hue],
    );
  });

  it.each(HUE_NAMES)("%s ink passes on the app background and card", (hue) => {
    for (const scheme of ["light", "dark"] as const) {
      const ink = hslTripleToRgb(css[scheme][`--${hue}-ink`]);

      expect(
        contrastRatio(ink, hslTripleToRgb(css[scheme]["--background"])),
      ).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(ink, hslTripleToRgb(css[scheme]["--card"]))).toBeGreaterThanOrEqual(4.5);
    }
  });

  // As in test/room-contrast.test.ts: a floor alone can be met by throwing the
  // colour away — near-black ink clears 4.5 against anything and reads as no hue
  // at all. These pin the shape the floor is meant to be met *with*.
  it.each(HUE_NAMES)("%s light ink is the published accent, darkened", (hue) => {
    const [degree, saturation] = HUE_TRIPLES[hue].light.split(" ");

    expect(HUE_INK_TRIPLES[hue].light).toBe(`${degree} ${saturation} ${HUE_INK_LIGHTNESS}%`);
  });

  it.each(HUE_NAMES)("%s dark ink is the published accent untouched", (hue) => {
    expect(HUE_INK_TRIPLES[hue].dark).toBe(HUE_TRIPLES[hue].dark);
  });

  // INVERTED by #589. This asserted the room pour and the room-less token were
  // the same colour by construction, both reading HUE_INK_TRIPLES. No room pours
  // anything now (#586) and `--accent-ink` is deleted, so a room emitting it
  // would be reviving a var with no Tailwind utility left to resolve it - dead
  // output that the lint gate cannot see, because module-room.ts is one of the
  // files sanctioned to name hues.
  it.each(HUE_NAMES)("%s room pours no --accent-ink", (hue) => {
    expect(roomTriples(hue).light).not.toHaveProperty("accent-ink");
    expect(roomTriples(hue).dark).not.toHaveProperty("accent-ink");
  });

  // The floor above measures the ink on *bare* neutral surfaces, which is the
  // easy case. Off-room hue text almost never lands there: it sits on a wash of
  // its own hue — the `bg-<hue>/5` pillar card, the `bg-<hue>/10` ready banner,
  // the `bg-<hue>/15` nav badge — and a wash of the hue pulls the surface toward
  // the ink, costing contrast rather than adding it. That is the pairing the
  // published accent failed worst on (`text-think` on `bg-think/5` is 1.82:1),
  // and a bare-surface floor alone would certify an ink that still fails there.
  const TINT_ALPHAS = [0.05, 0.1, 0.15] as const;

  it.each(HUE_NAMES)("%s ink passes on washes of its own hue", (hue) => {
    for (const scheme of ["light", "dark"] as const) {
      const ink = hslTripleToRgb(css[scheme][`--${hue}-ink`]);
      const wash = hslTripleToRgb(css[scheme][`--${hue}`]);

      for (const base of ["--background", "--card"] as const) {
        for (const alpha of TINT_ALPHAS) {
          const surface = compositeOver(wash, alpha, hslTripleToRgb(css[scheme][base]));

          expect(contrastRatio(ink, surface)).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});

// The `primary` half of the same problem (#421 §3). #403 gave all eight hues an
// ink and stopped there, because `primary` is not a hue: it has no HUE_NAMES
// entry, no room pours it, and every gate is spelled `text-<hue>`. So the tint
// with the widest reach in the app kept writing its raw accent as text — the
// sidebar's "Beta" chip, `text-primary` at 10px/600 on `bg-primary/15` over the
// sidebar's card, 4.41:1 light and 4.22:1 dark, on all 20 captured screens.
// This suite is `--primary-ink`'s floor, and it is deliberately the *same* set
// of surfaces the hue block above checks, so the new token is certified by the
// rule the eight were certified by rather than by one written to fit it.
describe("primary ink meets WCAG AA on the neutral app surface", () => {
  it("--primary-ink mirrors PRIMARY_INK_TRIPLES in both schemes", () => {
    expect({ light: css.light["--primary-ink"], dark: css.dark["--primary-ink"] }).toEqual(
      PRIMARY_INK_TRIPLES,
    );
  });

  it.each(["light", "dark"] as const)("primary ink passes on the %s background and card", (s) => {
    const ink = hslTripleToRgb(css[s]["--primary-ink"]);

    expect(contrastRatio(ink, hslTripleToRgb(css[s]["--background"]))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(ink, hslTripleToRgb(css[s]["--card"]))).toBeGreaterThanOrEqual(4.5);
  });

  // The pairing that actually failed. Primary text almost never lands on a bare
  // surface: it sits on a wash of primary — the `bg-primary/15` Beta chip and
  // `/modules` mark, the `bg-primary/10` ready banner, the `bg-primary/5`
  // program container — and a wash of the accent pulls the surface toward the
  // ink, costing contrast rather than adding it. Same alphas as the hue block.
  it.each(["light", "dark"] as const)("primary ink passes on washes of the accent in %s", (s) => {
    const ink = hslTripleToRgb(css[s]["--primary-ink"]);
    const wash = hslTripleToRgb(css[s]["--primary"]);

    for (const base of ["--background", "--card"] as const) {
      for (const alpha of [0.05, 0.1, 0.15] as const) {
        const surface = compositeOver(wash, alpha, hslTripleToRgb(css[s][base]));

        expect(contrastRatio(ink, surface)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  // One level deeper than the hue floor goes, and the reason dark ink is 80%
  // rather than 76%: #421 measured the Beta chip at 3.89 light / 3.54 dark
  // where it sits *inside* a primary-tinted card, which the single-wash floor
  // above cannot see. Every alpha the app tints primary with, stacked on every
  // other, on both neutral bases — the worst is `/15` on `/15` (8.00 light,
  // 4.71 dark). A future lightness retune that clears the floor above while
  // re-breaking the nested case fails here instead of shipping.
  it.each(["light", "dark"] as const)("primary ink passes on a wash of a wash in %s", (s) => {
    const ink = hslTripleToRgb(css[s]["--primary-ink"]);
    const wash = hslTripleToRgb(css[s]["--primary"]);
    const alphas = [0.05, 0.1, 0.12, 0.15] as const;

    for (const base of ["--background", "--card"] as const) {
      for (const outer of alphas) {
        const card = compositeOver(wash, outer, hslTripleToRgb(css[s][base]));
        for (const inner of alphas) {
          expect(contrastRatio(ink, compositeOver(wash, inner, card))).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  // As with the hues: a floor alone can be met by throwing the colour away.
  // Primary ink must stay the brand violet, which means degree and saturation
  // untouched and only lightness moved.
  it.each(["light", "dark"] as const)(
    "primary %s ink keeps the accent's hue and saturation",
    (s) => {
      const [degree, saturation] = PRIMARY_TRIPLES[s].split(" ");

      expect(PRIMARY_INK_TRIPLES[s]).toBe(`${degree} ${saturation} ${PRIMARY_INK_LIGHTNESS[s]}%`);
    },
  );

  it("light ink darkens to the same depth as the eight hue inks", () => {
    expect(PRIMARY_INK_LIGHTNESS.light).toBe(HUE_INK_LIGHTNESS);
  });

  // The one place primary parts company with the hues, asserted rather than
  // left as a comment. `--<hue>-ink` in dark is the published accent untouched
  // because every hue already clears AA there; primary does not (4.22 on the
  // Beta chip), so its dark ink is *lighter* than its accent. If a future
  // primary retune ever made the raw accent pass, this is where to re-open the
  // question — the assertion should be revisited, not deleted.
  it("dark ink is lighter than the accent, unlike every hue ink", () => {
    expect(PRIMARY_INK_LIGHTNESS.dark).toBeGreaterThan(72);

    for (const hue of HUE_NAMES) {
      expect(HUE_INK_TRIPLES[hue].dark).toBe(HUE_TRIPLES[hue].dark);
    }

    const rawOnChip = compositeOver(
      hslTripleToRgb(css.dark["--primary"]),
      0.15,
      hslTripleToRgb(css.dark["--card"]),
    );
    expect(contrastRatio(hslTripleToRgb(css.dark["--primary"]), rawOnChip)).toBeLessThan(4.5);
  });
});

// INVERTED by #589: TINT_ACCENT is gone, and this suite went with it.
//
// It was the strongest gate in the workstream and it is worth saying what it
// did before deleting it. #433 found that TINT_ACCENT's docstring asserted
// 1.4.11's 3:1 floor was met "which the published accents clear" and that
// nothing had ever computed it - rendered, `think`'s glyph measured 1.80:1 on
// the signed-out landing page, and 1.88 on the bare app background, so no wash
// was ever going to rescue it. Three gates were green while that shipped,
// because all three checked spelling (`text-<hue>` vs `text-<hue>-ink`) and none
// checked luminance. So this suite recomputed the answer instead of encoding it:
// for every tint it measured the accent on every wash a mark was actually
// painted on, and asserted the map held the accent exactly where that cleared
// 3.0 and the ink where it did not.
//
// There is no map left to derive. Every consumer became neutral chrome across
// #587 and #588, and the neutral pair is held to its floors by the palette gates
// rather than per hue. What survives is `think`'s ink swap, which is a fact
// about the ENCODING palette rather than about chrome - the four keeps-hue
// surfaces still read these tokens - so it is asserted directly below.
// The mark floor the deleted suite used to provide, narrowed to what is left.
//
// The old derivation measured every tint on every wash a TINT_ACCENT glyph was
// painted on. Those glyphs are gone, but the ENCODING surfaces still paint bare
// accents as marks - mood-scale's selected border, the star rating's filled star
// - and deleting the derivation without replacing it would have left the last
// bare accents in the app unmeasured. That is the shape of #433's defect, which
// is precisely why it is not left as "no consumers, no floor".
describe("the encoding palette's bare accents still clear the mark floor", () => {
  const MARK_FLOOR = 3;

  // Only the hues an encoding surface actually paints bare. `think` is absent
  // and must stay absent: it measures 1.88:1 on the bare background, which is
  // why its own -ink token IS the mark everywhere it appears.
  const ENCODING_MARK_HUES = ["act", "ink"] as const;

  it.each(ENCODING_MARK_HUES)("--%s clears 3:1 on the app surfaces it marks", (hue) => {
    for (const scheme of ["light", "dark"] as const) {
      const mark = hslTripleToRgb(css[scheme][`--${hue}`]);
      for (const surface of ["--background", "--card"] as const) {
        expect({
          hue,
          scheme,
          surface,
          clears: contrastRatio(mark, hslTripleToRgb(css[scheme][surface])) >= MARK_FLOOR,
        }).toEqual({ hue, scheme, surface, clears: true });
      }
    }
  });

  it("keeps think out of that list, because it has never had a surface", () => {
    // Asserted rather than assumed: if a retune ever lifted think over 3:1 this
    // fails and someone re-reads the list, instead of it staying wrong forever.
    const ratio = contrastRatio(
      hslTripleToRgb(css.light["--think"]),
      hslTripleToRgb(css.light["--background"]),
    );

    expect(ratio).toBeLessThan(MARK_FLOOR);
    expect([...ENCODING_MARK_HUES]).not.toContain("think");
  });
});

describe("think's ink is the swap #433 forced, independent of any chrome map", () => {
  it("light think-ink is darker than the published accent it replaced", () => {
    const ink = hslTripleToRgb(css.light["--think-ink"]);
    const accent = hslTripleToRgb(css.light["--think"]);
    const bg = hslTripleToRgb(css.light["--background"]);

    // 1.88:1 was the number that condemned the accent as a mark.
    expect(contrastRatio(accent, bg)).toBeLessThan(3);
    expect(contrastRatio(ink, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("dark think-ink is the published accent, so the mark is unchanged there", () => {
    expect(css.dark["--think-ink"]).toBe(css.dark["--think"]);
  });
});

describe("design-tokens.ts hue source mirrors global.css", () => {
  it.each(HUE_NAMES)("HUE_TRIPLES.%s matches --%s in both schemes", (hue) => {
    expect(HUE_TRIPLES[hue]).toEqual({
      light: css.light[`--${hue}`],
      dark: css.dark[`--${hue}`],
    });
  });

  it("PRIMARY_TRIPLES matches --primary in both schemes", () => {
    expect(PRIMARY_TRIPLES).toEqual({
      light: css.light["--primary"],
      dark: css.dark["--primary"],
    });
  });

  it("the retired --chart-* tokens stay deleted", () => {
    expect(globalCss).not.toMatch(/--chart-/);
    expect(readFileSync(join(ROOT, "lib", "theme.ts"), "utf8")).not.toMatch(/--chart-|chart[1-5]/);
  });
});

describe("exercise-hue.ts mirrors global.css", () => {
  it.each(EXERCISE_HUES)("HUE_HSL.%s matches --%s in both schemes", (hue) => {
    expect(exerciseHue(hue).hsl).toEqual({
      light: commaTriple(css.light[`--${hue}`]),
      dark: commaTriple(css.dark[`--${hue}`]),
    });
  });
});

describe("widgets/palette.ts mirrors global.css", () => {
  const tintNames: TintName[] = ["primary", "act", "be", "aqua", "think", "iris", "ink", "clay"];

  it.each(["light", "dark"] as const)("TINTS.%s matches the css hue tokens", (scheme) => {
    for (const name of tintNames) {
      expectHexMatchesHsl(TINTS[scheme][name], css[scheme][`--${name}`], `TINTS.${scheme}.${name}`);
    }
  });

  const paletteTokens: Record<keyof (typeof PALETTE)["light"], string> = {
    bg: "--background",
    card: "--card",
    fg: "--foreground",
    muted: "--muted-foreground",
    chip: "--secondary",
    accent: "--primary",
    border: "--border",
    mutedBg: "--muted",
  };

  it.each(["light", "dark"] as const)("PALETTE.%s matches the css surface tokens", (scheme) => {
    for (const [key, token] of Object.entries(paletteTokens)) {
      expectHexMatchesHsl(
        PALETTE[scheme][key as keyof (typeof PALETTE)["light"]],
        css[scheme][token],
        `PALETTE.${scheme}.${key}`,
      );
    }
  });
});

describe("chart layer never hardcodes HSL", () => {
  // Charts reach hue colors only through hueHsl()/hueRamp()/hueGradient() and
  // neutrals through THEME — a literal hsl(/hsla( in src/components/charts/
  // is a drift from the token source of truth by definition.
  const chartsDir = join(ROOT, "src", "components", "charts");

  it("src/components/charts/*.tsx contains no hsl literals", () => {
    const files = readdirSync(chartsDir).filter(
      (f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(join(chartsDir, file), "utf8");
      expect(source).not.toMatch(/hsla?\(/);
    }
  });

  // The breathing pacer built its colors from a hardcoded triple until #310, so
  // a palette retune skipped the screen's central graphic. Same tripwire as the
  // chart layer above: the screen's colors now come from pacerColors(), and any
  // hsl literal returning to the file is drift by the same definition. A future
  // gradient stop belongs in a helper (fieldGradient/hueHsl), not inline here.
  //
  // #779 split the focal element into src/features/breathing/breathing-pacer.tsx
  // and put the session on the shared focus shell - both render SVG/reanimated
  // colour props, exactly the surface #310's literal hid in, so both are held
  // to the same zero.
  it.each([
    join("app", "(app)", "tools", "breathing", "session.tsx"),
    join("src", "features", "breathing", "breathing-pacer.tsx"),
    join("src", "components", "app", "focus-session-shell.tsx"),
  ])("%s contains no hsl literals", (file) => {
    const source = readFileSync(join(ROOT, file), "utf8");
    expect(source).not.toMatch(/hsla?\(/);
  });

  it("the breathing session screen still draws through pacerColors()", () => {
    const source = readFileSync(
      join(ROOT, "app", "(app)", "tools", "breathing", "session.tsx"),
      "utf8",
    );
    expect(source).toMatch(/pacerColors/);
  });
});

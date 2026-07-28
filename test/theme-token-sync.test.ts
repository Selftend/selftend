import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { CARD_COLOR, POPOVER_COLOR, THEME } from "@/lib/theme";
import { exerciseHue, EXERCISE_HUES } from "@/src/features/mindfulness/exercise-hue";
import {
  HUE_INK_LIGHTNESS,
  HUE_INK_TRIPLES,
  HUE_NAMES,
  HUE_TRIPLES,
  PRIMARY_TRIPLES,
} from "@/src/lib/design-tokens";
import { roomTriples } from "@/src/lib/module-room";
import { PALETTE, TINTS, type TintName } from "@/src/features/widgets/palette";

// global.css is the single source of truth for the surface tokens, and
// src/lib/design-tokens.ts is the single TS source for the hue triples (the
// hand-written global.css mirrors them because NativeWind needs it at build
// time). Several other TS modules mirror token values because LinearGradient /
// reanimated / SVG / the Android widget renderer cannot read CSS variables.
// This suite fails the build whenever any mirror drifts (e.g. a contrast
// retune that forgets a copy), instead of shipping same-screen two-tone
// accents.

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

const camelToToken = (key: string) =>
  `--${key
    .replace(/([A-Z])/g, "-$1")
    .replace(/(\d)/g, "-$1")
    .toLowerCase()}`;

describe("lib/theme.ts mirrors global.css", () => {
  it.each(["light", "dark"] as const)("THEME.%s matches the css tokens", (scheme) => {
    for (const [key, value] of Object.entries(THEME[scheme])) {
      if (key === "radius") {
        // .dark declares no --radius; the cascade inherits it from :root.
        expect(value).toBe(css[scheme]["--radius"] ?? css.light["--radius"]);
        continue;
      }
      expect({ key, value }).toEqual({ key, value: `hsl(${css[scheme][camelToToken(key)]})` });
    }
  });

  it.each(["light", "dark"] as const)("THEME_VARIABLES %s matches the css tokens", (scheme) => {
    const source = readFileSync(join(ROOT, "lib", "theme.ts"), "utf8");
    const variablesSection = source.slice(source.indexOf("THEME_VARIABLES"));
    const blocks = [...variablesSection.matchAll(/vars\(\{([^}]*)\}\)/g)];
    expect(blocks).toHaveLength(2);
    const body = scheme === "light" ? blocks[0][1] : blocks[1][1];
    const entries = [...body.matchAll(/"(--[a-z0-9-]+)":\s*"([^"]+)"/g)];
    expect(entries.length).toBeGreaterThan(0);
    for (const [, token, value] of entries) {
      // --radius is only declared on :root; .dark inherits it via the cascade.
      expect({ token, value }).toEqual({ token, value: css[scheme][token] ?? css.light[token] });
    }
  });

  it.each(["light", "dark"] as const)("THEME_VARIABLES %s carries every hue token", (scheme) => {
    const source = readFileSync(join(ROOT, "lib", "theme.ts"), "utf8");
    const variablesSection = source.slice(source.indexOf("THEME_VARIABLES"));
    const blocks = [...variablesSection.matchAll(/vars\(\{([^}]*)\}\)/g)];
    expect(blocks).toHaveLength(2);
    const body = scheme === "light" ? blocks[0][1] : blocks[1][1];
    for (const hue of HUE_NAMES) {
      // Hue values must come from the TS hue source, never a fresh literal.
      expect(body).toContain(`"--${hue}": HUE_TRIPLES.${hue}.${scheme}`);
    }
  });

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

describe("the room-less accent ink fallback", () => {
  // `--accent-ink` is a room token: src/lib/module-room.ts re-pours it per hue
  // so `text-accent-ink` resolves to that room's hue, darkened to clear AA on
  // the surfaces the room pours (#368). Outside a room there is no hue, so the
  // :root value keeps the class from resolving to an undefined variable — the
  // app accent is what an accent means there. Per-hue floors live in
  // test/room-contrast.test.ts; these two cover the fallback the rooms don't.
  it.each(["light", "dark"] as const)("mirrors --primary in the %s block", (scheme) => {
    expect(css[scheme]["--accent-ink"]).toBe(css[scheme]["--primary"]);
  });

  it.each(["light", "dark"] as const)("clears AA on the neutral surfaces in %s", (scheme) => {
    const ink = hslTripleToRgb(css[scheme]["--accent-ink"]);

    expect(contrastRatio(ink, hslTripleToRgb(css[scheme]["--background"]))).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrastRatio(ink, hslTripleToRgb(css[scheme]["--card"]))).toBeGreaterThanOrEqual(4.5);
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

  // The room pour and the room-less token are the same colour by construction
  // (both read HUE_INK_TRIPLES), not by two recipes that happen to agree today.
  it.each(HUE_NAMES)("%s ink is the value its room pours as --accent-ink", (hue) => {
    expect(roomTriples(hue).light["accent-ink"]).toBe(HUE_INK_TRIPLES[hue].light);
    expect(roomTriples(hue).dark["accent-ink"]).toBe(HUE_INK_TRIPLES[hue].dark);
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
  it("the breathing session screen contains no hsl literals", () => {
    const source = readFileSync(
      join(ROOT, "app", "(app)", "tools", "breathing", "session.tsx"),
      "utf8",
    );
    expect(source).toMatch(/pacerColors/);
    expect(source).not.toMatch(/hsla?\(/);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NAV_THEME, THEME, THEME_VAR_VALUES } from "@/lib/theme";
import {
  HUE_INK_TRIPLES,
  HUE_NAMES,
  HUE_TRIPLES,
  PRIMARY_INK_LIGHTNESS,
  PRIMARY_INK_TRIPLES,
  PRIMARY_TRIPLES,
} from "@/src/lib/design-tokens";
import { hslTripleToHex, withLightness } from "@/src/lib/theme/color";
import { COLOR_SCHEMES, RADIUS, THEME_VAR_NAMES } from "@/src/lib/theme/contract";
import { deriveTokens } from "@/src/lib/theme/derive";
import {
  navigationTheme,
  themeHex,
  themeHexes,
  themePalette,
  themeTokens,
} from "@/src/lib/theme/projections";
import {
  DEFAULT_STYLE,
  resolveStyle,
  STYLE_NAMES,
  STYLE_SOURCES,
  THEME_TOKENS,
} from "@/src/lib/theme/styles";

// #579 inverted the source of truth: the 20-name style contract lives in
// TypeScript (src/lib/theme/) and global.css carries a static copy of the
// DEFAULT_STYLE pair whose only job is the pre-hydration first paint. This suite
// is what stops the copy drifting from the source — the old direction (CSS as
// truth, TS as mirror) is gated by test/theme-token-sync.test.ts, which still
// holds the contrast floors and the encoding-palette mirrors.

const ROOT = join(__dirname, "..");
const globalCss = readFileSync(join(ROOT, "global.css"), "utf8");

function cssBlock(block: "root" | "dark"): Record<string, string> {
  const pattern = block === "root" ? /:root\s*\{([^}]*)\}/ : /\.dark\s*\{([^}]*)\}/;
  const body = globalCss.match(pattern)?.[1];
  if (!body) throw new Error(`Could not find ${block} block in global.css`);
  const map: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
    map[name] = value.trim();
  }
  return map;
}

const css = { light: cssBlock("root"), dark: cssBlock("dark") };

/**
 * The vars global.css carries that are NOT style tokens, and why each is there.
 * A name that is in the CSS and in neither list is a token somebody added to the
 * fallback without adding it to the contract — which is exactly the drift this
 * file exists to catch.
 */
const NON_CONTRACT_VARS = [
  // Global constant: colours-only style axis (#555 §2).
  "--radius",
  // The pinned encoding palette (#558).
  ...HUE_NAMES.map((hue) => `--${hue}`),
  ...HUE_NAMES.map((hue) => `--${hue}-ink`),
];

describe("the CSS fallback pair mirrors the TypeScript contract", () => {
  it.each(COLOR_SCHEMES)("%s declares every contract var with the contract's value", (scheme) => {
    const tokens = themeTokens(scheme, DEFAULT_STYLE);

    for (const name of THEME_VAR_NAMES) {
      expect({ scheme, name, value: css[scheme][name] }).toEqual({
        scheme,
        name,
        value: tokens[name],
      });
    }
  });

  it.each(COLOR_SCHEMES)("%s declares no var outside the contract or its two escapes", (scheme) => {
    const known = new Set<string>([...THEME_VAR_NAMES, ...NON_CONTRACT_VARS]);

    expect(Object.keys(css[scheme]).filter((name) => !known.has(name))).toEqual([]);
  });

  // The reverse direction: a contract name dropped from global.css would leave
  // the pre-hydration paint reading an undefined variable on that surface.
  it.each(COLOR_SCHEMES)("%s is missing no contract var", (scheme) => {
    expect(THEME_VAR_NAMES.filter((name) => css[scheme][name] === undefined)).toEqual([]);
  });
});

describe("--radius left the contract and became a global constant", () => {
  it("is not a style token", () => {
    expect(THEME_VAR_NAMES).not.toContain("--radius");
    for (const style of STYLE_NAMES) {
      for (const scheme of COLOR_SCHEMES) {
        expect(THEME_TOKENS[style][scheme]).not.toHaveProperty("--radius");
      }
    }
  });

  it("matches the one value global.css declares", () => {
    expect(css.light["--radius"]).toBe(RADIUS);
    // .dark deliberately declares none — the cascade inherits it, which is what
    // "does not vary" looks like in CSS.
    expect(css.dark["--radius"]).toBeUndefined();
  });

  it("is still emitted at the app root, from the constant", () => {
    for (const scheme of COLOR_SCHEMES) {
      expect(THEME_VAR_VALUES[scheme]["--radius"]).toBe(RADIUS);
    }
  });
});

describe("--accent-ink has no home in the contract", () => {
  it("is not a style token", () => {
    expect(THEME_VAR_NAMES).not.toContain("--accent-ink");
  });

  // INVERTED by #589. It used to be emitted anyway - not a style token, but
  // still written to :root as the app accent, because the call sites were not
  // swept and the var was not deleted until this ticket. Both are true now, so
  // it is emitted nowhere. Fails on the old behaviour, which emitted it in both
  // schemes.
  it.each(COLOR_SCHEMES)("is not emitted in %s either", (scheme) => {
    expect(THEME_VAR_VALUES[scheme]).not.toHaveProperty("--accent-ink");
  });
});

describe("the eight hues left the style contract", () => {
  it("no hue or hue ink is a style token", () => {
    for (const hue of HUE_NAMES) {
      expect(THEME_VAR_NAMES).not.toContain(`--${hue}`);
      expect(THEME_VAR_NAMES).not.toContain(`--${hue}-ink`);
    }
  });

  // They are a pinned encoding palette instead: emitted beside the style, from
  // the encoding source, identical whichever style is active.
  it.each(COLOR_SCHEMES)("every hue is emitted in %s from the encoding palette", (scheme) => {
    for (const hue of HUE_NAMES) {
      expect(THEME_VAR_VALUES[scheme][`--${hue}`]).toBe(HUE_TRIPLES[hue][scheme]);
      expect(THEME_VAR_VALUES[scheme][`--${hue}-ink`]).toBe(HUE_INK_TRIPLES[hue][scheme]);
    }
  });
});

describe("the root var record is exactly the contract plus its escapes", () => {
  it.each(COLOR_SCHEMES)("%s emits no more and no less", (scheme) => {
    expect(Object.keys(THEME_VAR_VALUES[scheme]).sort()).toEqual(
      [...THEME_VAR_NAMES, ...NON_CONTRACT_VARS].sort(),
    );
  });

  it.each(COLOR_SCHEMES)("%s contract values come from the contract", (scheme) => {
    const tokens = themeTokens(scheme);

    for (const name of THEME_VAR_NAMES) {
      expect({ name, value: THEME_VAR_VALUES[scheme][name] }).toEqual({
        name,
        value: tokens[name],
      });
    }
  });
});

describe("quiet-lilac is hand-authored, and that is the pixel-identical guarantee", () => {
  it("is the default style", () => {
    expect(DEFAULT_STYLE).toBe("quiet-lilac");
  });

  // Derivation rounds through integer H/S%/L% and collapses secondary/muted/
  // accent onto one alt surface, so no set of six hexes reproduces lilac's
  // twenty values. Authoring is not a shortcut here — it is the only way to
  // promise the shipping app does not move.
  it("takes the authored escape rather than a derivation", () => {
    expect(STYLE_SOURCES[DEFAULT_STYLE].kind).toBe("authored");
  });

  it("resolves to exactly what it authored", () => {
    const source = STYLE_SOURCES[DEFAULT_STYLE];
    if (source.kind !== "authored") throw new Error("quiet-lilac must stay hand-authored");

    expect(resolveStyle(source)).toEqual({ light: source.light, dark: source.dark });
  });

  // Both authoring modes are first-class: resolveStyle takes either and returns
  // the same shape, so #581 can add the other seven palettes as six hexes each
  // without touching this one.
  it("sits beside a derived style in the same table shape", () => {
    const derived = resolveStyle({
      kind: "derived",
      light: {
        bg: "#f4f2f8",
        surface: "#ffffff",
        border: "#ddd8e6",
        ink: "#1b1823",
        muted: "#5f5a6b",
        accent: "#5a3fc0",
      },
      dark: {
        bg: "#12101a",
        surface: "#1c1926",
        border: "#2f2b3d",
        ink: "#e7e4ef",
        muted: "#9a94ab",
        accent: "#a98cf0",
      },
    });

    for (const scheme of COLOR_SCHEMES) {
      expect(Object.keys(derived[scheme]).sort()).toEqual(
        Object.keys(THEME_TOKENS[DEFAULT_STYLE][scheme]).sort(),
      );
    }
  });
});

describe("the contract and the encoding palette agree on primary", () => {
  // Two TS modules still spell the app accent: the contract owns it as a style
  // token, and src/lib/design-tokens.ts keeps PRIMARY_TRIPLES for the tint maps
  // the call-site sweep has not reached yet (#585-#589 collapses them). While
  // both exist they must be the same colour.
  it.each(COLOR_SCHEMES)("PRIMARY_TRIPLES is the %s contract accent", (scheme) => {
    expect(PRIMARY_TRIPLES[scheme]).toBe(themeTokens(scheme)["--primary"]);
  });

  it.each(COLOR_SCHEMES)("PRIMARY_INK_TRIPLES is the %s contract ink", (scheme) => {
    expect(PRIMARY_INK_TRIPLES[scheme]).toBe(themeTokens(scheme)["--primary-ink"]);
  });

  // quiet-lilac's authored ink happens to sit at the lightness the old fixed
  // recipe named (28 light / 80 dark), and that is not a coincidence worth
  // deleting: it is the number #421 measured against this palette. Derived
  // styles no longer use it — they solve (#580) — but while design-tokens.ts
  // still spells the recipe for the pinned hue inks, the default style's
  // authored values must agree with what it says.
  it.each(COLOR_SCHEMES)("the %s authored ink sits at the documented lightness", (scheme) => {
    expect(themeTokens(scheme)["--primary-ink"]).toBe(
      withLightness(themeTokens(scheme)["--primary"], PRIMARY_INK_LIGHTNESS[scheme]),
    );
  });
});

describe("the projections read back off the contract", () => {
  it.each(COLOR_SCHEMES)("the %s navigation theme paints contract colours", (scheme) => {
    const tokens = themeTokens(scheme);

    expect(navigationTheme(scheme).colors).toEqual({
      background: `hsl(${tokens["--background"]})`,
      border: `hsl(${tokens["--border"]})`,
      card: `hsl(${tokens["--card"]})`,
      notification: `hsl(${tokens["--destructive"]})`,
      primary: `hsl(${tokens["--primary"]})`,
      text: `hsl(${tokens["--foreground"]})`,
    });
  });

  it.each(COLOR_SCHEMES)("the %s navigation theme keeps react-navigation's own flags", (scheme) => {
    expect(navigationTheme(scheme).dark).toBe(scheme === "dark");
    expect(NAV_THEME[DEFAULT_STYLE][scheme]).toEqual(navigationTheme(scheme));
  });

  it.each(COLOR_SCHEMES)("the %s palette is every contract token as hsl()", (scheme) => {
    const palette = themePalette(scheme);

    expect(palette.background).toBe(`hsl(${themeTokens(scheme)["--background"]})`);
    expect(palette.cardForeground).toBe(`hsl(${themeTokens(scheme)["--card-foreground"]})`);
    expect(palette.primaryInk).toBe(`hsl(${themeTokens(scheme)["--primary-ink"]})`);
    expect(Object.keys(palette)).toHaveLength(THEME_VAR_NAMES.length);
    expect(THEME[scheme]).toEqual(palette);
  });

  it.each(COLOR_SCHEMES)("the %s hexes are every contract token as #rrggbb", (scheme) => {
    const hexes = themeHexes(scheme);

    expect(Object.keys(hexes).sort()).toEqual([...THEME_VAR_NAMES].sort());
    for (const name of THEME_VAR_NAMES) {
      expect({ name, hex: hexes[name] }).toEqual({
        name,
        hex: hslTripleToHex(themeTokens(scheme)[name]),
      });
      expect(hexes[name]).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(themeHex("--card", scheme)).toBe(hexes["--card"]);
  });

  // A projection has to be reachable for a (style, scheme) pair, not only for
  // the default — that is the whole point of them existing per style.
  it.each(STYLE_NAMES)("every projection is derivable for %s", (style) => {
    for (const scheme of COLOR_SCHEMES) {
      expect(themeTokens(scheme, style)).toEqual(THEME_TOKENS[style][scheme]);
      expect(navigationTheme(scheme, style).colors.primary).toBe(
        `hsl(${THEME_TOKENS[style][scheme]["--primary"]})`,
      );
      expect(themeHexes(scheme, style)["--background"]).toBe(
        hslTripleToHex(THEME_TOKENS[style][scheme]["--background"]),
      );
      expect(themePalette(scheme, style).primary).toBe(
        `hsl(${THEME_TOKENS[style][scheme]["--primary"]})`,
      );
    }
  });
});

describe("every style fills the whole contract", () => {
  it.each(STYLE_NAMES)("%s declares all 20 names in both schemes", (style) => {
    for (const scheme of COLOR_SCHEMES) {
      expect(Object.keys(THEME_TOKENS[style][scheme]).sort()).toEqual([...THEME_VAR_NAMES].sort());
      for (const name of THEME_VAR_NAMES) {
        expect({ name, value: THEME_TOKENS[style][scheme][name] }).toEqual({
          name,
          value: expect.stringMatching(/^\d+ \d+% \d+%$/),
        });
      }
    }
  });

  it("the contract is 20 names", () => {
    expect(THEME_VAR_NAMES).toHaveLength(20);
    expect(new Set(THEME_VAR_NAMES).size).toBe(20);
  });

  // deriveTokens is the path #581's palettes take; keep it wired to the same
  // contract the authored path fills.
  it("a derived style fills the same names as an authored one", () => {
    const derived = deriveTokens(
      {
        bg: "#ffffff",
        surface: "#ffffff",
        border: "#cccccc",
        ink: "#111111",
        muted: "#666666",
        accent: "#3355cc",
      },
      "light",
    );

    expect(Object.keys(derived).sort()).toEqual(
      Object.keys(THEME_TOKENS[DEFAULT_STYLE].light).sort(),
    );
  });
});

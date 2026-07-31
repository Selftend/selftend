import { hexToHslTriple, mixHex } from "./color";
import { THEME_VAR_NAMES } from "./contract";
import { DERIVED_INK_LIGHTNESS, DESTRUCTIVE, deriveTokens, type CoreHexes } from "./derive";

// A throwaway core, deliberately not one of the shipping palettes (#581 owns
// those): every channel differs so a rule that returned the wrong core hex
// cannot pass by coincidence.
const CORE: Record<"light" | "dark", CoreHexes> = {
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
};

describe("deriveTokens fills the whole contract", () => {
  it.each(["light", "dark"] as const)("%s has every contract name and nothing else", (scheme) => {
    expect(Object.keys(deriveTokens(CORE[scheme], scheme)).sort()).toEqual(
      [...THEME_VAR_NAMES].sort(),
    );
  });

  it.each(["light", "dark"] as const)("%s emits parseable HSL triples", (scheme) => {
    for (const value of Object.values(deriveTokens(CORE[scheme], scheme))) {
      expect(value).toMatch(/^\d+ \d+% \d+%$/);
    }
  });

  // --radius is a global constant, not a style token: a derived style must not
  // be able to reshape the app's controls (#555 §2).
  it.each(["light", "dark"] as const)("%s does not emit --radius", (scheme) => {
    expect(deriveTokens(CORE[scheme], scheme)).not.toHaveProperty("--radius");
  });

  // --accent-ink has no home in the contract; it is the room pour, and once
  // rooms go neutral it always equals --primary-ink (#558/#559).
  it.each(["light", "dark"] as const)("%s does not emit --accent-ink", (scheme) => {
    expect(deriveTokens(CORE[scheme], scheme)).not.toHaveProperty("--accent-ink");
  });
});

describe("the derivation rules", () => {
  it.each(["light", "dark"] as const)("%s maps the core hexes straight through", (scheme) => {
    const core = CORE[scheme];
    const tokens = deriveTokens(core, scheme);

    expect(tokens["--background"]).toBe(hexToHslTriple(core.bg));
    expect(tokens["--card"]).toBe(hexToHslTriple(core.surface));
    expect(tokens["--popover"]).toBe(hexToHslTriple(core.surface));
    expect(tokens["--border"]).toBe(hexToHslTriple(core.border));
    expect(tokens["--primary"]).toBe(hexToHslTriple(core.accent));
    expect(tokens["--muted-foreground"]).toBe(hexToHslTriple(core.muted));
  });

  it.each(["light", "dark"] as const)("%s paints every foreground in the ink", (scheme) => {
    const ink = hexToHslTriple(CORE[scheme].ink);
    const tokens = deriveTokens(CORE[scheme], scheme);

    for (const name of [
      "--foreground",
      "--card-foreground",
      "--popover-foreground",
      "--secondary-foreground",
      "--accent-foreground",
    ] as const) {
      expect({ name, value: tokens[name] }).toEqual({ name, value: ink });
    }
  });

  // The collapse #559 calls out in the open: secondary, muted and accent are one
  // alt-surface for a derived style. quiet-lilac gives all three distinct values
  // and keeps them by being hand-authored — the contract fixes the names, not a
  // requirement that they differ.
  it.each(["light", "dark"] as const)("%s collapses the alt surfaces onto one mix", (scheme) => {
    const core = CORE[scheme];
    const altSurface = hexToHslTriple(mixHex(core.bg, core.border, 0.5));
    const tokens = deriveTokens(core, scheme);

    expect(tokens["--secondary"]).toBe(altSurface);
    expect(tokens["--muted"]).toBe(altSurface);
    expect(tokens["--accent"]).toBe(altSurface);
  });

  it.each(["light", "dark"] as const)("%s firms the input outline off the border", (scheme) => {
    const core = CORE[scheme];

    expect(deriveTokens(core, scheme)["--input"]).toBe(
      hexToHslTriple(mixHex(core.border, core.ink, 0.15)),
    );
  });

  // The ring softens toward the page in light (a tint) and toward the ink in
  // dark (a lift) — a single direction leaves it invisible in one scheme.
  it("the focus ring moves toward the page in light and the ink in dark", () => {
    expect(deriveTokens(CORE.light, "light")["--ring"]).toBe(
      hexToHslTriple(mixHex(CORE.light.accent, CORE.light.bg, 0.4)),
    );
    expect(deriveTokens(CORE.dark, "dark")["--ring"]).toBe(
      hexToHslTriple(mixHex(CORE.dark.accent, CORE.dark.ink, 0.4)),
    );
  });

  it("a filled button's label is the surface in light and the page in dark", () => {
    expect(deriveTokens(CORE.light, "light")["--primary-foreground"]).toBe(
      hexToHslTriple(CORE.light.surface),
    );
    expect(deriveTokens(CORE.dark, "dark")["--primary-foreground"]).toBe(
      hexToHslTriple(CORE.dark.bg),
    );
  });

  it.each(["light", "dark"] as const)("%s shares the one destructive pair", (scheme) => {
    const tokens = deriveTokens(CORE[scheme], scheme);

    expect(tokens["--destructive"]).toBe(DESTRUCTIVE[scheme].color);
    expect(tokens["--destructive-foreground"]).toBe(DESTRUCTIVE[scheme].foreground);
  });

  // The ink keeps the accent's degree and saturation and moves only lightness,
  // so it still reads as the style's accent rather than as near-black. Whether
  // the two constants are *sufficient* for a given palette is #560's gate, not
  // this rule.
  it.each(["light", "dark"] as const)("%s ink is the accent at the recipe lightness", (scheme) => {
    const [degree, saturation] = hexToHslTriple(CORE[scheme].accent).split(" ");

    expect(deriveTokens(CORE[scheme], scheme)["--primary-ink"]).toBe(
      `${degree} ${saturation} ${DERIVED_INK_LIGHTNESS[scheme]}%`,
    );
  });
});

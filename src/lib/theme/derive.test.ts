import { hexToHslTriple, mixHex, parseHslTriple } from "./color";
import { THEME_VAR_NAMES } from "./contract";
import { AA_TEXT, contrastRatio, solveInk, tripleToRgb } from "./contrast";
import { DESTRUCTIVE, deriveTokens, type CoreHexes } from "./derive";

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

  // --accent-ink has no home in the contract; it was the room pour, and with
  // rooms neutral (then deleted, #1292) it would only ever have equalled
  // --primary-ink (#558/#559).
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

  // Not "surface in light, background in dark" — that rule is what fails
  // amber-noir's gold. The label is whichever candidate measures best on the
  // accent, and it must clear AA.
  it.each(["light", "dark"] as const)("%s picks the button label by measurement", (scheme) => {
    const tokens = deriveTokens(CORE[scheme], scheme);
    const accent = tripleToRgb(tokens["--primary"]);
    const chosen = contrastRatio(tripleToRgb(tokens["--primary-foreground"]), accent);

    for (const candidate of [CORE[scheme].ink, CORE[scheme].surface, CORE[scheme].bg]) {
      expect(chosen).toBeGreaterThanOrEqual(
        contrastRatio(tripleToRgb(hexToHslTriple(candidate)), accent),
      );
    }
    expect(chosen).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(["light", "dark"] as const)("%s shares the one destructive pair", (scheme) => {
    const tokens = deriveTokens(CORE[scheme], scheme);

    expect(tokens["--destructive"]).toBe(DESTRUCTIVE[scheme].color);
    expect(tokens["--destructive-foreground"]).toBe(DESTRUCTIVE[scheme].foreground);
  });

  // The ink keeps the accent's degree and saturation and moves only lightness,
  // so it still reads as the style's accent rather than as near-black. WHERE it
  // stops is measured (see solveInk), not a constant — the fixed 28/80 recipe
  // failed five of sixteen (style, scheme) pairs.
  it.each(["light", "dark"] as const)("%s ink is the accent, moved only in L", (scheme) => {
    const accent = hexToHslTriple(CORE[scheme].accent);
    const [degree, saturation] = accent.split(" ");

    expect(deriveTokens(CORE[scheme], scheme)["--primary-ink"]).toBe(
      `${degree} ${saturation} ${parseHslTriple(deriveTokens(CORE[scheme], scheme)["--primary-ink"])[2]}%`,
    );
    expect(deriveTokens(CORE[scheme], scheme)["--primary-ink"]).toBe(
      solveInk(
        accent,
        {
          background: hexToHslTriple(CORE[scheme].bg),
          card: hexToHslTriple(CORE[scheme].surface),
        },
        scheme,
      ),
    );
  });

  it.each(["light", "dark"] as const)("%s ink moves the right way off the accent", (scheme) => {
    const accentL = parseHslTriple(hexToHslTriple(CORE[scheme].accent))[2];
    const inkL = parseHslTriple(deriveTokens(CORE[scheme], scheme)["--primary-ink"])[2];

    // Darker in light, lighter in dark — an ink that moved the other way would
    // still clear the floor on some palettes and read as the wrong depth.
    expect(scheme === "light" ? inkL <= accentL : inkL >= accentL).toBe(true);
  });
});

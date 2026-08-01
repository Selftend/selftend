import { hexToHslTriple, parseHslTriple } from "./color";
import {
  AA_TEXT,
  auditTokens,
  compositeOver,
  contrastRatio,
  INK_TARGET,
  inkSurfaces,
  pickPrimaryForeground,
  relativeLuminance,
  solveInk,
  tripleToRgb,
  worstAgainst,
} from "./contrast";
import { deriveTokens, type CoreHexes } from "./derive";
import { THEME_TOKENS } from "./styles";

// amber-noir, verbatim from the palette brief. It is the palette #560 measured
// failing on its button label (white on gold, 4.43), so it is the honest fixture
// for the two things this module decides.
const AMBER_NOIR_LIGHT: CoreHexes = {
  bg: "#f7f4ec",
  surface: "#ffffff",
  border: "#e4ddcf",
  ink: "#1c1a17",
  muted: "#6f685c",
  accent: "#a06e14",
};

describe("the contrast primitives", () => {
  it("puts black and white at WCAG's 21:1", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
  });

  it("puts a colour against itself at 1:1", () => {
    expect(contrastRatio([124, 77, 219], [124, 77, 219])).toBeCloseTo(1, 5);
  });

  it("is symmetric — the order of the pair cannot change the answer", () => {
    const a: [number, number, number] = [20, 140, 90];
    const b: [number, number, number] = [240, 240, 250];

    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });

  // The mechanism behind the whole ticket: at equal RGB magnitude green carries
  // an order of magnitude more luminance than blue (0.7152 vs 0.0722), which is
  // why one HSL lightness constant cannot serve a teal and a violet alike.
  it("weighs green far above blue, which is why a fixed lightness fails", () => {
    expect(relativeLuminance([0, 255, 0])).toBeGreaterThan(relativeLuminance([0, 0, 255]) * 5);
  });

  it("composites an alpha wash between its endpoints", () => {
    expect(compositeOver([255, 255, 255], 0.5, [0, 0, 0])).toEqual([127.5, 127.5, 127.5]);
    expect(compositeOver([10, 20, 30], 1, [200, 200, 200])).toEqual([10, 20, 30]);
    expect(compositeOver([10, 20, 30], 0, [200, 200, 200])).toEqual([200, 200, 200]);
  });

  it("reports the worst surface, not just the worst number", () => {
    const worst = worstAgainst(tripleToRgb("0 0% 50%"), [
      { where: "easy", rgb: [0, 0, 0] },
      { where: "hard", rgb: [128, 128, 128] },
    ]);

    expect(worst.where).toBe("hard");
  });
});

describe("the four binding surfaces", () => {
  const surfaces = inkSurfaces("262 62% 56%", "260 28% 96%", "260 28% 99%");

  it("are the page, the card, a chip, and a chip inside a tinted card", () => {
    expect(surfaces.map((s) => s.where)).toEqual([
      "background",
      "card",
      "chip (accent/15 on card)",
      "nested chip (accent/15 on accent/15 on card)",
    ]);
  });

  // Each wash pulls the surface toward the very colour the ink is drawn in, so
  // contrast falls monotonically as the stack deepens. The nested chip is the
  // binding case, and a three-surface solver would miss it — that is exactly how
  // 76% once certified an ink that still read 4.33 in the app.
  it("get harder as the wash stacks, so the nested chip binds", () => {
    const ink = tripleToRgb("262 62% 28%");
    const ratios = surfaces.slice(1).map((s) => contrastRatio(ink, s.rgb));

    expect(ratios[1]).toBeLessThan(ratios[0]);
    expect(ratios[2]).toBeLessThan(ratios[1]);
  });
});

describe("solveInk", () => {
  const neutrals = { background: "260 28% 96%", card: "260 28% 99%" };

  it("keeps the accent's degree and saturation and moves only lightness", () => {
    const solved = solveInk("262 62% 56%", neutrals, "light");
    const [degree, saturation] = parseHslTriple(solved);

    expect([degree, saturation]).toEqual([262, 62]);
  });

  it("clears the target on all four surfaces", () => {
    const accent = hexToHslTriple(AMBER_NOIR_LIGHT.accent);
    const light = {
      background: hexToHslTriple(AMBER_NOIR_LIGHT.bg),
      card: hexToHslTriple(AMBER_NOIR_LIGHT.surface),
    };
    const solved = solveInk(accent, light, "light");

    expect(
      worstAgainst(tripleToRgb(solved), inkSurfaces(accent, light.background, light.card)).ratio,
    ).toBeGreaterThanOrEqual(INK_TARGET);
  });

  // "Smallest move" is the half of the rule that keeps the ink recognisable: an
  // ink darkened past what it needs reads as near-black, which meets any floor
  // by throwing the colour away.
  it("stops at the first lightness that clears, not a step beyond", () => {
    const accent = "262 62% 56%";
    const solved = solveInk(accent, neutrals, "light");
    const [, , lightness] = parseHslTriple(solved);
    const oneStepLighter = tripleToRgb(`262 62% ${lightness + 1}%`);

    expect(
      worstAgainst(oneStepLighter, inkSurfaces(accent, neutrals.background, neutrals.card)).ratio,
    ).toBeLessThan(INK_TARGET);
  });

  it("darkens in light and lightens in dark", () => {
    const darkNeutrals = { background: "260 20% 9%", card: "260 16% 16%" };

    expect(parseHslTriple(solveInk("262 62% 56%", neutrals, "light"))[2]).toBeLessThanOrEqual(56);
    expect(parseHslTriple(solveInk("264 72% 72%", darkNeutrals, "dark"))[2]).toBeGreaterThanOrEqual(
      72,
    );
  });

  // Ruling 4 of #560: no experimental escape, no per-style exemption. The only
  // thing an escape could buy is shipping a palette nobody re-measured, so a
  // style that cannot solve fails the build.
  it("throws rather than returning an illegible ink", () => {
    expect(() =>
      solveInk("0 0% 50%", { background: "0 0% 50%", card: "0 0% 50%" }, "light", 21),
    ).toThrow(/clears 21/);
  });
});

describe("pickPrimaryForeground", () => {
  // The failure that killed the scheme-based rule. White on amber-noir's gold is
  // 4.43 — below AA — so "light scheme → surface" ships an illegible button.
  it("rejects white on amber-noir's gold, which the scheme rule would have picked", () => {
    const accent = hexToHslTriple(AMBER_NOIR_LIGHT.accent);
    const white = "0 0% 100%";
    const chosen = pickPrimaryForeground(accent, [
      hexToHslTriple(AMBER_NOIR_LIGHT.ink),
      hexToHslTriple(AMBER_NOIR_LIGHT.surface),
      hexToHslTriple(AMBER_NOIR_LIGHT.bg),
    ]);

    expect(contrastRatio(tripleToRgb(white), tripleToRgb(accent))).toBeLessThan(AA_TEXT);
    expect(chosen).not.toBe(white);
    expect(contrastRatio(tripleToRgb(chosen), tripleToRgb(accent))).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("picks the best of the legible candidates offered", () => {
    const accent = "0 0% 50%";
    const legible = ["0 0% 5%", "0 0% 12%"];
    const chosen = pickPrimaryForeground(accent, [...legible, "0 0% 45%"]);
    const chosenRatio = contrastRatio(tripleToRgb(chosen), tripleToRgb(accent));

    for (const candidate of legible) {
      expect(chosenRatio).toBeGreaterThanOrEqual(
        contrastRatio(tripleToRgb(candidate), tripleToRgb(accent)),
      );
    }
  });

  // The ordering that keeps buttons in-palette. Maximising contrast outright
  // would hand every dark palette a pure-black label, because black beats the
  // style's own near-black on any light accent — legible, and off the palette on
  // every button in the app.
  it("prefers the style's own neutral over pure black when both are legible", () => {
    const ownNearBlack = "260 22% 12%";
    const chosen = pickPrimaryForeground("264 72% 72%", [ownNearBlack]);

    expect(chosen).toBe(ownNearBlack);
    expect(contrastRatio(tripleToRgb("0 0% 0%"), tripleToRgb("264 72% 72%"))).toBeGreaterThan(
      contrastRatio(tripleToRgb(ownNearBlack), tripleToRgb("264 72% 72%")),
    );
  });

  // Black and white ride along as fallbacks so a style whose own neutrals are
  // all mid-tone still has something legible to reach for.
  it("falls back to black or white when every candidate is mid-tone", () => {
    expect(pickPrimaryForeground("0 0% 50%", ["0 0% 48%", "0 0% 52%"])).toMatch(/^0 0% (0|100)%$/);
  });
});

describe("auditTokens", () => {
  it("finds nothing wrong with a style that passes", () => {
    expect(auditTokens(THEME_TOKENS["quiet-lilac"].light)).toEqual([]);
    expect(auditTokens(THEME_TOKENS["quiet-lilac"].dark)).toEqual([]);
  });

  it("finds nothing wrong with a derived style, because it was solved", () => {
    expect(auditTokens(deriveTokens(AMBER_NOIR_LIGHT, "light"), INK_TARGET)).toEqual([]);
  });

  // The gate has to be seen failing to be worth anything. Each of these breaks
  // exactly one pairing and leaves the rest alone, so the finding names the
  // surface that moved rather than the whole palette.
  it("names the ink when the ink is the raw accent", () => {
    const broken = { ...THEME_TOKENS["quiet-lilac"].light, "--primary-ink": "262 62% 56%" };
    const findings = auditTokens(broken);

    expect(findings.map((f) => f.check)).toEqual(["primary ink"]);
    expect(findings[0].ratio).toBeLessThan(AA_TEXT);
  });

  it("names the button label when the label cannot sit on the accent", () => {
    const broken = {
      ...THEME_TOKENS["quiet-lilac"].light,
      "--primary-foreground": "262 62% 60%",
    };

    expect(auditTokens(broken).map((f) => f.check)).toEqual(["button label"]);
  });

  it("names muted ink when the secondary text washes out", () => {
    const broken = { ...THEME_TOKENS["quiet-lilac"].light, "--muted-foreground": "260 8% 80%" };

    expect(auditTokens(broken).map((f) => f.check)).toEqual(["muted ink"]);
  });

  it("names the mark when the accent is too light to read as one", () => {
    // think's gold, the tint that measures 1.88 on the bare app background.
    const broken = {
      ...THEME_TOKENS["quiet-lilac"].light,
      "--primary": "43 74% 52%",
      "--primary-ink": "43 74% 28%",
      "--primary-foreground": "0 0% 0%",
    };

    expect(auditTokens(broken).map((f) => f.check)).toContain("accent as a mark");
  });
});

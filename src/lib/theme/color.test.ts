import {
  hexToHslTriple,
  hexToRgb,
  hslTripleToHex,
  mixHex,
  parseHslTriple,
  rgbToHex,
  withLightness,
} from "./color";

describe("hex parsing", () => {
  it("reads a hex with or without the leading #", () => {
    expect(hexToRgb("#7c4ddb")).toEqual([124, 77, 219]);
    expect(hexToRgb("7c4ddb")).toEqual([124, 77, 219]);
  });

  it.each(["#fff", "#gggggg", "", "rgb(1,2,3)"])("rejects %s rather than guessing", (bad) => {
    expect(() => hexToRgb(bad)).toThrow(/Unparseable hex/);
  });

  it("pads single-digit channels back to two", () => {
    expect(rgbToHex([0, 8, 255])).toBe("#0008ff");
  });
});

describe("mixHex", () => {
  it("returns the endpoints at t=0 and t=1", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
  });

  it("mixes linearly in RGB", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#204060", "#608040", 0.5)).toBe("#406050");
  });
});

describe("triple <-> hex", () => {
  // The surface tokens the app's hex mirrors are read off. Each round-trips
  // exactly, which is why lib/theme.ts can derive CARD_COLOR/POPOVER_COLOR
  // instead of hand-maintaining them.
  it.each([
    ["260 28% 99%", "#fcfcfd"],
    ["260 16% 16%", "#27222f"],
    ["260 18% 13%", "#1f1b27"],
    ["0 0% 100%", "#ffffff"],
    ["0 0% 0%", "#000000"],
  ])("%s → %s", (triple, hex) => {
    expect(hslTripleToHex(triple)).toBe(hex);
  });

  // Every 60-degree sector of the hue wheel, so no branch of the piecewise
  // conversion can be wrong in only one direction.
  it.each(["0 72% 48%", "43 74% 52%", "160 46% 38%", "196 52% 36%", "262 62% 56%", "330 56% 47%"])(
    "%s survives a hex round-trip",
    (triple) => {
      expect(hexToHslTriple(hslTripleToHex(triple))).toBe(triple);
    },
  );

  it("reports a grey as zero-saturation rather than an arbitrary degree", () => {
    expect(hexToHslTriple("#808080")).toBe("0 0% 50%");
  });

  // hexToHslTriple normalises to [0, 360), but a hand-authored block may spell
  // red as "360" — untreated it falls past every sector into magenta.
  it("wraps a 360-degree hue onto red rather than magenta", () => {
    expect(hslTripleToHex("360 72% 48%")).toBe(hslTripleToHex("0 72% 48%"));
  });

  it.each(["262 62 56%", "262 62% 56", "not a triple", ""])("rejects %s", (bad) => {
    expect(() => parseHslTriple(bad)).toThrow(/Unparseable HSL triple/);
  });
});

describe("withLightness", () => {
  it("keeps degree and saturation and moves only lightness", () => {
    expect(withLightness("262 62% 56%", 28)).toBe("262 62% 28%");
    expect(withLightness("264 72% 72%", 80)).toBe("264 72% 80%");
  });
});

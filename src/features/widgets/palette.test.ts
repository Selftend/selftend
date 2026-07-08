import {
  PALETTE,
  TINTS,
  type TintName,
  withAlpha,
  effectiveThemes,
} from "@/src/features/widgets/palette";

describe("withAlpha", () => {
  it("appends the alpha channel (#RRGGBBAA)", () => {
    expect(withAlpha("#F4EFE5", 1)).toBe("#F4EFE5ff");
    expect(withAlpha("#F4EFE5", 0)).toBe("#F4EFE500");
    expect(withAlpha("#000000", 0.5)).toBe("#00000080");
  });
});

describe("effectiveThemes", () => {
  it("forced theme → single", () => {
    expect(effectiveThemes("light", "dark")).toEqual(["light"]);
    expect(effectiveThemes("dark", "system")).toEqual(["dark"]);
  });
  it("app pref → follows the app (both when system)", () => {
    expect(effectiveThemes("app", "system")).toEqual(["light", "dark"]);
    expect(effectiveThemes("app", "light")).toEqual(["light"]);
    expect(effectiveThemes("app", "dark")).toEqual(["dark"]);
  });
});

describe("TINTS", () => {
  const names: TintName[] = ["primary", "act", "be", "aqua", "think", "iris", "ink", "clay"];
  it("defines every tint for both themes as #RRGGBB", () => {
    for (const theme of ["light", "dark"] as const) {
      for (const n of names) {
        expect(TINTS[theme][n]).toMatch(/^#[0-9A-F]{6}$/i);
      }
    }
  });
  it("primary matches the app accent", () => {
    expect(TINTS.light.primary).toBe(PALETTE.light.accent);
    expect(TINTS.dark.primary).toBe(PALETTE.dark.accent);
  });
  it("adds border and mutedBg neutrals", () => {
    expect(PALETTE.light.border).toMatch(/^#[0-9A-F]{6}$/i);
    expect(PALETTE.dark.mutedBg).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

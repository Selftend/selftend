import { withAlpha, effectiveThemes } from "@/src/features/widgets/palette";

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

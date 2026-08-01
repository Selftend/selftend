import { renderHook } from "@testing-library/react-native";

import { THEME_PALETTES } from "@/lib/theme";
import { HUE_NAMES } from "@/src/lib/design-tokens";
import { useRoomCardHsl, useRoomStyle } from "@/src/lib/use-room-style";
import { DEFAULT_STYLE } from "@/src/lib/theme/styles";
import { useStyleStore } from "@/src/stores/style-store";
import { useThemeStore } from "@/src/stores/theme-store";
import { carriesNoPour } from "@/test/room-pour";

// Rooms are neutral (#586). This file used to assert the opposite — that each
// hue got its own distinct pour — and those assertions are deliberately gone
// rather than weakened: the pour they described is the behaviour this ticket
// removes. What replaces them is the stronger claim, that NO hue pours anything.
//
// The scheme is driven the way the app drives it, from both ends: the theme
// store's preference and react-native's useColorScheme. nativewind stays real,
// and the pour is read through pouredVariables (test/room-pour.ts) rather than
// by comparing style objects — a nativewind vars() style has no enumerable
// keys, so a direct toEqual passes for every input and once let this file claim
// per-hue coverage it never had (#389).
const mockUseColorScheme = jest.spyOn(require("react-native"), "useColorScheme");

/** Drive the scheme the way the app does: preference "system", OS decides. */
const setOsScheme = (scheme: "light" | "dark" | null) => {
  useThemeStore.setState({ preference: "system", hydrated: true });
  mockUseColorScheme.mockReturnValue(scheme);
};

afterEach(() => {
  // These drive the real stores, so put them back rather than leaving the next
  // test to depend on its own setup running first.
  useThemeStore.setState({ preference: "system", hydrated: false });
  useStyleStore.setState({ style: DEFAULT_STYLE, hydrated: false });
});

afterAll(() => {
  mockUseColorScheme.mockRestore();
});

describe("useRoomStyle no longer pours a room", () => {
  // The ruling in one assertion per hue: a module screen keeps the app's own
  // surfaces. Module identity is icon and label, not colour.
  it.each(HUE_NAMES)("%s overrides nothing", (hue) => {
    setOsScheme("light");

    expect(carriesNoPour(renderHook(() => useRoomStyle(hue)).result.current)).toBe(true);
  });

  it.each(["light", "dark"] as const)("overrides nothing in %s either", (scheme) => {
    setOsScheme(scheme);

    expect(carriesNoPour(renderHook(() => useRoomStyle("be")).result.current)).toBe(true);
  });

  // The old contract's most load-bearing property, kept: screens apply this as a
  // root `style`, so a fresh object per render would invalidate every memoized
  // subtree beneath them.
  it("hands back one identity-stable object, whatever the hue", () => {
    setOsScheme("light");

    const styles = HUE_NAMES.map((hue) => renderHook(() => useRoomStyle(hue)).result.current);

    expect(new Set(styles).size).toBe(1);
  });
});

describe("useRoomCardHsl is the app's card, not a hue's", () => {
  const commaForm = (style: keyof typeof THEME_PALETTES, scheme: "light" | "dark") =>
    THEME_PALETTES[style][scheme].card.replace(
      /hsl\(([^)]*)\)/,
      (_match, triple: string) => `hsl(${triple.split(/\s+/).join(", ")})`,
    );

  it.each(HUE_NAMES)("%s fades to the app card, not a room card", (hue) => {
    setOsScheme("light");

    expect(renderHook(() => useRoomCardHsl(hue)).result.current).toBe(
      commaForm(DEFAULT_STYLE, "light"),
    );
  });

  it.each(["light", "dark"] as const)("follows the %s scheme", (scheme) => {
    setOsScheme(scheme);

    expect(renderHook(() => useRoomCardHsl("be")).result.current).toBe(
      commaForm(DEFAULT_STYLE, scheme),
    );
  });

  // Something the room pour could never do. It derived the fade from a HUE, so
  // under deep-field or amber-noir a gratitude card would still have faded to a
  // lilac-era violet-tinted surface. Neutralising it is also what makes it
  // follow the style axis.
  it("follows the active palette, which the hue pour never could", () => {
    setOsScheme("light");
    useStyleStore.setState({ style: "deep-field", hydrated: true });

    const { result } = renderHook(() => useRoomCardHsl("think"));

    expect(result.current).toBe(commaForm("deep-field", "light"));
    expect(result.current).not.toBe(commaForm(DEFAULT_STYLE, "light"));
  });

  it("emits the comma form a LinearGradient can consume", () => {
    setOsScheme("light");

    expect(renderHook(() => useRoomCardHsl("act")).result.current).toMatch(
      /^hsl\(\d+, \d+%, \d+%\)$/,
    );
  });

  it("falls back to the light card when the OS reports no scheme", () => {
    setOsScheme(null);

    expect(renderHook(() => useRoomCardHsl("be")).result.current).toBe(
      commaForm(DEFAULT_STYLE, "light"),
    );
  });
});

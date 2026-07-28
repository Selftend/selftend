import { renderHook } from "@testing-library/react-native";

import { roomCardHsl } from "@/src/lib/module-room";
import { useRoomCardHsl, useRoomStyle } from "@/src/lib/use-room-style";
import { useThemeStore } from "@/src/stores/theme-store";
import { expectedRoomVariables, pouredVariables } from "@/test/room-pour";

// These helpers now read the house reader (useColorSchemeName), which resolves
// the theme store's preference against the OS. So the scheme is driven from
// both ends here — the store's preference and react-native's useColorScheme —
// rather than by stubbing nativewind's hook. nativewind itself stays real:
// roomVariables builds styles through its vars().
//
// The pour assertions go through pouredVariables (test/room-pour.ts) rather
// than comparing style objects directly: a nativewind vars() style has no
// enumerable keys, so `toEqual(roomVariables(hue).light)` passed for every
// hue and this file's it.each claimed per-hue coverage it never had (#389).
const mockUseColorScheme = jest.spyOn(require("react-native"), "useColorScheme");

/** Drive the scheme the way the app does: preference "system", OS decides. */
const setOsScheme = (scheme: "light" | "dark" | null) => {
  useThemeStore.setState({ preference: "system", hydrated: true });
  mockUseColorScheme.mockReturnValue(scheme);
};

afterEach(() => {
  // These drive the real store, so put it back rather than leaving the next
  // test to depend on its own setOsScheme call running first.
  useThemeStore.setState({ preference: "system", hydrated: false });
});

afterAll(() => {
  mockUseColorScheme.mockRestore();
});

const ROOM_HUES = ["be", "ink", "think", "act", "aqua", "clay", "iris"] as const;

describe("useRoomStyle", () => {
  it.each(ROOM_HUES)("returns the %s pour for the active scheme", (hue) => {
    setOsScheme("light");
    expect(pouredVariables(renderHook(() => useRoomStyle(hue)).result.current)).toEqual(
      expectedRoomVariables(hue, "light"),
    );

    setOsScheme("dark");
    expect(pouredVariables(renderHook(() => useRoomStyle(hue)).result.current)).toEqual(
      expectedRoomVariables(hue, "dark"),
    );
  });

  it("hands every hue a distinct pour, so no two rooms are interchangeable", () => {
    // The positive form of the it.each above: it is not enough that each hue
    // matches its own recipe — the pours must actually differ, or a suite
    // asserting "iris" would be satisfied by "act" (#389).
    setOsScheme("light");
    const styles = ROOM_HUES.map((hue) => renderHook(() => useRoomStyle(hue)).result.current);

    const fingerprints = styles.map((style) => JSON.stringify(pouredVariables(style)));
    expect(new Set(fingerprints).size).toBe(ROOM_HUES.length);
    // Distinct objects too — the cache must not alias two hues onto one pour.
    expect(new Set(styles).size).toBe(ROOM_HUES.length);
  });

  it("returns an identity-stable style across calls (module-const guarantee)", () => {
    setOsScheme("light");
    const first = renderHook(() => useRoomStyle("be")).result.current;
    const second = renderHook(() => useRoomStyle("be")).result.current;
    expect(second).toBe(first);
  });

  it("falls back to the light pour when the OS reports no scheme", () => {
    // Was "when the scheme is undefined" — nativewind's hook returned
    // `string | undefined`. The house reader is never undefined, so the same
    // guarantee is now pinned at its real source: an OS that reports nothing
    // resolves to light, and the light pour follows.
    setOsScheme(null);
    expect(pouredVariables(renderHook(() => useRoomStyle("ink")).result.current)).toEqual(
      expectedRoomVariables("ink", "light"),
    );
  });

  it("follows an explicit preference over the OS", () => {
    mockUseColorScheme.mockReturnValue("light");
    useThemeStore.setState({ preference: "dark", hydrated: true });

    expect(pouredVariables(renderHook(() => useRoomStyle("act")).result.current)).toEqual(
      expectedRoomVariables("act", "dark"),
    );
  });
});

describe("useRoomCardHsl", () => {
  it.each(ROOM_HUES)("returns the %s card surface for the active scheme", (hue) => {
    setOsScheme("light");
    expect(renderHook(() => useRoomCardHsl(hue)).result.current).toBe(roomCardHsl(hue).light);

    setOsScheme("dark");
    expect(renderHook(() => useRoomCardHsl(hue)).result.current).toBe(roomCardHsl(hue).dark);
  });
});

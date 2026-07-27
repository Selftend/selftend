import { renderHook } from "@testing-library/react-native";

import { roomCardHsl, roomVariables } from "@/src/lib/module-room";
import { useRoomCardHsl, useRoomStyle } from "@/src/lib/use-room-style";
import { useThemeStore } from "@/src/stores/theme-store";

// These helpers now read the house reader (useColorSchemeName), which resolves
// the theme store's preference against the OS. So the scheme is driven from
// both ends here — the store's preference and react-native's useColorScheme —
// rather than by stubbing nativewind's hook. nativewind itself stays real:
// roomVariables builds styles through its vars().
const mockUseColorScheme = jest.spyOn(require("react-native"), "useColorScheme");

/** Drive the scheme the way the app does: preference "system", OS decides. */
const setOsScheme = (scheme: "light" | "dark" | null) => {
  useThemeStore.setState({ preference: "system", hydrated: true });
  mockUseColorScheme.mockReturnValue(scheme);
};

afterAll(() => {
  mockUseColorScheme.mockRestore();
});

const ROOM_HUES = ["be", "ink", "think", "act", "aqua", "clay", "iris"] as const;

describe("useRoomStyle", () => {
  it.each(ROOM_HUES)("returns the %s pour for the active scheme", (hue) => {
    setOsScheme("light");
    expect(renderHook(() => useRoomStyle(hue)).result.current).toEqual(roomVariables(hue).light);

    setOsScheme("dark");
    expect(renderHook(() => useRoomStyle(hue)).result.current).toEqual(roomVariables(hue).dark);
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
    expect(renderHook(() => useRoomStyle("ink")).result.current).toEqual(
      roomVariables("ink").light,
    );
  });

  it("follows an explicit preference over the OS", () => {
    mockUseColorScheme.mockReturnValue("light");
    useThemeStore.setState({ preference: "dark", hydrated: true });

    expect(renderHook(() => useRoomStyle("act")).result.current).toEqual(roomVariables("act").dark);
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

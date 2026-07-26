import { renderHook } from "@testing-library/react-native";

import { useColorScheme } from "nativewind";

import { roomCardHsl, roomVariables } from "@/src/lib/module-room";
import { useRoomCardHsl, useRoomStyle } from "@/src/lib/use-room-style";

jest.mock("nativewind", () => ({
  useColorScheme: jest.fn(() => ({ colorScheme: "light" })),
  // roomVariables builds styles through nativewind's vars(); keep the real one.
  vars: jest.requireActual("nativewind").vars,
}));

const mockUseColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;

const setScheme = (scheme: "light" | "dark" | undefined) =>
  mockUseColorScheme.mockReturnValue({ colorScheme: scheme } as ReturnType<typeof useColorScheme>);

const ROOM_HUES = ["be", "ink", "think", "act", "aqua"] as const;

describe("useRoomStyle", () => {
  it.each(ROOM_HUES)("returns the %s pour for the active scheme", (hue) => {
    setScheme("light");
    expect(renderHook(() => useRoomStyle(hue)).result.current).toEqual(roomVariables(hue).light);

    setScheme("dark");
    expect(renderHook(() => useRoomStyle(hue)).result.current).toEqual(roomVariables(hue).dark);
  });

  it("returns an identity-stable style across calls (module-const guarantee)", () => {
    setScheme("light");
    const first = renderHook(() => useRoomStyle("be")).result.current;
    const second = renderHook(() => useRoomStyle("be")).result.current;
    expect(second).toBe(first);
  });

  it("falls back to the light pour when the scheme is undefined", () => {
    setScheme(undefined);
    expect(renderHook(() => useRoomStyle("ink")).result.current).toEqual(
      roomVariables("ink").light,
    );
  });
});

describe("useRoomCardHsl", () => {
  it.each(ROOM_HUES)("returns the %s card surface for the active scheme", (hue) => {
    setScheme("light");
    expect(renderHook(() => useRoomCardHsl(hue)).result.current).toBe(roomCardHsl(hue).light);

    setScheme("dark");
    expect(renderHook(() => useRoomCardHsl(hue)).result.current).toBe(roomCardHsl(hue).dark);
  });
});

/**
 * Tests for useAppColorScheme.
 *
 * Key behaviors under test:
 * - On web: nativewind.colorScheme.set receives the RESOLVED value
 * - On native: nativewind.colorScheme.set receives the RAW PREFERENCE (so
 *   "system" clears any prior Appearance override)
 * - The hook always returns the resolved scheme
 * - hydrate() is called on mount
 *
 * Source reads: `useColorScheme` from react-native (NOT nativewind).
 * nativewind only provides `colorScheme.set`.
 */

import { renderHook } from "@testing-library/react-native";
import { Platform, useColorScheme } from "react-native";

// ---------------------------------------------------------------------------
// Imports after mock registration
// ---------------------------------------------------------------------------

import { colorScheme as nwColorScheme } from "nativewind";
import { useThemeStore } from "@/src/stores/theme-store";
import { useAppColorScheme } from "@/src/lib/color-scheme";

// ---------------------------------------------------------------------------
// Mock nativewind — only colorScheme.set is used by the source
// ---------------------------------------------------------------------------

jest.mock("nativewind", () => ({
  colorScheme: { set: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Mock theme store
// ---------------------------------------------------------------------------

jest.mock("@/src/stores/theme-store", () => ({
  useThemeStore: jest.fn(),
}));

const mockNwSet = nwColorScheme.set as jest.Mock;
const mockUseThemeStore = useThemeStore as unknown as jest.Mock;
// react-native's useColorScheme is provided by jest-expo — mock it via spyOn
const mockUseColorScheme = jest.spyOn(require("react-native"), "useColorScheme");

const mockHydrate = jest.fn().mockResolvedValue(undefined);

function setupStore(preference: "light" | "dark" | "system") {
  mockUseThemeStore.mockImplementation(
    (selector: (s: { preference: string; hydrate: () => Promise<void> }) => unknown) =>
      selector({ preference, hydrate: mockHydrate }),
  );
}

// ---------------------------------------------------------------------------

describe("useAppColorScheme — web (Platform.OS = web)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrate.mockResolvedValue(undefined);
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  });

  it("passes RESOLVED value to nativewind.set on web (system + dark OS = dark)", () => {
    setupStore("system");
    mockUseColorScheme.mockReturnValue("dark");

    renderHook(() => useAppColorScheme());

    expect(mockNwSet).toHaveBeenCalledWith("dark");
  });

  it("passes RESOLVED value to nativewind.set on web (system + light OS = light)", () => {
    setupStore("system");
    mockUseColorScheme.mockReturnValue("light");

    renderHook(() => useAppColorScheme());

    expect(mockNwSet).toHaveBeenCalledWith("light");
  });

  it("passes RESOLVED explicit preference on web (dark pref + light OS = dark)", () => {
    setupStore("dark");
    mockUseColorScheme.mockReturnValue("light");

    renderHook(() => useAppColorScheme());

    expect(mockNwSet).toHaveBeenCalledWith("dark");
  });

  it("returns the resolved color scheme", () => {
    setupStore("system");
    mockUseColorScheme.mockReturnValue("dark");

    const { result } = renderHook(() => useAppColorScheme());

    expect(result.current).toBe("dark");
  });

  it("calls hydrate on mount", () => {
    setupStore("system");
    mockUseColorScheme.mockReturnValue("light");

    renderHook(() => useAppColorScheme());

    expect(mockHydrate).toHaveBeenCalled();
  });
});

describe("useAppColorScheme — native (Platform.OS = ios)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrate.mockResolvedValue(undefined);
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  });

  it("passes PREFERENCE (not resolved) to nativewind.set on native — system", () => {
    setupStore("system");
    mockUseColorScheme.mockReturnValue("dark");

    renderHook(() => useAppColorScheme());

    // Source: `nwColorScheme.set(Platform.OS === "web" ? resolved : preference)`
    expect(mockNwSet).toHaveBeenCalledWith("system");
  });

  it("passes PREFERENCE to nativewind.set on native — explicit dark", () => {
    setupStore("dark");
    mockUseColorScheme.mockReturnValue("light");

    renderHook(() => useAppColorScheme());

    expect(mockNwSet).toHaveBeenCalledWith("dark");
  });

  it("passes PREFERENCE to nativewind.set on native — explicit light", () => {
    setupStore("light");
    mockUseColorScheme.mockReturnValue("dark");

    renderHook(() => useAppColorScheme());

    expect(mockNwSet).toHaveBeenCalledWith("light");
  });

  it("returns the resolved scheme (explicit preference wins)", () => {
    setupStore("light");
    mockUseColorScheme.mockReturnValue("dark");

    const { result } = renderHook(() => useAppColorScheme());

    expect(result.current).toBe("light");
  });

  it("returns dark when OS is dark and preference is system", () => {
    setupStore("system");
    mockUseColorScheme.mockReturnValue("dark");

    const { result } = renderHook(() => useAppColorScheme());

    expect(result.current).toBe("dark");
  });

  it("returns light when OS returns null (falsy) and preference is system", () => {
    setupStore("system");
    mockUseColorScheme.mockReturnValue(null);

    const { result } = renderHook(() => useAppColorScheme());

    // Source: `useColorScheme() === "dark" ? "dark" : "light"` — null → "light"
    expect(result.current).toBe("light");
  });
});

/**
 * Tests for the colour-scheme seam, split along its two responsibilities.
 *
 * `useColorSchemeName` is the READER — pure, callable anywhere, any number of
 * times. Key behaviors under test:
 * - It returns the resolved scheme ("system" falls back to the OS)
 * - It never returns undefined
 * - It performs no writes and no hydrate
 *
 * `useColorSchemeDriver` is the DRIVER — called once, at the app root. Key
 * behaviors under test:
 * - On web: nativewind.colorScheme.set receives the RESOLVED value
 * - On native: nativewind.colorScheme.set receives the RAW PREFERENCE (so
 *   "system" clears any prior Appearance override)
 * - hydrate() is called on mount
 *
 * Source reads: `useColorScheme` from react-native (NOT nativewind).
 * nativewind only provides `colorScheme.set`.
 */

import { renderHook } from "@testing-library/react-native";
import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Imports after mock registration
// ---------------------------------------------------------------------------

import { colorScheme as nwColorScheme } from "nativewind";
import { useThemeStore } from "@/src/stores/theme-store";
import { useColorSchemeDriver, useColorSchemeName } from "@/src/lib/color-scheme";

// ---------------------------------------------------------------------------
// Mock nativewind - only colorScheme.set is used by the source
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
// react-native's useColorScheme is provided by jest-expo - mock it via spyOn
const mockUseColorScheme = jest.spyOn(require("react-native"), "useColorScheme");

const mockHydrate = jest.fn().mockResolvedValue(undefined);

function setupStore(preference: "light" | "dark" | "system") {
  mockUseThemeStore.mockImplementation(
    (selector: (s: { preference: string; hydrate: () => Promise<void> }) => unknown) =>
      selector({ preference, hydrate: mockHydrate }),
  );
}

// ---------------------------------------------------------------------------
// Reader
// ---------------------------------------------------------------------------

describe("useColorSchemeName - the reader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrate.mockResolvedValue(undefined);
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  });

  it("returns the resolved scheme (explicit preference wins)", () => {
    setupStore("light");
    mockUseColorScheme.mockReturnValue("dark");

    const { result } = renderHook(() => useColorSchemeName());

    expect(result.current).toBe("light");
  });

  it("returns dark when OS is dark and preference is system", () => {
    setupStore("system");
    mockUseColorScheme.mockReturnValue("dark");

    const { result } = renderHook(() => useColorSchemeName());

    expect(result.current).toBe("dark");
  });

  it("returns light when OS is light and preference is system", () => {
    setupStore("system");
    mockUseColorScheme.mockReturnValue("light");

    const { result } = renderHook(() => useColorSchemeName());

    expect(result.current).toBe("light");
  });

  it("returns light when OS returns null (falsy) and preference is system", () => {
    setupStore("system");
    mockUseColorScheme.mockReturnValue(null);

    const { result } = renderHook(() => useColorSchemeName());

    // Source: `useColorScheme() === "dark" ? "dark" : "light"` - null → "light"
    expect(result.current).toBe("light");
  });

  it("never returns undefined, whatever the OS hook reports", () => {
    for (const osScheme of ["dark", "light", null, undefined] as const) {
      for (const preference of ["light", "dark", "system"] as const) {
        setupStore(preference);
        mockUseColorScheme.mockReturnValue(osScheme);

        const { result } = renderHook(() => useColorSchemeName());

        expect(result.current).toMatch(/^(light|dark)$/);
      }
    }
  });

  it("performs no writes and no hydrate", () => {
    setupStore("system");
    mockUseColorScheme.mockReturnValue("dark");

    renderHook(() => useColorSchemeName());

    expect(mockNwSet).not.toHaveBeenCalled();
    expect(mockHydrate).not.toHaveBeenCalled();
  });

  it("performs no writes and no hydrate on web either", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    setupStore("dark");
    mockUseColorScheme.mockReturnValue("light");

    renderHook(() => useColorSchemeName());

    expect(mockNwSet).not.toHaveBeenCalled();
    expect(mockHydrate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

describe("useColorSchemeDriver - web (Platform.OS = web)", () => {
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

    renderHook(() => useColorSchemeDriver());

    expect(mockNwSet).toHaveBeenCalledWith("dark");
  });

  it("passes RESOLVED value to nativewind.set on web (system + light OS = light)", () => {
    setupStore("system");
    mockUseColorScheme.mockReturnValue("light");

    renderHook(() => useColorSchemeDriver());

    expect(mockNwSet).toHaveBeenCalledWith("light");
  });

  it("passes RESOLVED explicit preference on web (dark pref + light OS = dark)", () => {
    setupStore("dark");
    mockUseColorScheme.mockReturnValue("light");

    renderHook(() => useColorSchemeDriver());

    expect(mockNwSet).toHaveBeenCalledWith("dark");
  });

  it("calls hydrate on mount", () => {
    setupStore("system");
    mockUseColorScheme.mockReturnValue("light");

    renderHook(() => useColorSchemeDriver());

    expect(mockHydrate).toHaveBeenCalled();
  });
});

describe("useColorSchemeDriver - native (Platform.OS = ios)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrate.mockResolvedValue(undefined);
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  });

  it("passes PREFERENCE (not resolved) to nativewind.set on native - system", () => {
    setupStore("system");
    mockUseColorScheme.mockReturnValue("dark");

    renderHook(() => useColorSchemeDriver());

    // Source: `nwColorScheme.set(Platform.OS === "web" ? resolved : preference)`
    expect(mockNwSet).toHaveBeenCalledWith("system");
  });

  it("passes PREFERENCE to nativewind.set on native - explicit dark", () => {
    setupStore("dark");
    mockUseColorScheme.mockReturnValue("light");

    renderHook(() => useColorSchemeDriver());

    expect(mockNwSet).toHaveBeenCalledWith("dark");
  });

  it("passes PREFERENCE to nativewind.set on native - explicit light", () => {
    setupStore("light");
    mockUseColorScheme.mockReturnValue("dark");

    renderHook(() => useColorSchemeDriver());

    expect(mockNwSet).toHaveBeenCalledWith("light");
  });

  it("calls hydrate on mount", () => {
    setupStore("dark");
    mockUseColorScheme.mockReturnValue("dark");

    renderHook(() => useColorSchemeDriver());

    expect(mockHydrate).toHaveBeenCalled();
  });
});

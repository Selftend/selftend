/**
 * Regression test for #304: a theme choice must survive a consumer mounting
 * inside the persist window.
 *
 * The defect was that the colour-scheme hook was reader AND driver at once, so
 * `hydrate()` ran on EVERY one of fourteen consumer mounts while `setPreference`
 * persists UNAWAITED (theme-store.ts). A consumer mounting inside that write
 * window read the stale value and clobbered the fresh choice.
 *
 * Post-split the reader is the thing that mounts repeatedly, and it hydrates
 * nothing — so the same sequence keeps the choice.
 *
 * AsyncStorage is mocked with an explicitly-held write so the window is a
 * controlled fact rather than a timing accident — the real-world window is one
 * AsyncStorage write latency (Android serializes these over the bridge).
 */

import { renderHook, act } from "@testing-library/react-native";

import { useColorSchemeDriver, useColorSchemeName } from "@/src/lib/color-scheme";
import { useThemeStore } from "@/src/stores/theme-store";

jest.mock("nativewind", () => ({ colorScheme: { set: jest.fn() } }));

// Storage whose writes land only when the test says so.
// `mock`-prefixed so babel-plugin-jest-hoist allows the factory to close over them.
let mockCommitted: string | null = null;
let mockLandWrite: (() => void) | null = null;

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(mockCommitted)),
    setItem: jest.fn(
      (_key: string, value: string) =>
        new Promise<void>((resolve) => {
          mockLandWrite = () => {
            mockCommitted = value;
            resolve();
          };
        }),
    ),
  },
}));

// Let queued promise callbacks (the hydrate chain) run.
const flush = () => act(async () => {});

beforeEach(() => {
  mockCommitted = "light";
  mockLandWrite = null;
  useThemeStore.setState({ preference: "system" });
});

describe("#304: the reader mounts freely without clobbering a fresh choice", () => {
  it("KEEPS a fresh theme choice when a reader mounts inside the write window", async () => {
    // Boot: the root mounts the driver, which hydrates the stored "light".
    renderHook(() => useColorSchemeDriver());
    await flush();
    expect(useThemeStore.getState().preference).toBe("light");

    // The user picks "dark". The store updates synchronously; the persist is
    // in flight and deliberately NOT landed yet.
    act(() => {
      useThemeStore.getState().setPreference("dark");
    });
    expect(useThemeStore.getState().preference).toBe("dark");
    expect(mockCommitted).toBe("light"); // write still in flight

    // The user navigates to a screen carrying any of the twelve readers —
    // a chart, a date field, pillar-card, program-card, the breathing session.
    const { result } = renderHook(() => useColorSchemeName());
    await flush();

    // The reader hydrates nothing, so the choice stands.
    expect(useThemeStore.getState().preference).toBe("dark");
    expect(result.current).toBe("dark");
  });

  it("keeps the choice when only the driver exists (the root-only driver shape)", async () => {
    renderHook(() => useColorSchemeDriver());
    await flush();

    act(() => {
      useThemeStore.getState().setPreference("dark");
    });
    await flush();

    // No second hydrate, so nothing clobbers the choice.
    expect(useThemeStore.getState().preference).toBe("dark");
  });

  it("keeps the choice once the write has landed, even with a second consumer", async () => {
    renderHook(() => useColorSchemeDriver());
    await flush();

    act(() => {
      useThemeStore.getState().setPreference("dark");
    });
    await act(async () => {
      mockLandWrite?.();
    });
    expect(mockCommitted).toBe("dark");

    renderHook(() => useColorSchemeName());
    await flush();

    // Confirms the defect is the WINDOW, not the extra hydrate per se.
    expect(useThemeStore.getState().preference).toBe("dark");
  });
});

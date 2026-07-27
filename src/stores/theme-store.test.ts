import AsyncStorage from "@react-native-async-storage/async-storage";

import { useThemeStore } from "@/src/stores/theme-store";

const STORAGE_KEY = "selftend:theme";

describe("theme store", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useThemeStore.setState({ preference: "system", hydrated: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("defaults to system when nothing is stored", async () => {
    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().preference).toBe("system");
  });

  it("hydrates a previously persisted preference", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "dark");

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().preference).toBe("dark");
  });

  it("ignores garbage values in storage", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "neon");

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().preference).toBe("system");
  });

  it("persists the preference when setPreference is called", async () => {
    useThemeStore.getState().setPreference("light");

    expect(useThemeStore.getState().preference).toBe("light");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("light");
  });
});

/**
 * The `hydrated` flag exists so a value loaded from disk can never overwrite a
 * choice the user made more recently (#358, closing the race in #304
 * structurally at the store).
 *
 * These are written as event sequences — "this happened, then that happened,
 * so the preference is X" — rather than as assertions about how many times
 * storage was read.
 */
describe("theme store - a stored value never beats a fresher choice", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useThemeStore.setState({ preference: "system", hydrated: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("marks hydrated when setPreference is called", () => {
    useThemeStore.getState().setPreference("dark");

    expect(useThemeStore.getState().hydrated).toBe(true);
  });

  it("marks hydrated even when nothing is stored", async () => {
    await useThemeStore.getState().hydrate();

    // A first-run user is "settled on the default", not permanently un-hydrated.
    expect(useThemeStore.getState().hydrated).toBe(true);
    expect(useThemeStore.getState().preference).toBe("system");
  });

  it("marks hydrated even when the stored value is garbage", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "neon");

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().hydrated).toBe(true);
    expect(useThemeStore.getState().preference).toBe("system");
  });

  it("leaves an explicit choice alone when hydrate runs afterwards", async () => {
    // Storage reports "light" no matter what, so the ONLY thing that can keep
    // "dark" is hydrate declining to re-read an already-settled preference.
    // (Reading real storage here would pass for the wrong reason: setPreference's
    // unawaited write usually lands first, leaving "dark" on disk to be read back.)
    jest.spyOn(AsyncStorage, "getItem").mockResolvedValue("light");

    // The choice settles the preference...
    useThemeStore.getState().setPreference("dark");
    // ...so a later hydrate has nothing to re-read.
    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().preference).toBe("dark");
  });

  it("discards a read that resolves after a choice landed mid-flight", async () => {
    // Hold the storage read open so the window is a controlled fact rather
    // than a timing accident. In the real app the window is one AsyncStorage
    // round-trip (Android serializes these over the bridge).
    let landRead: ((value: string | null) => void) | null = null;
    jest.spyOn(AsyncStorage, "getItem").mockReturnValue(
      new Promise<string | null>((resolve) => {
        landRead = resolve;
      }),
    );

    const hydrating = useThemeStore.getState().hydrate();

    // The user picks "dark" while the disk read is still in flight.
    useThemeStore.getState().setPreference("dark");
    expect(useThemeStore.getState().preference).toBe("dark");

    // Only now does the stale "light" come back from storage.
    landRead!("light");
    await hydrating;

    // The fresher choice wins.
    expect(useThemeStore.getState().preference).toBe("dark");
  });
});

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

  it("settles on the default when nothing is stored", async () => {
    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().hydrated).toBe(true);
  });

  it("settles even when the stored value is garbage", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "neon");

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().hydrated).toBe(true);
  });

  it("settles as soon as the user makes a choice", () => {
    useThemeStore.getState().setPreference("dark");

    expect(useThemeStore.getState().hydrated).toBe(true);
  });

  it("leaves a settled preference alone when hydrate runs again", async () => {
    useThemeStore.getState().setPreference("dark");
    await AsyncStorage.setItem(STORAGE_KEY, "light");

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().preference).toBe("dark");
  });

  it("discards a storage read that lands after the user has chosen", async () => {
    // The reproduced race: a consumer mounts and starts hydrate(), the user picks a
    // theme while that read is still in flight, and the older on-disk value resolves
    // last. The choice must win regardless of arrival order.
    let releaseRead: (value: string) => void = () => {};
    jest.spyOn(AsyncStorage, "getItem").mockReturnValue(
      new Promise<string>((resolve) => {
        releaseRead = resolve;
      }),
    );

    const hydrating = useThemeStore.getState().hydrate();
    useThemeStore.getState().setPreference("dark");
    releaseRead("light");
    await hydrating;

    expect(useThemeStore.getState().preference).toBe("dark");
    expect(useThemeStore.getState().hydrated).toBe(true);
  });
});

// The appearance axis's synchronous web seed, mirroring style-store's. The
// first-paint script already paints the STORED appearance, so a store that
// began at "system" made React's first commit resolve to the DEVICE scheme and
// flip back once the async read landed — stored → device → stored, a worse
// flash than the script was added to remove.
describe("the web seed settles the appearance axis before the first render", () => {
  let descriptor: PropertyDescriptor | undefined;

  const mountWithStorage = (stored: string | null) => {
    descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    jest.resetModules();
    // Flipping the property on the real module rather than spreading
    // requireActual("react-native"): its index exposes every export as a lazy
    // getter, so a spread evaluates all of them and drags the native component
    // surface into a module-init test.
    const RN = require("react-native") as typeof import("react-native");
    Object.defineProperty(RN.Platform, "OS", { configurable: true, get: () => "web" });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: { localStorage: { getItem: () => stored } },
    });
    return require("@/src/stores/theme-store") as typeof import("@/src/stores/theme-store");
  };

  afterEach(() => {
    if (descriptor) {
      Object.defineProperty(globalThis, "window", descriptor);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
    jest.resetModules();
  });

  it("starts on the stored preference, already settled", () => {
    const { useThemeStore: store } = mountWithStorage("dark");

    expect(store.getState().preference).toBe("dark");
    // Settled, so the async hydrate cannot report anything over it.
    expect(store.getState().hydrated).toBe(true);
  });

  it("leaves the axis un-settled when nothing is stored", () => {
    const { useThemeStore: store } = mountWithStorage(null);

    expect(store.getState().preference).toBe("system");
    expect(store.getState().hydrated).toBe(false);
  });

  it("ignores a stored value that is not a preference", () => {
    const { useThemeStore: store } = mountWithStorage("sepia");

    expect(store.getState().preference).toBe("system");
    expect(store.getState().hydrated).toBe(false);
  });

  it("survives an origin where reading window.localStorage itself throws", () => {
    descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    jest.resetModules();
    const RN = require("react-native") as typeof import("react-native");
    Object.defineProperty(RN.Platform, "OS", { configurable: true, get: () => "web" });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: {
        get localStorage(): Storage {
          throw new Error("SecurityError: access to storage is denied");
        },
      },
    });

    let imported: typeof import("@/src/stores/theme-store") | undefined;
    expect(() => {
      imported = require("@/src/stores/theme-store") as typeof import("@/src/stores/theme-store");
    }).not.toThrow();

    expect(imported?.useThemeStore.getState().preference).toBe("system");
    expect(imported?.useThemeStore.getState().hydrated).toBe(false);
  });
});

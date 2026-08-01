import AsyncStorage from "@react-native-async-storage/async-storage";

import { isStyleName, useStyleStore } from "@/src/stores/style-store";
import { useThemeStore } from "@/src/stores/theme-store";
import { DEFAULT_STYLE } from "@/src/lib/theme/styles";

const STORAGE_KEY = "selftend:style";

describe("style store", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useStyleStore.setState({ style: DEFAULT_STYLE, hydrated: false });
    useThemeStore.setState({ preference: "system", hydrated: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("defaults to the default style when nothing is stored", async () => {
    await useStyleStore.getState().hydrate();

    expect(useStyleStore.getState().style).toBe(DEFAULT_STYLE);
  });

  it("hydrates a previously persisted style", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "deep-field");

    await useStyleStore.getState().hydrate();

    expect(useStyleStore.getState().style).toBe("deep-field");
  });

  // A palette that was removed from the set leaves a real stored value behind on
  // a device that had it selected. It must read as "no choice", not crash the
  // token lookup with an undefined style.
  it.each(["neon", "", "quiet_lilac", "atlas "])("ignores %p in storage", async (stored) => {
    await AsyncStorage.setItem(STORAGE_KEY, stored);

    await useStyleStore.getState().hydrate();

    expect(useStyleStore.getState().style).toBe(DEFAULT_STYLE);
    expect(isStyleName(stored)).toBe(false);
  });

  it("persists the style when setStyle is called", async () => {
    useStyleStore.getState().setStyle("glacier");

    expect(useStyleStore.getState().style).toBe("glacier");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("glacier");
  });

  it("survives a rejected write without an unhandled rejection", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("disk full"));

    useStyleStore.getState().setStyle("atlas");

    expect(useStyleStore.getState().style).toBe("atlas");
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

// The race this axis was built around. #304/#343 were both "a storage read that
// finished after a user's choice reported the older value over it". The guard
// that fixed the appearance axis is re-derived here rather than assumed, because
// a second axis is exactly where such a guard gets forgotten.
describe("the style axis closes its own hydration race", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useStyleStore.setState({ style: DEFAULT_STYLE, hydrated: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("a choice made mid-read is not overwritten by the read", async () => {
    let release: (value: string | null) => void = () => {};
    jest.spyOn(AsyncStorage, "getItem").mockReturnValueOnce(
      new Promise<string | null>((resolve) => {
        release = resolve;
      }),
    );

    const hydrating = useStyleStore.getState().hydrate();
    // The user picks while the read is still in flight.
    useStyleStore.getState().setStyle("amber-noir");
    // ...and only then does storage report the stale value.
    release("sage-garden");
    await hydrating;

    expect(useStyleStore.getState().style).toBe("amber-noir");
  });

  it("a second hydrate cannot re-report a value over a settled one", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "glacier");
    await useStyleStore.getState().hydrate();
    await AsyncStorage.setItem(STORAGE_KEY, "atlas");

    await useStyleStore.getState().hydrate();

    expect(useStyleStore.getState().style).toBe("glacier");
  });
});

// The reason these are two stores and not two fields on one. A shared `hydrated`
// flag would let whichever axis settled first mark the other settled too, so the
// other's stored value would be silently discarded (or, in the mirror case, its
// fresh choice overwritten). Neither axis may see the other at all.
describe("the two axes are independent", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useStyleStore.setState({ style: DEFAULT_STYLE, hydrated: false });
    useThemeStore.setState({ preference: "system", hydrated: false });
  });

  // The getItem spies below outlive their test without this, and the next one
  // then reads null from a storage it never mocked.
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("settling the style axis leaves the appearance axis un-hydrated", async () => {
    await useStyleStore.getState().hydrate();

    expect(useStyleStore.getState().hydrated).toBe(true);
    expect(useThemeStore.getState().hydrated).toBe(false);
  });

  it("a slow style hydrate does not clobber a fresh appearance choice", async () => {
    let release: (value: string | null) => void = () => {};
    jest.spyOn(AsyncStorage, "getItem").mockImplementation((key: string) => {
      if (key === STORAGE_KEY) {
        return new Promise<string | null>((resolve) => {
          release = resolve;
        });
      }
      return Promise.resolve(null);
    });

    const hydratingStyle = useStyleStore.getState().hydrate();
    useThemeStore.getState().setPreference("dark");
    release("plum-manuscript");
    await hydratingStyle;

    expect(useThemeStore.getState().preference).toBe("dark");
    expect(useStyleStore.getState().style).toBe("plum-manuscript");
  });

  it("a slow appearance hydrate does not clobber a fresh style choice", async () => {
    let release: (value: string | null) => void = () => {};
    jest.spyOn(AsyncStorage, "getItem").mockImplementation((key: string) => {
      if (key === "selftend:theme") {
        return new Promise<string | null>((resolve) => {
          release = resolve;
        });
      }
      return Promise.resolve(null);
    });

    const hydratingTheme = useThemeStore.getState().hydrate();
    useStyleStore.getState().setStyle("ink-ivory");
    release("light");
    await hydratingTheme;

    expect(useStyleStore.getState().style).toBe("ink-ivory");
    expect(useThemeStore.getState().preference).toBe("light");
  });

  // Asserted on the write calls rather than by reading back after a tick: the
  // writes are fire-and-forget, so a read-back races them and only passes when
  // the scheduler cooperates.
  it("writes to two separate keys", () => {
    // AsyncStorage's own jest mock is already a jest.fn, so spying on it returns
    // a function carrying every call the earlier tests made. Clear before use.
    const setItem = jest.spyOn(AsyncStorage, "setItem").mockResolvedValue(undefined);
    setItem.mockClear();

    useStyleStore.getState().setStyle("glacier");
    useThemeStore.getState().setPreference("dark");

    expect(setItem.mock.calls).toEqual([
      ["selftend:style", "glacier"],
      ["selftend:theme", "dark"],
    ]);
  });
});

// The web seed runs at MODULE scope, so anything it throws is thrown while the
// module is being imported — no caller can catch it, and on web it takes the
// whole boot down rather than one palette with it. Both hostile shapes are
// covered: a `localStorage` whose GETTER throws (opaque or sandboxed origin,
// storage blocked by browser policy) and one that is simply absent. The first
// is the reason the property access sits inside the try rather than in the
// guard above it.
describe.each([
  [
    "an origin where reading window.localStorage itself throws",
    () => ({
      get localStorage(): Storage {
        throw new Error("SecurityError: access to storage is denied");
      },
    }),
  ],
  ["an environment with no localStorage at all", () => ({ localStorage: undefined })],
])("the web seed survives %s", (_label, makeWindowStub) => {
  let descriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    jest.resetModules();
    // Spreading `requireActual("react-native")` to override Platform is not an
    // option: its index exposes every export as a lazy getter, so the spread
    // evaluates all of them and drags the whole native component surface into
    // what should be a plain module-init test. Flip the single property on the
    // real module instead — done AFTER resetModules, so the store required
    // below resolves to this very instance.
    const RN = require("react-native") as typeof import("react-native");
    Object.defineProperty(RN.Platform, "OS", { configurable: true, get: () => "web" });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: makeWindowStub(),
    });
  });

  afterEach(() => {
    if (descriptor) {
      Object.defineProperty(globalThis, "window", descriptor);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
    // Resets the registry, so the patched Platform instance is discarded with
    // it and nothing has to be un-patched by hand.
    jest.resetModules();
  });

  it("imports without throwing and falls back to the default style", () => {
    let imported: typeof import("@/src/stores/style-store") | undefined;

    expect(() => {
      imported = require("@/src/stores/style-store") as typeof import("@/src/stores/style-store");
    }).not.toThrow();

    expect(imported?.useStyleStore.getState().style).toBe(DEFAULT_STYLE);
    // Still un-settled: the seed found nothing, so the async hydrate is the one
    // that owes an answer. A crashed seed must not masquerade as a real read.
    expect(imported?.useStyleStore.getState().hydrated).toBe(false);
  });
});

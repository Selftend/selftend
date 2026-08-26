import AsyncStorage from "@react-native-async-storage/async-storage";
import { onlineManager } from "@tanstack/react-query";
import { appEnv } from "@/src/lib/env";
import { AppState, Linking, Platform } from "react-native";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useUpdateAvailability } from "@/src/lib/use-update-availability";
import { checkAndroidStoreUpdate } from "@/src/lib/android-store-update";
import { fetchVersionDocument, getRunningVersion } from "@/src/lib/update-availability";
import { useOverlayCountStore } from "@/src/stores/overlay-count-store";

jest.mock("@/src/lib/update-availability", () => ({
  ...jest.requireActual("@/src/lib/update-availability"),
  fetchVersionDocument: jest.fn(),
  getRunningVersion: jest.fn(),
}));
jest.mock("@/src/lib/android-store-update", () => ({ checkAndroidStoreUpdate: jest.fn() }));

const mockFetchDocument = fetchVersionDocument as jest.MockedFunction<typeof fetchVersionDocument>;
const mockRunningVersion = getRunningVersion as jest.MockedFunction<typeof getRunningVersion>;
const mockStoreUpdate = checkAndroidStoreUpdate as jest.MockedFunction<
  typeof checkAndroidStoreUpdate
>;

// Timing and persistence for the update hook (#388 section 3). jest-expo runs
// the web branch (Platform.OS === "web"), which skips the native grace window
// - the grace logic itself is exercised through the exported constants'
// behavior below by faking Platform where needed.

let platformSpy: jest.ReplaceProperty<typeof Platform.OS> | undefined;
beforeAll(() => {
  platformSpy = jest.replaceProperty(Platform, "OS", "web");
});
afterAll(() => platformSpy?.restore());

describe("useUpdateAvailability", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockRunningVersion.mockReturnValue("0.8.0");
  });

  it("offers when the deployed version is strictly newer", async () => {
    mockFetchDocument.mockResolvedValue({
      version: "0.9.0",
      publishedAt: new Date().toISOString(),
    });

    const { result } = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(result.current.available).toBe(true));
    expect(result.current.version).toBe("0.9.0");
  });

  it("stays quiet when the document matches or trails the running version", async () => {
    mockFetchDocument.mockResolvedValue({
      version: "0.8.0",
      publishedAt: new Date().toISOString(),
    });

    const { result } = renderHook(() => useUpdateAvailability());
    // Give the initial check a beat, then assert nothing was offered.
    await waitFor(() => expect(mockFetchDocument).toHaveBeenCalled());
    expect(result.current.available).toBe(false);
  });

  it("stays quiet when the fetch answers null", async () => {
    mockFetchDocument.mockResolvedValue(null);
    const { result } = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(mockFetchDocument).toHaveBeenCalled());
    expect(result.current.available).toBe(false);
  });

  it("dismissal persists per version and survives a remount", async () => {
    mockFetchDocument.mockResolvedValue({
      version: "0.9.0",
      publishedAt: new Date().toISOString(),
    });

    const first = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(first.result.current.available).toBe(true));
    act(() => first.result.current.dismiss());
    expect(first.result.current.available).toBe(false);
    await waitFor(async () =>
      expect(await AsyncStorage.getItem("updateBannerDismissed:0.9.0")).toBe("1"),
    );
    first.unmount();

    // Remount: same version stays dismissed...
    const second = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(mockFetchDocument).toHaveBeenCalledTimes(2));
    expect(second.result.current.available).toBe(false);
    second.unmount();

    // ...but the NEXT version is offered again.
    mockFetchDocument.mockResolvedValue({
      version: "0.9.1",
      publishedAt: new Date().toISOString(),
    });
    const third = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(third.result.current.available).toBe(true));
    expect(third.result.current.version).toBe("0.9.1");
  });

  it("does not check when the running version is unknown", async () => {
    mockRunningVersion.mockReturnValue(null);
    renderHook(() => useUpdateAvailability());
    // No version to compare against means no fetch at all.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockFetchDocument).not.toHaveBeenCalled();
  });
});

// Native update offers are OFF (NATIVE_UPDATE_OFFERS_ENABLED in the hook).
//
// /version.json is written by the WEB deploy and carries only a web timestamp,
// while Android ships at rollout 0.2 - a cap that only moves when a human bumps
// it - and iOS reaches the App Store only when a human promotes a TestFlight
// build. So the 24h grace window treats "the web deployed a day ago" as "the
// store has this build", which is wrong indefinitely rather than merely early.
// Caught in review on PR #532, before it reached a user.
//
// Android is now ON, sourced from Google Play rather than from the version
// document - see `checkAndroidStoreUpdate`. iOS stays suppressed, and these
// tests pin that asymmetry so neither half moves silently.
//
// The Android case is asserted through a MOCKED checkAndroidStoreUpdate. It
// has to be: jest-expo runs with `__DEV__` true, so the real function returns
// null on every platform and an "android never offers" assertion would keep
// passing after the feature shipped - green, and measuring nothing. (That is
// exactly what happened to the old assertion here on the first run of this
// change.) The real guards are covered in android-store-update.test.ts.
describe("useUpdateAvailability (Android offers via Play, iOS suppressed)", () => {
  const HOUR = 60 * 60 * 1000;
  let nativeSpy: jest.ReplaceProperty<typeof Platform.OS> | undefined;
  let playStoreUrl: string;
  let appStoreUrl: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    platformSpy?.restore();
    playStoreUrl = appEnv.playStoreUrl;
    appStoreUrl = appEnv.appStoreUrl;
    // Both URLs deliberately set and a document deliberately well past the
    // grace window, so nothing but the suppression itself can explain silence.
    appEnv.playStoreUrl = "https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend";
    appEnv.appStoreUrl = "https://apps.apple.com/app/id6796318929";
    mockRunningVersion.mockReturnValue("0.8.0");
    mockFetchDocument.mockResolvedValue({
      version: "0.9.0",
      publishedAt: new Date(Date.now() - 30 * 24 * HOUR).toISOString(),
    });
  });

  afterEach(() => {
    appEnv.playStoreUrl = playStoreUrl;
    appEnv.appStoreUrl = appStoreUrl;
    nativeSpy?.restore();
    platformSpy = jest.replaceProperty(Platform, "OS", "web");
  });

  it("never offers on ios, even a month past what used to be the grace window", async () => {
    nativeSpy = jest.replaceProperty(Platform, "OS", "ios");

    const { result } = renderHook(() => useUpdateAvailability());
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(result.current.available).toBe(false);
    // Not merely unoffered - the document is never even fetched, so an iOS
    // build does not ask a question it will not act on. Nothing on the device
    // can observe an App Store promotion, so there is no answer to be had.
    expect(mockFetchDocument).not.toHaveBeenCalled();
  });

  it("offers on android when Play is serving a newer build to this device", async () => {
    nativeSpy = jest.replaceProperty(Platform, "OS", "android");
    mockStoreUpdate.mockResolvedValue("18");

    const { result } = renderHook(() => useUpdateAvailability());

    await waitFor(() => expect(result.current.available).toBe(true));
    expect(result.current.version).toBe("18");
    // Android never reads the version document: a web deploy timestamp says
    // nothing about what Play is serving, which is why the offer was off.
    expect(mockFetchDocument).not.toHaveBeenCalled();
  });

  it("stays quiet on android when Play reports nothing to install", async () => {
    nativeSpy = jest.replaceProperty(Platform, "OS", "android");
    mockStoreUpdate.mockResolvedValue(null);

    const { result } = renderHook(() => useUpdateAvailability());
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(result.current.available).toBe(false);
  });

  // A Play versionCode, not a semver - the dismissal key has to work for both.
  it("dismissal on android is per versionCode and survives a remount", async () => {
    nativeSpy = jest.replaceProperty(Platform, "OS", "android");
    mockStoreUpdate.mockResolvedValue("18");

    const first = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(first.result.current.available).toBe(true));
    act(() => first.result.current.dismiss());
    expect(first.result.current.available).toBe(false);

    const second = renderHook(() => useUpdateAvailability());
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(second.result.current.available).toBe(false);

    // ...and a NEWER build gets through the same latch.
    mockStoreUpdate.mockResolvedValue("19");
    const third = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(third.result.current.available).toBe(true));
  });

  it("offers nothing on android when no Play URL is configured", async () => {
    nativeSpy = jest.replaceProperty(Platform, "OS", "android");
    appEnv.playStoreUrl = "";
    mockStoreUpdate.mockResolvedValue("18");

    const { result } = renderHook(() => useUpdateAvailability());
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(result.current.available).toBe(false);
    // Nowhere to send them is the same as nothing to offer - and Play is not
    // even asked, so a misconfigured build makes no native call at all.
    expect(mockStoreUpdate).not.toHaveBeenCalled();
  });

  // The per-platform store mapping is retained for when availability data
  // exists, so it stays covered: it is the piece that must NOT regress back to
  // "native means Android" (#529) while the offer is switched off.
  it.each([
    ["android", () => appEnv.playStoreUrl, () => appEnv.appStoreUrl],
    ["ios", () => appEnv.appStoreUrl, () => appEnv.playStoreUrl],
  ] as const)("act() on %s targets its own store, never the other", (os, expected, forbidden) => {
    nativeSpy = jest.replaceProperty(Platform, "OS", os);
    const openSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const { result } = renderHook(() => useUpdateAvailability());

    act(() => result.current.act());

    expect(openSpy).toHaveBeenCalledWith(expected());
    expect(openSpy).not.toHaveBeenCalledWith(forbidden());
    openSpy.mockRestore();
  });

  // The AppState "active" listener is DELETED, not gated (#1474): Android is
  // launch-only, and a listener that merely gates presentation is how a later
  // cleanup would quietly reintroduce the mid-session modal.
  it("android mounts no foreground listener at all", async () => {
    nativeSpy = jest.replaceProperty(Platform, "OS", "android");
    mockStoreUpdate.mockResolvedValue("18");
    const appStateSpy = jest.spyOn(AppState, "addEventListener");

    const { result } = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(result.current.available).toBe(true));

    expect(appStateSpy).not.toHaveBeenCalled();
    appStateSpy.mockRestore();
  });
});

// Arming-time suppression and the per-platform triggers (#1474, spec §1-§2 on
// #1142). RN's jest setup aliases `window` to `global` WITHOUT DOM event
// methods and defines no `document` at all - the hook feature-detects both -
// so these tests install capturing stubs and drive the web triggers by hand.
describe("useUpdateAvailability (arming-time suppression and triggers)", () => {
  type DomListener = (type: string, handler: () => void) => void;
  // Cast through unknown: the project's TS lib already declares DOM-shaped
  // globals, and this stub deliberately replaces them with a narrower shape.
  const domGlobal = globalThis as unknown as {
    addEventListener?: DomListener;
    removeEventListener?: DomListener;
    document?: {
      visibilityState: string;
      addEventListener: DomListener;
      removeEventListener: DomListener;
    };
  };

  let focusHandlers: (() => void)[];
  let visibilityHandlers: (() => void)[];
  let visibilityState: "visible" | "hidden";
  let suppressionPlatformSpy: jest.ReplaceProperty<typeof Platform.OS> | undefined;

  const fireFocus = () => act(() => focusHandlers.forEach((handler) => handler()));
  const fireVisibilityChange = () => act(() => visibilityHandlers.forEach((handler) => handler()));

  // Installed for the whole describe (not per test): RNTL's auto-cleanup
  // unmounts the last render AFTER this block's own afterEach, and the
  // unmounting hook still calls window.removeEventListener - deleting the
  // stubs per test would pull the rug out from under that cleanup.
  beforeAll(() => {
    domGlobal.addEventListener = (type, handler) => {
      if (type === "focus") focusHandlers.push(handler);
    };
    domGlobal.removeEventListener = (type, handler) => {
      focusHandlers = focusHandlers.filter((registered) => registered !== handler);
    };
    domGlobal.document = {
      get visibilityState() {
        return visibilityState;
      },
      addEventListener: (type, handler) => {
        if (type === "visibilitychange") visibilityHandlers.push(handler);
      },
      removeEventListener: (type, handler) => {
        visibilityHandlers = visibilityHandlers.filter((registered) => registered !== handler);
      },
    };
  });

  afterAll(() => {
    delete domGlobal.addEventListener;
    delete domGlobal.removeEventListener;
    delete domGlobal.document;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useOverlayCountStore.setState({ count: 0 });
    onlineManager.setOnline(true);
    suppressionPlatformSpy = jest.replaceProperty(Platform, "OS", "web");
    mockRunningVersion.mockReturnValue("0.8.0");
    mockFetchDocument.mockResolvedValue({
      version: "0.9.0",
      publishedAt: new Date().toISOString(),
    });

    focusHandlers = [];
    visibilityHandlers = [];
    visibilityState = "visible";
  });

  afterEach(() => {
    onlineManager.setOnline(true);
    useOverlayCountStore.setState({ count: 0 });
    suppressionPlatformSpy?.restore();
  });

  it("an overlay at launch suppresses without stamping: the next focus still offers", async () => {
    let release: () => void = () => {};
    act(() => {
      release = useOverlayCountStore.getState().acquire();
    });

    const { result } = renderHook(() => useUpdateAvailability());
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Bailed BEFORE the version fetch, and suppression wrote no dismissal.
    expect(result.current.available).toBe(false);
    expect(mockFetchDocument).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem("updateBannerDismissed:0.9.0")).toBeNull();

    // The overlay closing does NOT resurface the offer by itself...
    act(() => release());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.available).toBe(false);

    // ...but the next trigger checks again. Had the suppressed launch stamped
    // the throttle, this focus would be silenced for 6 hours.
    fireFocus();
    await waitFor(() => expect(result.current.available).toBe(true));
    expect(result.current.version).toBe("0.9.0");
  });

  it("offline suppresses the web check without stamping the throttle", async () => {
    onlineManager.setOnline(false);

    const { result } = renderHook(() => useUpdateAvailability());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.available).toBe(false);
    expect(mockFetchDocument).not.toHaveBeenCalled();

    onlineManager.setOnline(true);
    fireFocus();
    await waitFor(() => expect(result.current.available).toBe(true));
  });

  it("offline suppresses the android launch check too", async () => {
    suppressionPlatformSpy?.restore();
    suppressionPlatformSpy = jest.replaceProperty(Platform, "OS", "android");
    const playStoreUrl = appEnv.playStoreUrl;
    appEnv.playStoreUrl = "https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend";
    onlineManager.setOnline(false);
    mockStoreUpdate.mockResolvedValue("18");

    try {
      const { result } = renderHook(() => useUpdateAvailability());
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(result.current.available).toBe(false);
      expect(mockStoreUpdate).not.toHaveBeenCalled();
    } finally {
      appEnv.playStoreUrl = playStoreUrl;
    }
  });

  it("visibilitychange funnels into the same check, acting only when visible", async () => {
    let release: () => void = () => {};
    act(() => {
      release = useOverlayCountStore.getState().acquire();
    });

    const { result } = renderHook(() => useUpdateAvailability());
    await new Promise((resolve) => setTimeout(resolve, 50));
    act(() => release());

    // A hidden-going visibility flip is not a return to the app.
    visibilityState = "hidden";
    fireVisibilityChange();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.available).toBe(false);

    visibilityState = "visible";
    fireVisibilityChange();
    await waitFor(() => expect(result.current.available).toBe(true));
  });

  it("focus and visibility re-checks stay behind the 6h throttle", async () => {
    const { result } = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(result.current.available).toBe(true));
    expect(mockFetchDocument).toHaveBeenCalledTimes(1);

    // Neither trigger fetches again inside the window: the launch check
    // stamped the throttle and nothing suppressed it since.
    fireFocus();
    fireVisibilityChange();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockFetchDocument).toHaveBeenCalledTimes(1);
  });

  it("an overlay appearing mid-fetch drops the offer before it ever arms", async () => {
    let resolveFetch: (doc: { version: string; publishedAt: string }) => void = () => {};
    mockFetchDocument.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    let release: () => void = () => {};
    const { result } = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(mockFetchDocument).toHaveBeenCalledTimes(1));

    // The overlay opens while the version document is still in flight - the
    // exact shape of the Android launch check and the home tour, which mount
    // their modals after arming begins.
    act(() => {
      release = useOverlayCountStore.getState().acquire();
    });
    act(() => resolveFetch({ version: "0.9.0", publishedAt: new Date().toISOString() }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(result.current.available).toBe(false);
    expect(await AsyncStorage.getItem("updateBannerDismissed:0.9.0")).toBeNull();

    // Dropped, not latched: once the overlay is gone the next trigger offers.
    mockFetchDocument.mockResolvedValue({
      version: "0.9.0",
      publishedAt: new Date().toISOString(),
    });
    act(() => release());
    fireFocus();
    await waitFor(() => expect(result.current.available).toBe(true));
  });

  it("disarm backstop: an armed offer drops under a later overlay, persisting nothing", async () => {
    const { result } = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(result.current.available).toBe(true));

    let release: () => void = () => {};
    act(() => {
      release = useOverlayCountStore.getState().acquire();
    });
    await waitFor(() => expect(result.current.available).toBe(false));
    expect(await AsyncStorage.getItem("updateBannerDismissed:0.9.0")).toBeNull();

    // The count returning to zero does NOT re-show the dropped offer...
    act(() => release());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.available).toBe(false);

    // ...it waits for the next trigger, which is not throttled away either.
    fireFocus();
    await waitFor(() => expect(result.current.available).toBe(true));
  });
});

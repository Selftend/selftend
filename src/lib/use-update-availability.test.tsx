import AsyncStorage from "@react-native-async-storage/async-storage";
import { appEnv } from "@/src/lib/env";
import { AppState, Linking, Platform } from "react-native";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useUpdateAvailability } from "@/src/lib/use-update-availability";
import { fetchVersionDocument, getRunningVersion } from "@/src/lib/update-availability";

jest.mock("@/src/lib/update-availability", () => ({
  ...jest.requireActual("@/src/lib/update-availability"),
  fetchVersionDocument: jest.fn(),
  getRunningVersion: jest.fn(),
}));

const mockFetchDocument = fetchVersionDocument as jest.MockedFunction<typeof fetchVersionDocument>;
const mockRunningVersion = getRunningVersion as jest.MockedFunction<typeof getRunningVersion>;

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

// Native branch (#517 Codex P2): the grace window must gate the offer, and a
// foregrounding app must get a fresh chance once the window has passed - a
// process alive for days cannot be stuck with its first answer.
describe("useUpdateAvailability (native)", () => {
  const HOUR = 60 * 60 * 1000;
  let nativeSpy: jest.ReplaceProperty<typeof Platform.OS> | undefined;
  let playStoreUrl: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    platformSpy?.restore();
    nativeSpy = jest.replaceProperty(Platform, "OS", "android");
    playStoreUrl = appEnv.playStoreUrl;
    appEnv.playStoreUrl = "https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend";
    mockRunningVersion.mockReturnValue("0.8.0");
  });

  afterEach(() => {
    appEnv.playStoreUrl = playStoreUrl;
    nativeSpy?.restore();
    platformSpy = jest.replaceProperty(Platform, "OS", "web");
  });

  it("stays quiet inside the 24h grace window, offers beyond it", async () => {
    mockFetchDocument.mockResolvedValue({
      version: "0.9.0",
      publishedAt: new Date(Date.now() - 23 * HOUR).toISOString(),
    });
    const inside = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(mockFetchDocument).toHaveBeenCalled());
    expect(inside.result.current.available).toBe(false);
    inside.unmount();

    mockFetchDocument.mockResolvedValue({
      version: "0.9.0",
      publishedAt: new Date(Date.now() - 25 * HOUR).toISOString(),
    });
    const beyond = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(beyond.result.current.available).toBe(true));
  });

  it("re-checks on return to foreground once the throttle allows", async () => {
    // First check lands inside the grace window: no offer. The app then comes
    // back to the foreground past the 6h throttle, by which time the release
    // has aged out of the grace window - the recheck must offer it.
    const listeners: ((state: string) => void)[] = [];
    const addSpy = jest.spyOn(AppState, "addEventListener").mockImplementation((_type, handler) => {
      listeners.push(handler as (state: string) => void);
      return { remove: jest.fn() } as never;
    });
    const nowSpy = jest.spyOn(Date, "now");
    const t0 = 1_800_000_000_000;
    nowSpy.mockReturnValue(t0);
    mockFetchDocument.mockResolvedValue({
      version: "0.9.0",
      publishedAt: new Date(t0 - 20 * HOUR).toISOString(),
    });

    const { result } = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(mockFetchDocument).toHaveBeenCalledTimes(1));
    expect(result.current.available).toBe(false);

    // 7h later the app foregrounds: throttle open, release now 27h old.
    nowSpy.mockReturnValue(t0 + 7 * HOUR);
    act(() => listeners.forEach((l) => l("active")));
    await waitFor(() => expect(result.current.available).toBe(true));

    nowSpy.mockRestore();
    addSpy.mockRestore();
  });

  it("never offers when the Play URL is unset", async () => {
    appEnv.playStoreUrl = "";
    renderHook(() => useUpdateAvailability());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockFetchDocument).not.toHaveBeenCalled();
  });

  it("opens the Play Store on Android", () => {
    const openSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const { result } = renderHook(() => useUpdateAvailability());

    act(() => result.current.act());

    expect(openSpy).toHaveBeenCalledWith(appEnv.playStoreUrl);
    openSpy.mockRestore();
  });
});

// The bug this covers (#529): every native gate read `Platform.OS !== "web"`,
// so iOS silently took the Android branch. An iPhone was offered an update
// whose button read "Open Google Play" and which opened Safari on a Play
// listing it could never install from - and the iOS release workflow bakes
// EXPO_PUBLIC_PLAY_STORE_URL into the build, so it was armed, not theoretical.
describe("useUpdateAvailability (iOS)", () => {
  const HOUR = 60 * 60 * 1000;
  let iosSpy: jest.ReplaceProperty<typeof Platform.OS> | undefined;
  let playStoreUrl: string;
  let appStoreUrl: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    platformSpy?.restore();
    iosSpy = jest.replaceProperty(Platform, "OS", "ios");
    playStoreUrl = appEnv.playStoreUrl;
    appStoreUrl = appEnv.appStoreUrl;
    // Deliberately BOTH set, so a test passing by accident is impossible: the
    // Play URL is present and must still never be used.
    appEnv.playStoreUrl = "https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend";
    appEnv.appStoreUrl = "https://apps.apple.com/app/id6796318929";
    mockRunningVersion.mockReturnValue("0.8.0");
    mockFetchDocument.mockResolvedValue({
      version: "0.9.0",
      publishedAt: new Date(Date.now() - 25 * HOUR).toISOString(),
    });
  });

  afterEach(() => {
    appEnv.playStoreUrl = playStoreUrl;
    appEnv.appStoreUrl = appStoreUrl;
    iosSpy?.restore();
    platformSpy = jest.replaceProperty(Platform, "OS", "web");
  });

  it("opens the App Store, never Google Play", async () => {
    const openSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const { result } = renderHook(() => useUpdateAvailability());
    await waitFor(() => expect(result.current.available).toBe(true));

    act(() => result.current.act());

    expect(openSpy).toHaveBeenCalledWith(appEnv.appStoreUrl);
    expect(openSpy).not.toHaveBeenCalledWith(appEnv.playStoreUrl);
    openSpy.mockRestore();
  });

  it("stays silent when no App Store URL is configured, rather than falling back to Play", async () => {
    appEnv.appStoreUrl = "";
    renderHook(() => useUpdateAvailability());
    await new Promise((resolve) => setTimeout(resolve, 50));
    // A wrong store link is worse than no banner, so a missing iOS URL must
    // suppress the offer outright even though playStoreUrl is still set.
    expect(mockFetchDocument).not.toHaveBeenCalled();
  });
});

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

// Native update offers are OFF (NATIVE_UPDATE_OFFERS_ENABLED in the hook).
//
// /version.json is written by the WEB deploy and carries only a web timestamp,
// while Android ships at rollout 0.2 - a cap that only moves when a human bumps
// it - and iOS reaches the App Store only when a human promotes a TestFlight
// build. So the 24h grace window treats "the web deployed a day ago" as "the
// store has this build", which is wrong indefinitely rather than merely early.
// Caught in review on PR #532, before it reached a user.
//
// These tests pin the SUPPRESSION, so re-enabling native offers cannot happen
// silently - it has to come with a deliberate change here, which is the point
// at which someone has to confront that /version.json still lacks real
// per-platform availability.
describe("useUpdateAvailability (native offers are suppressed)", () => {
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

  it.each(["android", "ios"] as const)(
    "never offers on %s, even a month past the grace window",
    async (os) => {
      nativeSpy = jest.replaceProperty(Platform, "OS", os);

      const { result } = renderHook(() => useUpdateAvailability());
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(result.current.available).toBe(false);
      // Not merely unoffered - the document is never even fetched, so a native
      // build does not ask a question it will not act on.
      expect(mockFetchDocument).not.toHaveBeenCalled();
    },
  );

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
});

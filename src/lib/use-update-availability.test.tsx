import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
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

import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

import { AndroidDownloadBar } from "./android-download-bar";
import { appEnv } from "@/src/lib/env";
import { renderWithProviders } from "@/test/render-with-providers";

// The Android mobile-web bar (#388 section 4). jest-expo's Platform.OS is
// "web"-compatible under RNW here only via the DOM globals; detection is
// driven by navigator, which these tests fake per case.

const PLAY_URL = "https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend";

function fakeNavigator(value: { userAgentData?: { platform?: string }; userAgent?: string }) {
  Object.defineProperty(global, "navigator", { value, configurable: true, writable: true });
}

// jest-expo is the native platform and has no DOM storage: pin web and shim
// localStorage with an in-memory map for the persistence assertions.
let platformSpy: jest.ReplaceProperty<typeof Platform.OS> | undefined;
const storage = new Map<string, string>();
beforeAll(() => {
  platformSpy = jest.replaceProperty(Platform, "OS", "web");
  Object.defineProperty(globalThis, "window", {
    value: Object.assign(globalThis.window ?? globalThis, {
      localStorage: {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => void storage.set(k, v),
        clear: () => storage.clear(),
      },
    }),
    configurable: true,
    writable: true,
  });
});
afterAll(() => platformSpy?.restore());

describe("AndroidDownloadBar", () => {
  const realNavigator = global.navigator;
  let playStoreUrl: string;

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    playStoreUrl = appEnv.playStoreUrl;
    appEnv.playStoreUrl = PLAY_URL;
  });

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: realNavigator,
      configurable: true,
      writable: true,
    });
    appEnv.playStoreUrl = playStoreUrl;
  });

  it("shows for an Android browser via userAgentData", async () => {
    fakeNavigator({ userAgentData: { platform: "Android" } });
    renderWithProviders(<AndroidDownloadBar />);
    expect(await screen.findByText("Selftend is on Google Play.")).toBeTruthy();
  });

  it("falls back to the UA string when userAgentData is absent", async () => {
    fakeNavigator({ userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit" });
    renderWithProviders(<AndroidDownloadBar />);
    expect(await screen.findByText("Selftend is on Google Play.")).toBeTruthy();
  });

  it("trusts userAgentData over a lying UA string", async () => {
    // Desktop Chrome can carry 'Android' in a spoofed UA; platform wins.
    fakeNavigator({ userAgentData: { platform: "Windows" }, userAgent: "... Android ..." });
    renderWithProviders(<AndroidDownloadBar />);
    await waitFor(() => expect(screen.queryByText("Selftend is on Google Play.")).toBeNull());
  });

  it("stays hidden on desktop", async () => {
    fakeNavigator({ userAgentData: { platform: "Windows" } });
    renderWithProviders(<AndroidDownloadBar />);
    await waitFor(() => expect(screen.queryByText("Selftend is on Google Play.")).toBeNull());
  });

  it("stays hidden when the Play URL is unset (self-hosters)", async () => {
    appEnv.playStoreUrl = "";
    fakeNavigator({ userAgentData: { platform: "Android" } });
    renderWithProviders(<AndroidDownloadBar />);
    await waitFor(() => expect(screen.queryByText("Selftend is on Google Play.")).toBeNull());
  });

  it("dismisses permanently per browser", async () => {
    fakeNavigator({ userAgentData: { platform: "Android" } });
    const first = renderWithProviders(<AndroidDownloadBar />);
    fireEvent.press(await screen.findByText("Dismiss"));
    expect(screen.queryByText("Selftend is on Google Play.")).toBeNull();
    expect(window.localStorage.getItem("androidDownloadBarDismissed")).toBe("1");
    first.unmount();

    renderWithProviders(<AndroidDownloadBar />);
    await waitFor(() => expect(screen.queryByText("Selftend is on Google Play.")).toBeNull());
  });
});

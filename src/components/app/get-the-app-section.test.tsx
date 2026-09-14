import { fireEvent, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { GetTheAppSection } from "./get-the-app-section";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { STORE_LINK_SOURCES } from "@/src/lib/store-links";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/lib/linking", () => ({
  openExternalUrl: jest.fn(),
}));

const mockOpen = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;

const PLAY_URL = "https://play.google.com/store/apps/details?id=com.selftend.app";
const APPLE_URL = "https://apps.apple.com/app/selftend/id0000000000";
const SOURCE = STORE_LINK_SOURCES.getTheApp;

function setPlatform(os: "web" | "ios" | "android") {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

afterEach(() => {
  setPlatform("ios");
  jest.clearAllMocks();
});

describe("GetTheAppSection", () => {
  it("renders nothing on native platforms", () => {
    setPlatform("android");
    renderWithProviders(
      <GetTheAppSection source={SOURCE} playStoreUrl={PLAY_URL} appStoreUrl="" />,
    );

    expect(screen.queryByText("Get the mobile app")).toBeNull();
  });

  it("shows a live store link when the URL is configured", () => {
    setPlatform("web");
    renderWithProviders(
      <GetTheAppSection source={SOURCE} playStoreUrl={PLAY_URL} appStoreUrl="" />,
    );

    fireEvent.press(screen.getByLabelText("Get the Android app on Google Play"));

    expect(mockOpen).toHaveBeenCalledWith(PLAY_URL);
  });

  it("omits the store whose URL is empty rather than promising it", () => {
    setPlatform("web");
    renderWithProviders(
      <GetTheAppSection source={SOURCE} playStoreUrl={PLAY_URL} appStoreUrl="" />,
    );

    expect(screen.getByLabelText("Get the Android app on Google Play")).toBeTruthy();
    expect(screen.queryByLabelText("Get the iOS app on the App Store")).toBeNull();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  // A fork that opted out of both listings: the heading would otherwise sit over
  // nothing.
  it("renders nothing at all when neither store is configured", () => {
    setPlatform("web");
    renderWithProviders(<GetTheAppSection source={SOURCE} playStoreUrl="" appStoreUrl="" />);

    expect(screen.queryByText("Get the mobile app")).toBeNull();
    expect(screen.queryByLabelText("Get the Android app on Google Play")).toBeNull();
  });

  // ☠️ Every test above overrides both URLs, so none of them touches the tagging
  // path at all - revert the component to `appEnv.playStoreUrl` and they all
  // still pass. These two render it the way the app does.
  describe("the tag the app actually opens", () => {
    let playStoreUrl: string;
    let appStoreUrl: string;

    beforeEach(() => {
      playStoreUrl = appEnv.playStoreUrl;
      appStoreUrl = appEnv.appStoreUrl;
      appEnv.playStoreUrl = PLAY_URL;
      appEnv.appStoreUrl = APPLE_URL;
      setPlatform("web");
    });

    afterEach(() => {
      appEnv.playStoreUrl = playStoreUrl;
      appEnv.appStoreUrl = appStoreUrl;
    });

    // ☠️ The same component, two mount points, two audiences. The signed-in user
    // menu only ever renders for somebody who already has an account, so it
    // carries an `app-` source; the sign-in landing carries a `web-` one. One
    // name across both would read existing users as fresh acquisitions (#2324).
    it.each([
      [STORE_LINK_SOURCES.getTheApp, "web-get-the-app"],
      [STORE_LINK_SOURCES.userMenu, "app-user-menu"],
    ])("opens both stores tagged %s", (source, expected) => {
      renderWithProviders(<GetTheAppSection source={source} />);

      fireEvent.press(screen.getByLabelText("Get the Android app on Google Play"));
      fireEvent.press(screen.getByLabelText("Get the iOS app on the App Store"));

      expect(mockOpen.mock.calls.map(([url]) => url)).toEqual([
        `${PLAY_URL}&referrer=utm_source%3D${expected}`,
        `${APPLE_URL}?ct=${expected}`,
      ]);
    });
  });
});

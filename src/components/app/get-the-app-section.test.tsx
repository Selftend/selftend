import { fireEvent, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { GetTheAppSection } from "./get-the-app-section";
import { openExternalUrl } from "@/src/lib/linking";
import { STORE_LINK_SOURCES, taggedPlayStoreUrl } from "@/src/lib/store-links";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/lib/linking", () => ({
  openExternalUrl: jest.fn(),
}));

const mockOpen = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;

const PLAY_URL = "https://play.google.com/store/apps/details?id=com.selftend.app";
const APPLE_URL = "https://apps.apple.com/app/selftend/id0000000000";
const SOURCE = STORE_LINK_SOURCES.webAuthLanding;

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

    expect(mockOpen).toHaveBeenCalledWith(taggedPlayStoreUrl(SOURCE, PLAY_URL));
  });

  // The same section sits on the sign-in landing and in the signed-in user
  // menu, and those are different audiences: the tag is what keeps an existing
  // web user from reading as a fresh acquisition (measurement.md § 5).
  it("tags each store link with the surface it was mounted on", () => {
    setPlatform("web");
    renderWithProviders(
      <GetTheAppSection
        source={STORE_LINK_SOURCES.appUserMenu}
        playStoreUrl={PLAY_URL}
        appStoreUrl={APPLE_URL}
      />,
    );

    fireEvent.press(screen.getByLabelText("Get the Android app on Google Play"));
    fireEvent.press(screen.getByLabelText("Get the iOS app on the App Store"));

    expect(mockOpen.mock.calls.map(([url]) => url)).toEqual([
      `${PLAY_URL}&referrer=utm_source%3Dapp-user-menu`,
      `${APPLE_URL}?ct=app-user-menu`,
    ]);
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
});

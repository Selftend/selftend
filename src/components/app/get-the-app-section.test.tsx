import { fireEvent, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { GetTheAppSection } from "./get-the-app-section";
import { openExternalUrl } from "@/src/lib/linking";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/lib/linking", () => ({
  openExternalUrl: jest.fn(),
}));

const mockOpen = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;

const PLAY_URL = "https://play.google.com/store/apps/details?id=com.selftend.app";

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
    renderWithProviders(<GetTheAppSection playStoreUrl={PLAY_URL} appStoreUrl="" />);

    expect(screen.queryByText("Get the mobile app")).toBeNull();
  });

  it("shows a live store link when the URL is configured", () => {
    setPlatform("web");
    renderWithProviders(<GetTheAppSection playStoreUrl={PLAY_URL} appStoreUrl="" />);

    fireEvent.press(screen.getByLabelText("Get the Android app on Google Play"));

    expect(mockOpen).toHaveBeenCalledWith(PLAY_URL);
  });

  it("shows a coming-soon chip per platform when the URL is empty", () => {
    setPlatform("web");
    renderWithProviders(<GetTheAppSection playStoreUrl="" appStoreUrl="" />);

    expect(screen.getAllByText("Coming soon")).toHaveLength(2);
    expect(screen.queryByLabelText("Get the Android app on Google Play")).toBeNull();
  });
});

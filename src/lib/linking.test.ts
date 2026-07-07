import { Linking, Platform } from "react-native";

import { openExternalUrl } from "@/src/lib/linking";

const globalWithWindow = globalThis as unknown as { window?: { open: jest.Mock } };
const ORIGINAL_WINDOW = globalWithWindow.window;

afterEach(() => {
  // jest-expo defaults Platform.OS to "ios"; restore it after web tests.
  Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  globalWithWindow.window = ORIGINAL_WINDOW;
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe("openExternalUrl", () => {
  it("opens a new tab with noopener on web", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    const open = jest.fn();
    globalWithWindow.window = { open };

    openExternalUrl("https://example.com");

    expect(open).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
  });

  it("delegates to Linking.openURL on native", () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);

    openExternalUrl("https://example.com");

    expect(openURL).toHaveBeenCalledWith("https://example.com");
  });

  it("logs and swallows Linking.openURL rejections", async () => {
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no handler"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    openExternalUrl("https://example.com");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("https://example.com"),
      expect.any(Error),
    );
  });

  it("does nothing for an empty url", () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);

    openExternalUrl("");

    expect(openURL).not.toHaveBeenCalled();
  });
});

import { Platform } from "react-native";
import * as Linking from "expo-linking";

import {
  getNativeAuthRedirectUrl,
  getPasswordResetRedirectUrl,
  getWebAuthRedirectUrl,
} from "@/src/features/auth/api";

jest.mock("expo-linking", () => ({
  createURL: jest.fn(),
}));

jest.mock("@/src/lib/env", () => ({
  appEnv: { publicAppUrl: "https://selftend.org" },
}));

describe("getWebAuthRedirectUrl", () => {
  beforeEach(() => {
    jest.mocked(Linking.createURL).mockReset();
  });

  it("builds the callback from the configured public app URL", () => {
    expect(getWebAuthRedirectUrl("https://selftend.org")).toBe(
      "https://selftend.org/auth-callback",
    );
  });

  it("handles a configured public app URL with a trailing slash", () => {
    expect(getWebAuthRedirectUrl("https://selftend.org/")).toBe(
      "https://selftend.org/auth-callback",
    );
  });

  it("falls back to Expo Linking when no public app URL is configured", () => {
    jest.mocked(Linking.createURL).mockReturnValue("http://localhost:8081/auth-callback");

    expect(getWebAuthRedirectUrl("")).toBe("http://localhost:8081/auth-callback");
    expect(Linking.createURL).toHaveBeenCalledWith("auth-callback");
  });
});

describe("getNativeAuthRedirectUrl", () => {
  beforeEach(() => {
    jest.mocked(Linking.createURL).mockReset();
  });

  it("delegates to Linking.createURL with the auth callback path", () => {
    jest.mocked(Linking.createURL).mockReturnValue("selftend://auth-callback");

    expect(getNativeAuthRedirectUrl()).toBe("selftend://auth-callback");
    expect(Linking.createURL).toHaveBeenCalledWith("auth-callback");
  });
});

describe("getPasswordResetRedirectUrl", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.mocked(Linking.createURL).mockReset();
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
  });

  it("carries the recovery type marker on web so the PKCE callback knows it is a reset", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });

    expect(getPasswordResetRedirectUrl()).toBe("https://selftend.org/auth-callback?type=recovery");
  });

  it("passes the recovery type as a deep-link query param on native", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    jest.mocked(Linking.createURL).mockReturnValue("selftend://auth-callback?type=recovery");

    expect(getPasswordResetRedirectUrl()).toBe("selftend://auth-callback?type=recovery");
    expect(Linking.createURL).toHaveBeenCalledWith("auth-callback", {
      queryParams: { type: "recovery" },
    });
  });
});

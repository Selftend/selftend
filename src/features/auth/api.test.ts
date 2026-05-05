import * as Linking from "expo-linking";

import { getWebAuthRedirectUrl } from "@/src/features/auth/api";

jest.mock("expo-linking", () => ({
  createURL: jest.fn(),
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

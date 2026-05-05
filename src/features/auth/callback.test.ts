import { parseAuthCallbackUrl } from "@/src/features/auth/callback";

describe("parseAuthCallbackUrl", () => {
  it("reads auth codes from the query string", () => {
    expect(parseAuthCallbackUrl("selftend://auth-callback?code=abc123&type=recovery")).toEqual({
      accessToken: null,
      refreshToken: null,
      code: "abc123",
      tokenHash: null,
      type: "recovery",
      errorCode: null,
      errorDescription: null,
    });
  });

  it("reads sessions from the URL hash", () => {
    expect(
      parseAuthCallbackUrl(
        "selftend://auth-callback#access_token=access&refresh_token=refresh&type=signup",
      ),
    ).toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      code: null,
      tokenHash: null,
      type: "signup",
      errorCode: null,
      errorDescription: null,
    });
  });

  it("reads token hashes and auth errors", () => {
    expect(
      parseAuthCallbackUrl(
        "http://localhost:8081/auth-callback?token_hash=token123&type=email&error_description=Link+expired",
      ),
    ).toEqual({
      accessToken: null,
      refreshToken: null,
      code: null,
      tokenHash: "token123",
      type: "email",
      errorCode: null,
      errorDescription: "Link expired",
    });
  });
});

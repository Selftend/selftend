import { completeAuthRedirect, parseAuthCallbackUrl } from "@/src/features/auth/callback";

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

const mockSetSession = jest.fn();
const mockExchangeCode = jest.fn();
const mockVerifyOtp = jest.fn();

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: () => ({
    auth: {
      setSession: mockSetSession,
      exchangeCodeForSession: mockExchangeCode,
      verifyOtp: mockVerifyOtp,
    },
  }),
}));

describe("completeAuthRedirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetSession.mockResolvedValue({ data: { session: {} }, error: null });
    mockExchangeCode.mockResolvedValue({ data: { session: {} }, error: null });
    mockVerifyOtp.mockResolvedValue({ data: { session: {} }, error: null });
  });

  it("returns email-verified for a signup confirmation (hash tokens + type=signup)", async () => {
    const outcome = await completeAuthRedirect(
      "http://localhost:8081/auth-callback#access_token=a&refresh_token=r&type=signup",
    );
    expect(outcome).toBe("email-verified");
  });

  it("returns email-verified for a signup code exchange (PKCE)", async () => {
    const outcome = await completeAuthRedirect("selftend://auth-callback?code=abc&type=signup");
    expect(outcome).toBe("email-verified");
  });

  it("returns email-verified for a signup token_hash (verifyOtp)", async () => {
    const outcome = await completeAuthRedirect(
      "http://localhost:8081/auth-callback?token_hash=th&type=signup",
    );
    expect(outcome).toBe("email-verified");
  });

  it("returns password-recovery for a recovery link", async () => {
    const outcome = await completeAuthRedirect("selftend://auth-callback?code=abc&type=recovery");
    expect(outcome).toBe("password-recovery");
  });

  it("returns authenticated for a plain session link with no type", async () => {
    const outcome = await completeAuthRedirect(
      "http://localhost:8081/auth-callback#access_token=a&refresh_token=r",
    );
    expect(outcome).toBe("authenticated");
  });
});

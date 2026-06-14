import { completeAuthRedirect, parseAuthCallbackUrl } from "@/src/features/auth/callback";

describe("parseAuthCallbackUrl", () => {
  it("reads auth codes from the query string", () => {
    expect(parseAuthCallbackUrl("selftend://auth-callback?code=abc123&type=recovery")).toEqual({
      code: "abc123",
      tokenHash: null,
      type: "recovery",
      errorCode: null,
      errorDescription: null,
    });
  });

  it("ignores access/refresh tokens in the URL hash (implicit grant is not honored)", () => {
    // The tokens an attacker could put in the hash are no longer extracted; only the
    // non-credential `type` is read. Without code/token_hash this URL carries nothing
    // that can establish a session.
    expect(
      parseAuthCallbackUrl(
        "selftend://auth-callback#access_token=access&refresh_token=refresh&type=signup",
      ),
    ).toEqual({
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
      code: null,
      tokenHash: "token123",
      type: "email",
      errorCode: null,
      errorDescription: "Link expired",
    });
  });
});

const mockExchangeCode = jest.fn();
const mockVerifyOtp = jest.fn();

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCode,
      verifyOtp: mockVerifyOtp,
    },
  }),
}));

describe("completeAuthRedirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExchangeCode.mockResolvedValue({ data: { session: {} }, error: null });
    mockVerifyOtp.mockResolvedValue({ data: { session: {} }, error: null });
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

  // Security: a callback link carrying caller-supplied session tokens must NOT establish
  // a session (it would be session fixation - landing the victim in the attacker's
  // account). Without code/token_hash, completion rejects.
  it("rejects a link carrying only hash access/refresh tokens (no session fixation)", async () => {
    await expect(
      completeAuthRedirect("http://localhost:8081/auth-callback#access_token=a&refresh_token=r"),
    ).rejects.toThrow("missing the required parameters");
    await expect(
      completeAuthRedirect(
        "http://localhost:8081/auth-callback#access_token=a&refresh_token=r&type=signup",
      ),
    ).rejects.toThrow("missing the required parameters");
  });
});

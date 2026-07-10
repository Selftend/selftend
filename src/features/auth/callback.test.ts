import { completeAuthRedirect, parseAuthCallbackUrl } from "@/src/features/auth/callback";
import { AuthCallbackError, isAuthCallbackError } from "@/src/features/auth/callback-errors";

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
    ).rejects.toThrow(new AuthCallbackError("missing_params"));
    await expect(
      completeAuthRedirect(
        "http://localhost:8081/auth-callback#access_token=a&refresh_token=r&type=signup",
      ),
    ).rejects.toThrow(new AuthCallbackError("missing_params"));
  });

  async function completionFailure(url: string): Promise<unknown> {
    try {
      await completeAuthRedirect(url);
    } catch (error) {
      return error;
    }
    throw new Error("expected completeAuthRedirect to reject");
  }

  // The URL's error_description is attacker-influenceable text (anyone can hand a
  // victim `.../auth-callback?error_description=<phishing copy>`); it must never
  // survive into the thrown error.
  it("never propagates a hostile error_description - it classifies instead", async () => {
    const hostile = "Your account was locked, call +1-555-0100 to unlock";
    const error = await completionFailure(
      `http://localhost:8081/auth-callback?error_code=weird_new_code&error_description=${encodeURIComponent(hostile)}`,
    );

    expect(isAuthCallbackError(error)).toBe(true);
    expect((error as AuthCallbackError).code).toBe("generic");
    expect((error as Error).message).not.toContain("locked");
    expect((error as Error).message).not.toContain("555");
  });

  it("classifies otp_expired URL errors as expired_or_used", async () => {
    const error = await completionFailure(
      "http://localhost:8081/auth-callback?error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
    );
    expect((error as AuthCallbackError).code).toBe("expired_or_used");
  });

  it("classifies a failed verifyOtp (expired token_hash) as expired_or_used", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { session: null },
      error: Object.assign(new Error("Email link is invalid or has expired"), {
        code: "otp_expired",
      }),
    });

    const error = await completionFailure(
      "http://localhost:8081/auth-callback?token_hash=th&type=recovery",
    );
    expect(isAuthCallbackError(error)).toBe(true);
    expect((error as AuthCallbackError).code).toBe("expired_or_used");
    expect((error as Error).message).not.toContain("invalid or has expired");
  });

  it("classifies a code-verifier failure (link opened in another browser) as cross_device", async () => {
    mockExchangeCode.mockResolvedValue({
      data: { session: null },
      error: Object.assign(
        new Error("invalid request: both auth code and code verifier should be non-empty"),
        { code: "validation_failed" },
      ),
    });

    const error = await completionFailure("http://localhost:8081/auth-callback?code=abc");
    expect((error as AuthCallbackError).code).toBe("cross_device");
  });

  it("classifies an expired PKCE flow state as expired_or_used", async () => {
    mockExchangeCode.mockResolvedValue({
      data: { session: null },
      error: Object.assign(new Error("invalid flow state, no valid flow state found"), {
        code: "flow_state_not_found",
      }),
    });

    const error = await completionFailure("http://localhost:8081/auth-callback?code=abc");
    expect((error as AuthCallbackError).code).toBe("expired_or_used");
  });
});

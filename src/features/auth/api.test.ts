import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import {
  EMAIL_ALREADY_EXISTS_ERROR,
  EMAIL_RATE_LIMITED_ERROR,
  IDENTITY_ALREADY_EXISTS_ERROR,
  INVALID_CREDENTIALS_ERROR,
  LEAKED_PASSWORD_ERROR,
  SESSION_MISSING_ERROR,
  convertGuestWithPassword,
  linkGoogleIdentity,
  getNativeAuthRedirectUrl,
  getPasswordResetRedirectUrl,
  getWebAuthRedirectUrl,
  resendVerificationEmail,
  sendPasswordResetEmail,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updatePassword,
} from "@/src/features/auth/api";
import { completeAuthRedirect } from "@/src/features/auth/callback";
import { AuthCallbackError } from "@/src/features/auth/callback-errors";
import { captureError } from "@/src/lib/sentry";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("expo-linking", () => ({
  createURL: jest.fn(),
}));

jest.mock("@/src/features/auth/session-marker", () => ({
  clearSessionMarker: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
}));

jest.mock("@/src/lib/env", () => ({
  appEnv: { publicAppUrl: "https://selftend.org" },
}));

jest.mock("@/src/features/auth/callback", () => ({
  completeAuthRedirect: jest.fn(),
}));

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));

jest.mock("@/src/lib/sentry", () => ({
  captureError: jest.fn(),
  isReportableError: jest.fn().mockReturnValue(true),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);
const mockCompleteAuthRedirect = jest.mocked(completeAuthRedirect);
const mockOpenAuthSession = jest.mocked(WebBrowser.openAuthSessionAsync);

// The auth surface only ever touches `client.auth.*`, so a bare object with the
// methods the function under test calls is enough - cast through unknown to the
// real client type (like the repository tests' buildClient helper).
function buildAuthClient(auth: Record<string, unknown>) {
  return { auth } as unknown as ReturnType<typeof requireSupabase>;
}

function setPlatform(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

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

  // The email templates build `{{ .SiteURL }}/auth-callback?token_hash=...&type=recovery`
  // server-side; the redirect URL the app sends no longer feeds the link, but it
  // stays query-less so it matches the redirect allowlist entries exactly.
  it("is query-less on web (the recovery template supplies token_hash and type)", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });

    expect(getPasswordResetRedirectUrl()).toBe("https://selftend.org/auth-callback");
  });

  it("is the plain deep link on native (no marker query params)", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    jest.mocked(Linking.createURL).mockReturnValue("selftend://auth-callback");

    expect(getPasswordResetRedirectUrl()).toBe("selftend://auth-callback");
    expect(Linking.createURL).toHaveBeenCalledWith("auth-callback");
  });
});

describe("signInWithGoogle", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Linking.createURL).mockReturnValue("selftend://auth-callback");
  });

  afterEach(() => {
    setPlatform(originalOS);
  });

  it("passes google provider options and skips the browser redirect on native", async () => {
    setPlatform("ios");
    const signInWithOAuth = jest
      .fn()
      .mockResolvedValue({ data: { url: "https://oauth.example" }, error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signInWithOAuth }));
    mockOpenAuthSession.mockResolvedValue({
      type: "success",
      url: "selftend://auth-callback#token",
    } as never);

    const result = await signInWithGoogle();

    expect(result).toBe(true);
    const call = (signInWithOAuth.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(call).toMatchObject({
      provider: "google",
      options: {
        redirectTo: "selftend://auth-callback",
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    expect(mockCompleteAuthRedirect).toHaveBeenCalledWith("selftend://auth-callback#token");
  });

  it("throws when the OAuth call returns an error", async () => {
    setPlatform("ios");
    const oauthError = new Error("oauth boom");
    const signInWithOAuth = jest.fn().mockResolvedValue({ data: null, error: oauthError });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signInWithOAuth }));

    await expect(signInWithGoogle()).rejects.toBe(oauthError);
    expect(mockOpenAuthSession).not.toHaveBeenCalled();
  });

  it("returns false immediately on web (no browser session opened)", async () => {
    setPlatform("web");
    const signInWithOAuth = jest.fn().mockResolvedValue({ data: { url: null }, error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signInWithOAuth }));

    expect(await signInWithGoogle()).toBe(false);
    const call = (signInWithOAuth.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(call).toMatchObject({ options: { skipBrowserRedirect: false } });
    expect(mockOpenAuthSession).not.toHaveBeenCalled();
  });

  it("throws when native OAuth returns no auth URL", async () => {
    setPlatform("android");
    const signInWithOAuth = jest.fn().mockResolvedValue({ data: { url: undefined }, error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signInWithOAuth }));

    await expect(signInWithGoogle()).rejects.toThrow("Unable to start Google sign-in.");
  });

  it("returns false when the browser session is not a success", async () => {
    setPlatform("ios");
    const signInWithOAuth = jest
      .fn()
      .mockResolvedValue({ data: { url: "https://oauth.example" }, error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signInWithOAuth }));
    mockOpenAuthSession.mockResolvedValue({ type: "cancel" } as never);

    expect(await signInWithGoogle()).toBe(false);
    expect(mockCompleteAuthRedirect).not.toHaveBeenCalled();
  });
});

describe("signInWithPassword", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves without throwing when there is no error", async () => {
    const signIn = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signInWithPassword: signIn }));

    await expect(signInWithPassword("a@b.co", "pw")).resolves.toBeUndefined();
    expect(signIn).toHaveBeenCalledWith({ email: "a@b.co", password: "pw" });
  });

  it("maps invalid_credentials to the friendly error", async () => {
    const signIn = jest
      .fn()
      .mockResolvedValue({ error: { code: "invalid_credentials", message: "no" } });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signInWithPassword: signIn }));

    await expect(signInWithPassword("a@b.co", "pw")).rejects.toThrow(INVALID_CREDENTIALS_ERROR);
  });

  it("rethrows any other error unchanged", async () => {
    const raw = { code: "over_request_rate_limit", message: "slow down" };
    const signIn = jest.fn().mockResolvedValue({ error: raw });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signInWithPassword: signIn }));

    await expect(signInWithPassword("a@b.co", "pw")).rejects.toBe(raw);
  });
});

describe("signUpWithPassword", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform("web");
  });

  afterEach(() => {
    setPlatform(originalOS);
  });

  it("includes full_name in the payload when a name is provided (trimmed)", async () => {
    const data = { user: { identities: [{ id: "1" }] } };
    const signUp = jest.fn().mockResolvedValue({ data, error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signUp }));

    const result = await signUpWithPassword("a@b.co", "pw", "  Ada  ");

    expect(result).toBe(data);
    const call = (signUp.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(call).toMatchObject({
      email: "a@b.co",
      password: "pw",
      options: {
        emailRedirectTo: "https://selftend.org/auth-callback",
        data: { full_name: "Ada" },
      },
    });
  });

  it("omits the data field when no name is provided", async () => {
    const data = { user: { identities: [{ id: "1" }] } };
    const signUp = jest.fn().mockResolvedValue({ data, error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signUp }));

    await signUpWithPassword("a@b.co", "pw");

    const call = (signUp.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    const options = call.options as Record<string, unknown>;
    expect(options).not.toHaveProperty("data");
  });

  it("omits the data field when the name is only whitespace", async () => {
    const data = { user: { identities: [{ id: "1" }] } };
    const signUp = jest.fn().mockResolvedValue({ data, error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signUp }));

    await signUpWithPassword("a@b.co", "pw", "   ");

    const call = (signUp.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    const options = call.options as Record<string, unknown>;
    expect(options).not.toHaveProperty("data");
  });

  it("maps a pwned weak_password error to LEAKED_PASSWORD_ERROR", async () => {
    const error = Object.assign(new Error("weak"), {
      code: "weak_password",
      weakPassword: { reasons: ["pwned"] },
    });
    const signUp = jest.fn().mockResolvedValue({ data: null, error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signUp }));

    await expect(signUpWithPassword("a@b.co", "pw")).rejects.toThrow(LEAKED_PASSWORD_ERROR);
  });

  it("does not treat a weak_password without pwned reasons as leaked", async () => {
    const error = Object.assign(new Error("weak"), {
      code: "weak_password",
      weakPassword: { reasons: ["too_short"] },
    });
    const signUp = jest.fn().mockResolvedValue({ data: null, error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signUp }));

    await expect(signUpWithPassword("a@b.co", "pw")).rejects.toBe(error);
  });

  it("treats a weak_password with no reasons array as not leaked (nullish arm)", async () => {
    const error = Object.assign(new Error("weak"), { code: "weak_password" });
    const signUp = jest.fn().mockResolvedValue({ data: null, error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signUp }));

    await expect(signUpWithPassword("a@b.co", "pw")).rejects.toBe(error);
  });

  it("maps a user_already_exists error to EMAIL_ALREADY_EXISTS_ERROR", async () => {
    const error = Object.assign(new Error("exists"), { code: "user_already_exists" });
    const signUp = jest.fn().mockResolvedValue({ data: null, error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signUp }));

    await expect(signUpWithPassword("a@b.co", "pw")).rejects.toThrow(EMAIL_ALREADY_EXISTS_ERROR);
  });

  it("rethrows an unrelated non-Error error object unchanged", async () => {
    const error = { code: "unexpected" };
    const signUp = jest.fn().mockResolvedValue({ data: null, error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signUp }));

    await expect(signUpWithPassword("a@b.co", "pw")).rejects.toBe(error);
  });

  it("maps empty identities (enumeration protection on) to EMAIL_ALREADY_EXISTS_ERROR", async () => {
    const data = { user: { identities: [] } };
    const signUp = jest.fn().mockResolvedValue({ data, error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signUp }));

    await expect(signUpWithPassword("a@b.co", "pw")).rejects.toThrow(EMAIL_ALREADY_EXISTS_ERROR);
  });

  it("returns data when there is no user on the response", async () => {
    const data = { user: null };
    const signUp = jest.fn().mockResolvedValue({ data, error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signUp }));

    expect(await signUpWithPassword("a@b.co", "pw")).toBe(data);
  });
});

describe("convertGuestWithPassword", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates the guest with email + password, then refreshes the session", async () => {
    const updateUser = jest.fn().mockResolvedValue({ error: null });
    const refreshSession = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ updateUser, refreshSession }));

    await expect(convertGuestWithPassword("a@b.co", "twelvechars1!")).resolves.toBeUndefined();
    expect(updateUser).toHaveBeenCalledWith({ email: "a@b.co", password: "twelvechars1!" });
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it("carries a trimmed display name as full_name metadata", async () => {
    const updateUser = jest.fn().mockResolvedValue({ error: null });
    const refreshSession = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ updateUser, refreshSession }));

    await convertGuestWithPassword("a@b.co", "twelvechars1!", "  Ada  ");
    expect(updateUser).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "twelvechars1!",
      data: { full_name: "Ada" },
    });
  });

  it("maps the email_exists collision to EMAIL_ALREADY_EXISTS_ERROR without refreshing", async () => {
    const error = Object.assign(new Error("exists"), { code: "email_exists", status: 422 });
    const updateUser = jest.fn().mockResolvedValue({ error });
    const refreshSession = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ updateUser, refreshSession }));

    await expect(convertGuestWithPassword("a@b.co", "pw")).rejects.toThrow(
      EMAIL_ALREADY_EXISTS_ERROR,
    );
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("maps a pwned weak_password error to LEAKED_PASSWORD_ERROR", async () => {
    const error = Object.assign(new Error("weak"), {
      code: "weak_password",
      weakPassword: { reasons: ["pwned"] },
    });
    const updateUser = jest.fn().mockResolvedValue({ error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ updateUser }));

    await expect(convertGuestWithPassword("a@b.co", "pw")).rejects.toThrow(LEAKED_PASSWORD_ERROR);
  });

  it("rethrows an unmapped update error unchanged", async () => {
    const error = new Error("boom");
    const updateUser = jest.fn().mockResolvedValue({ error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ updateUser }));

    await expect(convertGuestWithPassword("a@b.co", "pw")).rejects.toBe(error);
  });

  it("treats a refresh failure as non-fatal: the account is already converted", async () => {
    const refreshError = new Error("refresh down");
    const updateUser = jest.fn().mockResolvedValue({ error: null });
    const refreshSession = jest.fn().mockResolvedValue({ error: refreshError });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ updateUser, refreshSession }));

    await expect(convertGuestWithPassword("a@b.co", "pw")).resolves.toBeUndefined();
    expect(captureError).toHaveBeenCalledWith(refreshError);
  });
});

describe("sendPasswordResetEmail", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform("web");
  });

  afterEach(() => {
    setPlatform(originalOS);
  });

  it("passes the query-less reset redirect and resolves on success", async () => {
    const reset = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ resetPasswordForEmail: reset }));

    await expect(sendPasswordResetEmail("a@b.co")).resolves.toBeUndefined();
    expect(reset).toHaveBeenCalledWith("a@b.co", {
      redirectTo: "https://selftend.org/auth-callback",
    });
  });

  it("throws when reset returns an error", async () => {
    const error = new Error("reset failed");
    const reset = jest.fn().mockResolvedValue({ error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ resetPasswordForEmail: reset }));

    await expect(sendPasswordResetEmail("a@b.co")).rejects.toBe(error);
  });

  it("maps a 429 to EMAIL_RATE_LIMITED_ERROR", async () => {
    const error = Object.assign(new Error("email rate limit exceeded"), { status: 429 });
    const reset = jest.fn().mockResolvedValue({ error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ resetPasswordForEmail: reset }));

    await expect(sendPasswordResetEmail("a@b.co")).rejects.toThrow(EMAIL_RATE_LIMITED_ERROR);
  });

  it("maps the over_email_send_rate_limit code to EMAIL_RATE_LIMITED_ERROR", async () => {
    const error = Object.assign(new Error("email rate limit exceeded"), {
      code: "over_email_send_rate_limit",
    });
    const reset = jest.fn().mockResolvedValue({ error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ resetPasswordForEmail: reset }));

    await expect(sendPasswordResetEmail("a@b.co")).rejects.toThrow(EMAIL_RATE_LIMITED_ERROR);
  });
});

describe("updatePassword", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves when the update succeeds", async () => {
    const updateUser = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ updateUser }));

    await expect(updatePassword("newpw")).resolves.toBeUndefined();
    expect(updateUser).toHaveBeenCalledWith({ password: "newpw" });
  });

  it("maps a pwned weak_password error to LEAKED_PASSWORD_ERROR", async () => {
    const error = Object.assign(new Error("weak"), {
      code: "weak_password",
      weakPassword: { reasons: ["pwned"] },
    });
    const updateUser = jest.fn().mockResolvedValue({ error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ updateUser }));

    await expect(updatePassword("newpw")).rejects.toThrow(LEAKED_PASSWORD_ERROR);
  });

  it("rethrows a non-leaked error unchanged", async () => {
    const error = new Error("some other failure");
    const updateUser = jest.fn().mockResolvedValue({ error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ updateUser }));

    await expect(updatePassword("newpw")).rejects.toBe(error);
  });

  it("maps a missing recovery session to SESSION_MISSING_ERROR", async () => {
    const error = new Error("Auth session missing!");
    error.name = "AuthSessionMissingError";
    const updateUser = jest.fn().mockResolvedValue({ error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ updateUser }));

    await expect(updatePassword("newpw")).rejects.toThrow(SESSION_MISSING_ERROR);
  });
});

describe("resendVerificationEmail", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform("web");
  });

  afterEach(() => {
    setPlatform(originalOS);
  });

  it("resends a signup email with the auth redirect and resolves", async () => {
    const resend = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ resend }));

    await expect(resendVerificationEmail("a@b.co")).resolves.toBeUndefined();
    expect(resend).toHaveBeenCalledWith({
      type: "signup",
      email: "a@b.co",
      options: { emailRedirectTo: "https://selftend.org/auth-callback" },
    });
  });

  it("throws when resend returns an error", async () => {
    const error = new Error("resend failed");
    const resend = jest.fn().mockResolvedValue({ error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ resend }));

    await expect(resendVerificationEmail("a@b.co")).rejects.toBe(error);
  });
});

describe("signOut", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const { clearSessionMarker } = jest.requireMock("@/src/features/auth/session-marker") as {
    clearSessionMarker: jest.Mock;
  };

  it("resolves when sign-out succeeds", async () => {
    const signOutFn = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signOut: signOutFn }));

    await expect(signOut("local")).resolves.toBeUndefined();
    expect(signOutFn).toHaveBeenCalledTimes(1);
  });

  it("throws when sign-out returns an error", async () => {
    const error = new Error("signout failed");
    const signOutFn = jest.fn().mockResolvedValue({ error });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signOut: signOutFn }));

    await expect(signOut("local")).rejects.toBe(error);
  });

  // #1450: this wrapper is the ONLY marker-clearing seam - both deliberate
  // exits (settings sign-out, delete-account) call it, and the involuntary
  // paths bypass it by design. A deliberate exit must not read as a lost
  // session on the next cold start; a FAILED sign-out is not an exit at all.
  it("clears the fresh-start marker on a deliberate exit", async () => {
    const signOutFn = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signOut: signOutFn }));

    await signOut("local");

    expect(clearSessionMarker).toHaveBeenCalledTimes(1);
  });

  it("keeps the marker when sign-out fails - the session is still this device's", async () => {
    const signOutFn = jest.fn().mockResolvedValue({ error: new Error("offline") });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signOut: signOutFn }));

    await expect(signOut("local")).rejects.toBeTruthy();
    expect(clearSessionMarker).not.toHaveBeenCalled();
  });

  // The point of the wrapper (#968). supabase-js defaults to `scope: 'global'`,
  // which revokes EVERY refresh token the user holds - signing out on the laptop
  // ends the session on the phone. These two pin that the scope reaching auth-js
  // is the one the caller asked for, never an omitted argument falling back to
  // that default. Assert the whole options object, not `objectContaining`: an
  // extra key here would be another silent default riding along.
  it("passes scope 'local' straight through, so other devices keep their session", async () => {
    const signOutFn = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signOut: signOutFn }));

    await signOut("local");

    expect(signOutFn).toHaveBeenCalledWith({ scope: "local" });
  });

  it("passes scope 'global' straight through, for the post-deletion call", async () => {
    const signOutFn = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildAuthClient({ signOut: signOutFn }));

    await signOut("global");

    expect(signOutFn).toHaveBeenCalledWith({ scope: "global" });
  });
});

describe("linkGoogleIdentity", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Linking.createURL).mockReturnValue("selftend://auth-callback");
  });

  afterEach(() => {
    setPlatform(originalOS);
  });

  function buildLinkClient(linkIdentity: jest.Mock) {
    const refreshSession = jest.fn().mockResolvedValue({ error: null });
    const signInWithOAuth = jest.fn();
    const signInWithIdToken = jest.fn();
    return {
      client: buildAuthClient({ linkIdentity, refreshSession, signInWithOAuth, signInWithIdToken }),
      refreshSession,
      signInWithOAuth,
      signInWithIdToken,
    };
  }

  it("links on native via linkIdentity - never a sign-in call - and refreshes after", async () => {
    setPlatform("ios");
    const linkIdentity = jest
      .fn()
      .mockResolvedValue({ data: { url: "https://oauth.example" }, error: null });
    const { client, refreshSession, signInWithOAuth, signInWithIdToken } =
      buildLinkClient(linkIdentity);
    mockRequireSupabase.mockReturnValue(client);
    mockOpenAuthSession.mockResolvedValue({
      type: "success",
      url: "selftend://auth-callback?code=abc",
    } as never);

    const result = await linkGoogleIdentity();

    expect(result).toBe(true);
    const call = (linkIdentity.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(call).toMatchObject({
      provider: "google",
      options: {
        redirectTo: "selftend://auth-callback",
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    expect(mockCompleteAuthRedirect).toHaveBeenCalledWith("selftend://auth-callback?code=abc");
    expect(refreshSession).toHaveBeenCalled();
    // The whole point of the function (#1445): the guest's account is KEPT.
    expect(signInWithOAuth).not.toHaveBeenCalled();
    expect(signInWithIdToken).not.toHaveBeenCalled();
  });

  it("returns false on web after starting the full-page redirect", async () => {
    setPlatform("web");
    const linkIdentity = jest.fn().mockResolvedValue({ data: { url: null }, error: null });
    const { client } = buildLinkClient(linkIdentity);
    mockRequireSupabase.mockReturnValue(client);

    expect(await linkGoogleIdentity()).toBe(false);
    const call = (linkIdentity.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(call).toMatchObject({ options: { skipBrowserRedirect: false } });
    expect(mockOpenAuthSession).not.toHaveBeenCalled();
  });

  it("maps a direct identity_already_exists rejection to the collision constant", async () => {
    setPlatform("ios");
    const linkIdentity = jest.fn().mockResolvedValue({
      data: null,
      error: Object.assign(new Error("Identity is already linked to another user"), {
        code: "identity_already_exists",
      }),
    });
    const { client } = buildLinkClient(linkIdentity);
    mockRequireSupabase.mockReturnValue(client);

    await expect(linkGoogleIdentity()).rejects.toThrow(IDENTITY_ALREADY_EXISTS_ERROR);
  });

  it("maps the native redirect collision (identity_exists callback error) to the same constant", async () => {
    setPlatform("ios");
    const linkIdentity = jest
      .fn()
      .mockResolvedValue({ data: { url: "https://oauth.example" }, error: null });
    const { client, refreshSession } = buildLinkClient(linkIdentity);
    mockRequireSupabase.mockReturnValue(client);
    mockOpenAuthSession.mockResolvedValue({
      type: "success",
      url: "selftend://auth-callback?error_code=identity_already_exists",
    } as never);
    mockCompleteAuthRedirect.mockRejectedValue(new AuthCallbackError("identity_exists"));

    await expect(linkGoogleIdentity()).rejects.toThrow(IDENTITY_ALREADY_EXISTS_ERROR);
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("returns false when the user backs out of the browser dance", async () => {
    setPlatform("ios");
    const linkIdentity = jest
      .fn()
      .mockResolvedValue({ data: { url: "https://oauth.example" }, error: null });
    const { client } = buildLinkClient(linkIdentity);
    mockRequireSupabase.mockReturnValue(client);
    mockOpenAuthSession.mockResolvedValue({ type: "cancel" } as never);

    expect(await linkGoogleIdentity()).toBe(false);
    expect(mockCompleteAuthRedirect).not.toHaveBeenCalled();
  });

  it("rethrows other link errors unchanged", async () => {
    setPlatform("ios");
    const linkError = new Error("link boom");
    const linkIdentity = jest.fn().mockResolvedValue({ data: null, error: linkError });
    const { client } = buildLinkClient(linkIdentity);
    mockRequireSupabase.mockReturnValue(client);

    await expect(linkGoogleIdentity()).rejects.toBe(linkError);
  });
});

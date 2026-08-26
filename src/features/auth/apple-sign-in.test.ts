import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

import {
  IDENTITY_ALREADY_EXISTS_ERROR,
  isAppleSignInAvailable,
  linkAppleIdentity,
  signInWithApple,
} from "@/src/features/auth/api";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: jest.fn(),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockIsAvailable = jest.mocked(AppleAuthentication.isAvailableAsync);
const mockSignInAsync = jest.mocked(AppleAuthentication.signInAsync);
const mockRequireSupabase = jest.mocked(requireSupabase);

function buildClient(signInWithIdToken: jest.Mock) {
  return { auth: { signInWithIdToken } } as unknown as ReturnType<typeof requireSupabase>;
}

let platformSpy: jest.ReplaceProperty<typeof Platform.OS> | undefined;

afterEach(() => {
  platformSpy?.restore();
  platformSpy = undefined;
  jest.clearAllMocks();
});

describe("isAppleSignInAvailable", () => {
  // The module is iOS-only. A bare Platform check would be wrong in both
  // directions: it would render the button on iOS versions without the
  // capability, and calling into the module off-iOS can throw outright.
  it.each(["android", "web"] as const)("is false on %s without asking the module", async (os) => {
    platformSpy = jest.replaceProperty(Platform, "OS", os);

    expect(await isAppleSignInAvailable()).toBe(false);
    expect(mockIsAvailable).not.toHaveBeenCalled();
  });

  it("defers to the OS on iOS", async () => {
    platformSpy = jest.replaceProperty(Platform, "OS", "ios");
    mockIsAvailable.mockResolvedValue(true);

    expect(await isAppleSignInAvailable()).toBe(true);
  });

  it("reports unavailable rather than throwing when the module errors", async () => {
    platformSpy = jest.replaceProperty(Platform, "OS", "ios");
    mockIsAvailable.mockRejectedValue(new Error("no such module"));

    // A failure to answer must hide the button, never crash the sign-in screen.
    expect(await isAppleSignInAvailable()).toBe(false);
  });
});

describe("signInWithApple", () => {
  it("exchanges Apple's identity token with Supabase", async () => {
    const signInWithIdToken = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildClient(signInWithIdToken));
    mockSignInAsync.mockResolvedValue({
      identityToken: "apple-identity-token",
    } as AppleAuthentication.AppleAuthenticationCredential);

    expect(await signInWithApple()).toBe(true);
    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: "apple",
      token: "apple-identity-token",
    });
  });

  // Apple reports a dismissed sheet as a thrown error, not a result. Treating
  // that as a failure would show an error message to someone who simply changed
  // their mind - and the caller contract matches signInWithGoogle: false means
  // "nothing happened", not "something broke".
  it("returns false when the user cancels the sheet", async () => {
    mockRequireSupabase.mockReturnValue(buildClient(jest.fn()));
    mockSignInAsync.mockRejectedValue({ code: "ERR_REQUEST_CANCELED" });

    expect(await signInWithApple()).toBe(false);
  });

  it("rethrows genuine Apple failures", async () => {
    mockRequireSupabase.mockReturnValue(buildClient(jest.fn()));
    mockSignInAsync.mockRejectedValue(new Error("apple exploded"));

    await expect(signInWithApple()).rejects.toThrow("apple exploded");
  });

  it("fails loudly when Apple returns no identity token", async () => {
    mockRequireSupabase.mockReturnValue(buildClient(jest.fn()));
    mockSignInAsync.mockResolvedValue({
      identityToken: null,
    } as AppleAuthentication.AppleAuthenticationCredential);

    // Silently returning false here would look like a cancellation and leave
    // the user tapping a button that never does anything.
    await expect(signInWithApple()).rejects.toThrow(/identity token/i);
  });

  it("surfaces a Supabase rejection", async () => {
    const error = new Error("token rejected");
    const signInWithIdToken = jest.fn().mockResolvedValue({ error });
    mockRequireSupabase.mockReturnValue(buildClient(signInWithIdToken));
    mockSignInAsync.mockResolvedValue({
      identityToken: "apple-identity-token",
    } as AppleAuthentication.AppleAuthenticationCredential);

    await expect(signInWithApple()).rejects.toBe(error);
  });
});

// Conversion (#1445): the same sheet, but the token goes to linkIdentity's
// id-token overload so the guest's account is KEPT - signInWithIdToken from a
// guest session signs into the identity's own account and strands the guest.
describe("linkAppleIdentity", () => {
  function buildLinkClient(linkIdentity: jest.Mock) {
    const refreshSession = jest.fn().mockResolvedValue({ error: null });
    const signInWithIdToken = jest.fn();
    return {
      client: {
        auth: { linkIdentity, refreshSession, signInWithIdToken },
      } as unknown as ReturnType<typeof requireSupabase>,
      refreshSession,
      signInWithIdToken,
    };
  }

  it("links Apple's identity token to the current account and refreshes - never signInWithIdToken", async () => {
    const linkIdentity = jest.fn().mockResolvedValue({ error: null });
    const { client, refreshSession, signInWithIdToken } = buildLinkClient(linkIdentity);
    mockRequireSupabase.mockReturnValue(client);
    mockSignInAsync.mockResolvedValue({
      identityToken: "apple-identity-token",
    } as AppleAuthentication.AppleAuthenticationCredential);

    expect(await linkAppleIdentity()).toBe(true);
    expect(linkIdentity).toHaveBeenCalledWith({
      provider: "apple",
      token: "apple-identity-token",
    });
    expect(signInWithIdToken).not.toHaveBeenCalled();
    expect(refreshSession).toHaveBeenCalled();
  });

  it("returns false when the user cancels the sheet, linking nothing", async () => {
    const linkIdentity = jest.fn();
    const { client } = buildLinkClient(linkIdentity);
    mockRequireSupabase.mockReturnValue(client);
    mockSignInAsync.mockRejectedValue({ code: "ERR_REQUEST_CANCELED" });

    expect(await linkAppleIdentity()).toBe(false);
    expect(linkIdentity).not.toHaveBeenCalled();
  });

  it("maps identity_already_exists to the collision constant", async () => {
    const linkIdentity = jest.fn().mockResolvedValue({
      error: Object.assign(new Error("Identity is already linked to another user"), {
        code: "identity_already_exists",
      }),
    });
    const { client, refreshSession } = buildLinkClient(linkIdentity);
    mockRequireSupabase.mockReturnValue(client);
    mockSignInAsync.mockResolvedValue({
      identityToken: "apple-identity-token",
    } as AppleAuthentication.AppleAuthenticationCredential);

    await expect(linkAppleIdentity()).rejects.toThrow(IDENTITY_ALREADY_EXISTS_ERROR);
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("rethrows other link errors unchanged", async () => {
    const error = new Error("link rejected");
    const linkIdentity = jest.fn().mockResolvedValue({ error });
    const { client } = buildLinkClient(linkIdentity);
    mockRequireSupabase.mockReturnValue(client);
    mockSignInAsync.mockResolvedValue({
      identityToken: "apple-identity-token",
    } as AppleAuthentication.AppleAuthenticationCredential);

    await expect(linkAppleIdentity()).rejects.toBe(error);
  });
});

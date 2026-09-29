import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook } from "@testing-library/react-native";
import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { router } from "expo-router";

import { UNDER_FLOOR_BLOCK_KEY } from "@/src/features/auth/under-floor-block";
import { useStartAsGuest } from "@/src/features/auth/use-start-as-guest";
import { captureError } from "@/src/lib/sentry";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => "/",
}));

jest.mock("@/src/lib/sentry", () => ({ captureError: jest.fn() }));

const mockSignInAnonymously = jest.fn();
jest.mock("@/src/lib/supabase", () => ({
  supabase: {
    auth: {
      signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
    },
  },
}));

const mockPush = router.push as jest.MockedFunction<typeof router.push>;
const mockReplace = router.replace as jest.MockedFunction<typeof router.replace>;
const mockCaptureError = captureError as jest.MockedFunction<typeof captureError>;

async function start() {
  const { result } = renderHook(() => useStartAsGuest());
  await act(async () => {
    await result.current.startAsGuest();
  });
}

describe("useStartAsGuest", () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockSignInAnonymously.mockResolvedValue({
      data: { session: { user: { id: "guest-1" } }, user: { id: "guest-1" } },
      error: null,
    });
  });

  it("creates the guest and navigates nowhere - the session redirect owns entry", async () => {
    const { result } = renderHook(() => useStartAsGuest());
    await act(async () => {
      await result.current.startAsGuest();
    });

    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockCaptureError).not.toHaveBeenCalled();
    // Still pending: the landing is about to unmount via the session
    // redirect, and re-enabling first would let a second press mint a
    // second, instantly orphaned guest.
    expect(result.current.pending).toBe(true);
  });

  it("re-enables the CTA after a failure, so the visitor can retry", async () => {
    mockSignInAnonymously.mockResolvedValue({
      data: { session: null, user: null },
      error: new AuthRetryableFetchError("Network request failed", 0),
    });
    const { result } = renderHook(() => useStartAsGuest());
    await act(async () => {
      await result.current.startAsGuest();
    });

    expect(result.current.pending).toBe(false);
  });

  // The hosted dashboard toggle is the dark-ship / kill-switch state: the CTA
  // must degrade to exactly where the old primary CTA pointed, and the
  // expected error must not be reported as an incident.
  it("anonymous_provider_disabled degrades to the sign-up form, unreported", async () => {
    mockSignInAnonymously.mockResolvedValue({
      data: { session: null, user: null },
      error: new AuthApiError(
        "Anonymous sign-ins are disabled",
        422,
        "anonymous_provider_disabled",
      ),
    });

    await start();

    expect(mockPush).toHaveBeenCalledWith("/(auth)/sign-up");
    expect(mockCaptureError).not.toHaveBeenCalled();
  });

  it("an offline press (retryable fetch error) is not reported either", async () => {
    mockSignInAnonymously.mockResolvedValue({
      data: { session: null, user: null },
      error: new AuthRetryableFetchError("Network request failed", 0),
    });

    await start();

    expect(mockPush).toHaveBeenCalledWith("/(auth)/sign-up");
    expect(mockCaptureError).not.toHaveBeenCalled();
  });

  it("an unexpected error is captured and still degrades", async () => {
    const unexpected = new AuthApiError("Too many requests", 429, "over_request_rate_limit");
    mockSignInAnonymously.mockResolvedValue({
      data: { session: null, user: null },
      error: unexpected,
    });

    await start();

    expect(mockCaptureError).toHaveBeenCalledWith(unexpected);
    expect(mockPush).toHaveBeenCalledWith("/(auth)/sign-up");
  });

  // #2826: the web twin of SessionProvider's native guard (#1765, spec #227
  // §3). Inside an under-floor block window a press must not mint an anonymous
  // auth user that the block would only strand. The person is taken to the
  // block screen - ProtectedLayout renders it signed out - without one.
  describe("inside an under-floor block window", () => {
    it("creates no guest and goes to the block screen instead", async () => {
      await AsyncStorage.setItem(UNDER_FLOOR_BLOCK_KEY, String(Date.now() + 60 * 60 * 1000));

      await start();

      expect(mockSignInAnonymously).not.toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/(app)");
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("an expired window does not over-block: the guest is created as usual", async () => {
      await AsyncStorage.setItem(UNDER_FLOOR_BLOCK_KEY, String(Date.now() - 1));

      await start();

      expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
      expect(mockReplace).not.toHaveBeenCalled();
    });

    // Same as native: the flag fails open, so a storage fault can never leave
    // a device with no way to get a session.
    it("an unreadable flag fails open, exactly as the native guest path does", async () => {
      jest.spyOn(AsyncStorage, "getItem").mockRejectedValue(new Error("storage unavailable"));

      await start();

      expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});

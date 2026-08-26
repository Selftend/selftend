import { act, renderHook } from "@testing-library/react-native";
import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { router } from "expo-router";

import { useStartAsGuest } from "@/src/features/auth/use-start-as-guest";
import { captureError } from "@/src/lib/sentry";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
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
const mockCaptureError = captureError as jest.MockedFunction<typeof captureError>;

async function start() {
  const { result } = renderHook(() => useStartAsGuest());
  await act(async () => {
    await result.current.startAsGuest();
  });
}

describe("useStartAsGuest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInAnonymously.mockResolvedValue({
      data: { session: { user: { id: "guest-1" } }, user: { id: "guest-1" } },
      error: null,
    });
  });

  it("creates the guest and navigates nowhere - the session redirect owns entry", async () => {
    await start();

    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockCaptureError).not.toHaveBeenCalled();
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
});

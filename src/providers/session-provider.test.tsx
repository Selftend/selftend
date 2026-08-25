import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Platform, Text } from "react-native";
import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";

import { captureError, setSentryUser } from "@/src/lib/sentry";
import { SessionProvider, useSession } from "@/src/providers/session-provider";
import { setPlatformOS } from "@/test/modal-marker-mock";

jest.mock("@/src/lib/sentry", () => ({
  captureError: jest.fn(),
  setSentryUser: jest.fn(),
}));

type AuthCallback = (event: string, session: { user: { id: string } } | null) => void;
let authCallback: AuthCallback;

const mockGetSession = jest.fn();
const mockSignInAnonymously = jest.fn();

jest.mock("@/src/lib/supabase", () => ({
  initializeSupabaseAutoRefresh: jest.fn(),
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
      onAuthStateChange: jest.fn((callback: AuthCallback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
    },
  },
}));

const ORIGINAL_OS = Platform.OS;

beforeEach(() => {
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: "uuid-1" } } } });
  // Never reached unless a test opts into the signed-out path via mockGetSession.
  mockSignInAnonymously.mockResolvedValue({ data: { session: null, user: null }, error: null });
});

afterEach(() => {
  jest.clearAllMocks();
  setPlatformOS(ORIGINAL_OS as "web" | "ios" | "android");
});

jest.mock("@/src/stores/draft-store-registry", () => ({
  resetAllDraftStores: jest.fn(),
  purgePersistedWizardDrafts: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/src/lib/query-client", () => ({
  ...jest.requireActual("@/src/lib/query-client"),
  clearPersistedQueryCache: jest.fn().mockResolvedValue(undefined),
}));

// Surfaces the context the two signed-out gates (app/index.tsx and
// protected-layout.tsx) actually branch on, so these tests assert the state
// those gates will see rather than provider internals.
function SessionProbe() {
  const { session, status } = useSession();
  return <Text testID="session-probe">{`${status}:${session?.user?.id ?? "signed-out"}`}</Text>;
}

function renderProvider() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

async function waitForProbe(expected: string) {
  await waitFor(() => expect(screen.getByTestId("session-probe")).toHaveTextContent(expected));
}

describe("SessionProvider sentry user context", () => {
  it("sets the pseudonymous user id from the initial session", async () => {
    renderProvider();

    await waitFor(() => expect(setSentryUser).toHaveBeenCalledWith("uuid-1"));
  });

  it("clears the user context on sign-out", async () => {
    renderProvider();
    await waitFor(() => expect(setSentryUser).toHaveBeenCalled());

    act(() => authCallback("SIGNED_OUT", null));

    await waitFor(() => expect(setSentryUser).toHaveBeenLastCalledWith(null));
  });
});

describe("SessionProvider sign-out purge", () => {
  it("purges the persisted query cache on sign-out", async () => {
    const { clearPersistedQueryCache } = jest.requireMock("@/src/lib/query-client");
    renderProvider();
    await waitFor(() => expect(setSentryUser).toHaveBeenCalled());

    act(() => authCallback("SIGNED_OUT", null));

    await waitFor(() => expect(clearPersistedQueryCache).toHaveBeenCalled());
  });

  it("purges persisted wizard drafts (PHI) by key prefix on sign-out", async () => {
    // The registry reset only reaches stores registered in THIS JS context; the
    // prefix purge is the registration-independent disk guarantee.
    const { purgePersistedWizardDrafts, resetAllDraftStores } = jest.requireMock(
      "@/src/stores/draft-store-registry",
    );
    renderProvider();
    await waitFor(() => expect(setSentryUser).toHaveBeenCalled());

    act(() => authCallback("SIGNED_OUT", null));

    await waitFor(() => expect(purgePersistedWizardDrafts).toHaveBeenCalled());
    expect(resetAllDraftStores).toHaveBeenCalled();
  });
});

describe("SessionProvider guest entry (#1440)", () => {
  // jest-expo's defaultPlatform is ios, so these run as the native path unless
  // a test moves Platform.OS itself.

  it("a native cold start with no stored session silently becomes a guest", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInAnonymously.mockResolvedValue({
      data: { session: { user: { id: "guest-1" } }, user: { id: "guest-1" } },
      error: null,
    });

    renderProvider();

    await waitForProbe("ready:guest-1");
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
    expect(setSentryUser).toHaveBeenLastCalledWith("guest-1");
  });

  it("anonymous_provider_disabled falls back to signed-out with nothing captured", async () => {
    // The hosted dashboard toggle is the dark-ship / kill-switch state: the
    // fallback must be exactly today's signed-out landing, and the expected
    // error must not be reported as an incident.
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInAnonymously.mockResolvedValue({
      data: { session: null, user: null },
      error: new AuthApiError("Anonymous sign-ins are disabled", 422, "anonymous_provider_disabled"),
    });

    renderProvider();

    await waitForProbe("ready:signed-out");
    expect(captureError).not.toHaveBeenCalled();
  });

  it("an offline first launch (retryable fetch error) is not reported either", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInAnonymously.mockResolvedValue({
      data: { session: null, user: null },
      error: new AuthRetryableFetchError("Network request failed", 0),
    });

    renderProvider();

    await waitForProbe("ready:signed-out");
    expect(captureError).not.toHaveBeenCalled();
  });

  it("an unexpected guest sign-in error is captured and still falls back", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const unexpected = new AuthApiError("Too many requests", 429, "over_request_rate_limit");
    mockSignInAnonymously.mockResolvedValue({
      data: { session: null, user: null },
      error: unexpected,
    });

    renderProvider();

    await waitForProbe("ready:signed-out");
    expect(captureError).toHaveBeenCalledWith(unexpected);
  });

  it("web with no session stays signed out without a guest attempt", async () => {
    // Web entry is #1441's landing CTA - the provider must leave the marketing
    // landing's signed-out state alone.
    setPlatformOS("web");
    mockGetSession.mockResolvedValue({ data: { session: null } });

    renderProvider();

    await waitForProbe("ready:signed-out");
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });

  it("a stored session never attempts a guest", async () => {
    renderProvider();

    await waitForProbe("ready:uuid-1");
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });

  it("a later sign-out does not silently mint a fresh guest", async () => {
    // A registered user signing out must land on the auth screens to switch
    // accounts - the guest attempt is tied to initial-session resolution only.
    renderProvider();
    await waitForProbe("ready:uuid-1");

    act(() => authCallback("SIGNED_OUT", null));

    await waitForProbe("ready:signed-out");
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });
});

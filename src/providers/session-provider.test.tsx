import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { setSentryUser } from "@/src/lib/sentry";
import { SessionProvider } from "@/src/providers/session-provider";

jest.mock("@/src/lib/sentry", () => ({
  setSentryUser: jest.fn(),
}));

type AuthCallback = (event: string, session: { user: { id: string } } | null) => void;
let authCallback: AuthCallback;

jest.mock("@/src/lib/supabase", () => ({
  initializeSupabaseAutoRefresh: jest.fn(),
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: "uuid-1" } } } }),
      onAuthStateChange: jest.fn((callback: AuthCallback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
    },
  },
}));

jest.mock("@/src/stores/draft-store-registry", () => ({
  resetAllDraftStores: jest.fn(),
}));

jest.mock("@/src/lib/query-client", () => ({
  ...jest.requireActual("@/src/lib/query-client"),
  clearPersistedQueryCache: jest.fn().mockResolvedValue(undefined),
}));

function renderProvider() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionProvider>
        <Text>child</Text>
      </SessionProvider>
    </QueryClientProvider>,
  );
}

describe("SessionProvider sentry user context", () => {
  it("sets the pseudonymous user id from the initial session", async () => {
    renderProvider();

    await waitFor(() => expect(setSentryUser).toHaveBeenCalledWith("uuid-1"));
  });

  it("clears the user context on sign-out", async () => {
    renderProvider();
    await waitFor(() => expect(setSentryUser).toHaveBeenCalled());

    authCallback("SIGNED_OUT", null);

    await waitFor(() => expect(setSentryUser).toHaveBeenLastCalledWith(null));
  });
});

describe("SessionProvider sign-out purge", () => {
  it("purges the persisted query cache on sign-out", async () => {
    const { clearPersistedQueryCache } = jest.requireMock("@/src/lib/query-client");
    renderProvider();
    await waitFor(() => expect(setSentryUser).toHaveBeenCalled());

    authCallback("SIGNED_OUT", null);

    await waitFor(() => expect(clearPersistedQueryCache).toHaveBeenCalled());
  });
});

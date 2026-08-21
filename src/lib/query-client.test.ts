import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  clearPersistedQueryCache,
  createAppQueryClient,
  createQueryPersister,
  QUERY_CACHE_MAX_AGE_MS,
  QUERY_CACHE_STORAGE_KEY,
  reportMutationError,
  reportQueryError,
} from "@/src/lib/query-client";
import { captureError } from "@/src/lib/sentry";
import { useToastStore } from "@/src/stores/toast-store";

jest.mock("@/src/lib/sentry", () => ({
  captureError: jest.fn(),
  isReportableError: jest.requireActual("@/src/lib/sentry").isReportableError,
}));

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
}));

describe("reportQueryError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("captures unexpected errors with the query key as context", () => {
    reportQueryError(new Error("boom"), ["journal", "list"]);

    expect(captureError).toHaveBeenCalledWith(expect.any(Error), {
      queryKey: '["journal","list"]',
    });
  });

  it("ignores offline network errors", () => {
    reportQueryError(new TypeError("Network request failed"), ["journal", "list"]);

    expect(captureError).not.toHaveBeenCalled();
  });
});

describe("reportMutationError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("captures unexpected errors with the mutation key as context", () => {
    reportMutationError(new Error("boom"), ["journal", "save"]);

    expect(captureError).toHaveBeenCalledWith(expect.any(Error), {
      mutationKey: '["journal","save"]',
    });
  });
});

describe("createAppQueryClient", () => {
  it("keeps the existing defaults", () => {
    const client = createAppQueryClient();
    const defaults = client.getDefaultOptions();

    expect(defaults.queries?.staleTime).toBe(60_000);
    expect(defaults.queries?.retry).toBe(1);
  });

  it("sets gcTime to match persistence maxAge so the offline cache is not eroded", () => {
    const client = createAppQueryClient();
    const defaults = client.getDefaultOptions();

    expect(defaults.queries?.gcTime).toBe(QUERY_CACHE_MAX_AGE_MS);
  });
});

describe("mutation defaults", () => {
  it("uses networkMode always so offline saves fail fast instead of pausing", () => {
    const client = createAppQueryClient();

    expect(client.getDefaultOptions().mutations?.networkMode).toBe("always");
  });
});

describe("query cache persistence", () => {
  it("creates a persister on native", () => {
    expect(createQueryPersister()).not.toBeNull();
  });

  it("purges the persisted cache", async () => {
    await AsyncStorage.setItem(QUERY_CACHE_STORAGE_KEY, "{}");

    await clearPersistedQueryCache();

    expect(await AsyncStorage.getItem(QUERY_CACHE_STORAGE_KEY)).toBeNull();
  });
});

describe("global mutation failure toast", () => {
  beforeEach(() => {
    // The real teardown rather than a hand-written `setState`: the slot is two
    // fields now, and the error toast this suite raises is sticky, so a reset
    // that missed a field would have the NEXT test asserting on this one's toast.
    useToastStore.getState().clearToasts();
  });

  async function runFailingMutation(meta?: { suppressGlobalErrorToast?: boolean }) {
    const client = createAppQueryClient();
    const mutation = client.getMutationCache().build(client, {
      mutationFn: () => Promise.reject(new TypeError("Network request failed")),
      meta,
    });

    try {
      await mutation.execute(undefined).catch(() => {});
    } finally {
      // MutationCache schedules a long garbage-collection timer when a mutation is
      // built. Production owns a process-long client; this short-lived test client
      // must be cleared so it does not keep Jest alive.
      mutation.destroy();
      client.clear();
    }
  }

  it("shows the fallback toast for an unhandled failing mutation", async () => {
    await runFailingMutation();

    expect(useToastStore.getState().visible).toMatchObject({ tone: "error" });
  });

  it("stays quiet when the mutation opts out", async () => {
    await runFailingMutation({ suppressGlobalErrorToast: true });

    expect(useToastStore.getState().visible).toBeNull();
  });
});

import {
  scrubBreadcrumb,
  isReportableError,
  normalizeError,
  scrubEvent,
  shouldEnableSentry,
} from "@/src/lib/sentry";

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
}));

describe("shouldEnableSentry", () => {
  it("is disabled without a DSN", () => {
    expect(shouldEnableSentry("", false)).toBe(false);
  });

  it("is disabled in dev even with a DSN", () => {
    expect(shouldEnableSentry("https://x@o0.ingest.sentry.io/0", true)).toBe(false);
  });

  it("is enabled with a DSN outside dev", () => {
    expect(shouldEnableSentry("https://x@o0.ingest.sentry.io/0", false)).toBe(true);
  });
});

describe("scrubEvent", () => {
  it("reduces user context to the id only", () => {
    const event = {
      user: { id: "uuid-1", email: "person@example.com", username: "person" },
    };

    expect(scrubEvent(event as never)).toMatchObject({ user: { id: "uuid-1" } });
    expect(
      (scrubEvent(event as never) as { user?: { email?: string } }).user?.email,
    ).toBeUndefined();
  });

  it("drops the user entirely when there is no id", () => {
    const event = { user: { email: "person@example.com" } };

    expect((scrubEvent(event as never) as { user?: unknown }).user).toBeUndefined();
  });

  it("removes the device name (often the owner's real name)", () => {
    const event = { contexts: { device: { name: "Vasil's Pixel", model: "Pixel 8" } } };

    const scrubbed = scrubEvent(event as never) as {
      contexts?: { device?: { name?: string; model?: string } };
    };
    expect(scrubbed.contexts?.device?.name).toBeUndefined();
    expect(scrubbed.contexts?.device?.model).toBe("Pixel 8");
  });
});

describe("scrubBreadcrumb", () => {
  it("drops console breadcrumbs (they can carry logged payloads)", () => {
    expect(scrubBreadcrumb({ category: "console", message: "oops" })).toBeNull();
  });

  it("keeps navigation breadcrumbs", () => {
    expect(scrubBreadcrumb({ category: "navigation" })).toEqual({
      category: "navigation",
    });
  });

  /**
   * The Android launcher's mood faces deep-link `?score=N` (#996), and already-shipped
   * builds keep minting that path forever - this repo has no OTA channel, so no app
   * change can reach them. Stripping it here is the only fix that covers them.
   *
   * The WHOLE query string goes, not the `score` key: a denylist of known-sensitive
   * params is satisfied forever by whatever was known when it was written, and the next
   * param carrying a health value would leak in silence. The route still identifies the
   * screen, which is what a breadcrumb is for.
   */
  it("strips the query string from a navigated route, whatever it carries", () => {
    expect(
      scrubBreadcrumb({
        category: "navigation",
        data: { from: "/", to: "/tools/check-in/new?score=3" },
      }),
    ).toEqual({ category: "navigation", data: { from: "/", to: "/tools/check-in/new" } });
  });

  it("strips it from the message too, which is where some navigations put the route", () => {
    expect(
      scrubBreadcrumb({ category: "navigation", message: "/tools/check-in/new?score=5" }),
    ).toEqual({ category: "navigation", message: "/tools/check-in/new" });
  });

  it("leaves a route without a query string untouched", () => {
    expect(scrubBreadcrumb({ category: "navigation", data: { to: "/tools/sleep" } })).toEqual({
      category: "navigation",
      data: { to: "/tools/sleep" },
    });
  });

  it("leaves non-navigation breadcrumbs alone", () => {
    // An http breadcrumb's query string is its filter, which is what makes it useful;
    // it carries no health value today. Narrowed deliberately rather than by oversight.
    expect(
      scrubBreadcrumb({ category: "http", data: { url: "https://x/rest/v1/mood_logs?select=id" } }),
    ).toEqual({ category: "http", data: { url: "https://x/rest/v1/mood_logs?select=id" } });
  });
});

describe("isReportableError", () => {
  it("reports plain errors", () => {
    expect(isReportableError(new Error("boom"))).toBe(true);
  });

  it("skips aborted requests", () => {
    const error = new Error("Aborted");
    error.name = "AbortError";
    expect(isReportableError(error)).toBe(false);
  });

  it("skips offline network failures", () => {
    expect(isReportableError(new TypeError("Network request failed"))).toBe(false);
    expect(isReportableError(new TypeError("Failed to fetch"))).toBe(false);
  });

  it("skips expected 4xx auth errors but reports auth 5xx", () => {
    const expired = Object.assign(new Error("token expired"), {
      name: "AuthApiError",
      status: 401,
    });
    const serverDown = Object.assign(new Error("boom"), {
      name: "AuthRetryableFetchError",
      status: 502,
    });
    expect(isReportableError(expired)).toBe(false);
    expect(isReportableError(serverDown)).toBe(true);
  });

  it("reports non-Error throwables", () => {
    expect(isReportableError("string throw")).toBe(true);
  });

  // #1548: every rule above used to sit behind an `instanceof Error` early return, so a
  // layer that rejected with a plain object paged someone for being offline.
  it("skips an offline failure thrown as a non-Error", () => {
    expect(isReportableError({ message: "Network request failed" })).toBe(false);
    expect(isReportableError({ message: "TypeError: Failed to fetch" })).toBe(false);
    expect(isReportableError("Network request failed")).toBe(false);
  });

  it("skips an abort thrown as a non-Error", () => {
    expect(isReportableError({ name: "AbortError", message: "Aborted" })).toBe(false);
  });

  it("skips a non-Error 4xx auth failure but reports auth 5xx", () => {
    expect(isReportableError({ name: "AuthApiError", message: "token expired", status: 401 })).toBe(
      false,
    );
    expect(
      isReportableError({ name: "AuthRetryableFetchError", message: "boom", status: 502 }),
    ).toBe(true);
  });

  it("still reports an unrecognised non-Error", () => {
    // The SELFTEND-9 shape. An empty message is not evidence of being offline, so this
    // stays reportable - it just arrives diagnosable now (see normalizeError).
    expect(isReportableError({ message: "" })).toBe(true);
  });
});

describe("normalizeError", () => {
  it("passes a real Error through untouched", () => {
    const error = new Error("boom");
    expect(normalizeError(error)).toBe(error);
  });

  it("wraps a thrown object and keeps the original as cause", () => {
    const thrown = { message: "row not found", code: "PGRST116" };
    const normalized = normalizeError(thrown);

    expect(normalized).toBeInstanceOf(Error);
    expect(normalized.message).toBe("row not found");
    expect(normalized.cause).toBe(thrown);
    expect(normalized.stack).toBeTruthy();
  });

  it("describes the shape when the object carries no usable message", () => {
    // SELFTEND-9 arrived as `{ message: "" }` and Sentry rendered it as
    // "Object captured as exception with keys: message" - no message, no stack.
    expect(normalizeError({ message: "" }).message).toBe("Non-Error thrown (keys: message)");
    expect(normalizeError({ message: "", code: "PGRST301", status: 504 }).message).toBe(
      "Non-Error thrown (code PGRST301, status 504, keys: message, code, status)",
    );
    expect(normalizeError({}).message).toBe("Non-Error thrown (no keys)");
  });

  it("carries name and status across so the suppression rules can read them", () => {
    const normalized = normalizeError({ name: "AuthApiError", message: "expired", status: 401 });

    expect(normalized.name).toBe("AuthApiError");
    expect((normalized as Error & { status?: number }).status).toBe(401);
  });

  it("wraps primitives", () => {
    expect(normalizeError("string throw").message).toBe("string throw");
    expect(normalizeError(undefined).message).toBe("Non-Error thrown: undefined");
    expect(normalizeError(null).message).toBe("Non-Error thrown: null");
    expect(normalizeError(42).message).toBe("Non-Error thrown: 42");
  });
});

describe("captureError", () => {
  // sentry.ts reads its DSN at module-load time and `isEnabled()` is false under
  // jest-expo's `__DEV__`, so the reporting path only exists in a re-required module.
  const ORIGINAL_ENV = { ...process.env };
  const globals = globalThis as unknown as { __DEV__: boolean };

  function loadEnabledSentry() {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://x@o0.ingest.sentry.io/0";
    globals.__DEV__ = false;
    jest.resetModules();

    return {
      sentry: require("@/src/lib/sentry") as typeof import("@/src/lib/sentry"),
      client: require("@sentry/react-native") as { captureException: jest.Mock },
    };
  }

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    globals.__DEV__ = true;
    jest.resetModules();
  });

  it("sends a non-Error as a real Error, original preserved as cause and extra", () => {
    const { sentry, client } = loadEnabledSentry();
    const thrown = { message: "", code: "PGRST301" };

    sentry.captureError(thrown, { queryKey: '["act","committedAction","list"]' });

    expect(client.captureException).toHaveBeenCalledTimes(1);
    const [captured, options] = client.captureException.mock.calls[0] as [Error, unknown];
    expect(captured).toBeInstanceOf(Error);
    expect(captured.message).toContain("code PGRST301");
    expect(captured.cause).toBe(thrown);
    expect(options).toEqual({
      extra: { queryKey: '["act","committedAction","list"]', originalError: thrown },
    });
  });

  it("leaves a real Error and its context alone", () => {
    const { sentry, client } = loadEnabledSentry();
    const error = new Error("boom");

    sentry.captureError(error, { queryKey: '["journal","list"]' });

    expect(client.captureException).toHaveBeenCalledWith(error, {
      extra: { queryKey: '["journal","list"]' },
    });
  });

  it("adds the original as an extra even without caller context", () => {
    const { sentry, client } = loadEnabledSentry();

    sentry.captureError("string throw");

    expect(client.captureException).toHaveBeenCalledWith(expect.any(Error), {
      extra: { originalError: "string throw" },
    });
  });
});

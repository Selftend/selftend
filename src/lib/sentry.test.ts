import {
  scrubBreadcrumb,
  isReportableError,
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
});

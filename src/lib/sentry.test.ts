import {
  dropConsoleBreadcrumb,
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

describe("dropConsoleBreadcrumb", () => {
  it("drops console breadcrumbs (they can carry logged payloads)", () => {
    expect(dropConsoleBreadcrumb({ category: "console", message: "oops" })).toBeNull();
  });

  it("keeps navigation breadcrumbs", () => {
    expect(dropConsoleBreadcrumb({ category: "navigation" })).toEqual({
      category: "navigation",
    });
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

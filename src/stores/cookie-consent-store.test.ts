import { Platform } from "react-native";

import { useCookieConsentStore } from "@/src/stores/cookie-consent-store";

const INITIAL_STATE = {
  essential: true as const,
  analytics: false,
  accepted: false,
  acceptedAt: null,
};

describe("useCookieConsentStore - in-memory (Platform.OS = ios)", () => {
  beforeEach(() => {
    // Reset to initial state; there is no reset() action - patch directly.
    useCookieConsentStore.setState(INITIAL_STATE);
  });

  it("acceptAll sets analytics and accepted to true and records a non-null ISO timestamp", () => {
    useCookieConsentStore.getState().acceptAll();

    expect(useCookieConsentStore.getState()).toMatchObject({
      analytics: true,
      accepted: true,
      acceptedAt: expect.any(String),
    });
    expect(useCookieConsentStore.getState().acceptedAt).not.toBeNull();
  });

  it("acceptEssentialOnly sets analytics to false and accepted to true", () => {
    useCookieConsentStore.getState().acceptEssentialOnly();

    expect(useCookieConsentStore.getState()).toMatchObject({
      analytics: false,
      accepted: true,
      acceptedAt: expect.any(String),
    });
  });

  it("setAnalytics(true) enables analytics", () => {
    useCookieConsentStore.getState().setAnalytics(true);

    expect(useCookieConsentStore.getState()).toMatchObject({
      analytics: true,
      accepted: true,
      acceptedAt: expect.any(String),
    });
  });

  it("setAnalytics(false) disables analytics", () => {
    useCookieConsentStore.getState().setAnalytics(true);
    useCookieConsentStore.getState().setAnalytics(false);

    expect(useCookieConsentStore.getState().analytics).toBe(false);
  });

  it("hydrate is a no-op on non-web (does not change state)", () => {
    useCookieConsentStore.getState().hydrate();
    // State should remain at initial values since Platform.OS is "ios"
    expect(useCookieConsentStore.getState()).toMatchObject(INITIAL_STATE);
  });
});

describe("useCookieConsentStore - web persistence path", () => {
  const STORAGE_KEY = "selftend_cookie_consent";
  let storage: Record<string, string>;

  beforeEach(() => {
    // Reset store state
    useCookieConsentStore.setState(INITIAL_STATE);
    // Clear in-memory storage
    storage = {};
    // Stub globalThis.localStorage
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
      },
      writable: true,
      configurable: true,
    });
    // Simulate web
    Object.defineProperty(Platform, "OS", { value: "web", writable: true, configurable: true });
  });

  afterEach(() => {
    // Restore native platform
    Object.defineProperty(Platform, "OS", { value: "ios", writable: true, configurable: true });
  });

  it("acceptAll writes JSON with analytics:true and accepted:true to localStorage", () => {
    useCookieConsentStore.getState().acceptAll();

    const raw = storage[STORAGE_KEY];
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw);
    expect(parsed).toMatchObject({
      analytics: true,
      accepted: true,
      acceptedAt: expect.any(String),
    });
  });

  it("hydrate restores state from localStorage after acceptAll", () => {
    // Seed storage as if acceptAll was called before
    const stored = { analytics: true, accepted: true, acceptedAt: "2026-01-01T00:00:00.000Z" };
    storage[STORAGE_KEY] = JSON.stringify(stored);

    useCookieConsentStore.getState().hydrate();

    expect(useCookieConsentStore.getState()).toMatchObject({
      analytics: true,
      accepted: true,
      acceptedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("hydrate ignores malformed stored values", () => {
    storage[STORAGE_KEY] = "not-valid-json{{{";

    useCookieConsentStore.getState().hydrate();

    // State should remain unchanged (initial)
    expect(useCookieConsentStore.getState()).toMatchObject(INITIAL_STATE);
  });

  it("hydrate ignores empty stored value", () => {
    // No key set in storage

    useCookieConsentStore.getState().hydrate();

    expect(useCookieConsentStore.getState()).toMatchObject(INITIAL_STATE);
  });

  it("hydrate ignores stored JSON that lacks an accepted boolean", () => {
    storage[STORAGE_KEY] = JSON.stringify({ analytics: true });

    useCookieConsentStore.getState().hydrate();

    // loadFromStorage returns null if parsed.accepted is not a boolean
    expect(useCookieConsentStore.getState()).toMatchObject(INITIAL_STATE);
  });
});

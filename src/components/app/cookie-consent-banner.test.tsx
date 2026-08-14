import { fireEvent, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { CookieConsentBanner, CookiePreferencesCard } from "./cookie-consent-banner";
import { useCookieConsentStore } from "@/src/stores/cookie-consent-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

const STORAGE_KEY = "selftend_cookie_consent";

// jest-expo runs the NATIVE platform, and both the banner and the consent store bail out
// on anything but web - so without this the component under test renders nothing at all.
// Same shape as `cookie-consent-store.test.ts`'s web-persistence block.
let storage: Record<string, string>;

beforeEach(() => {
  storage = {};
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
  Object.defineProperty(Platform, "OS", { value: "web", writable: true, configurable: true });
  useCookieConsentStore.setState({ analytics: false, accepted: false, acceptedAt: null });
});

afterEach(() => {
  Object.defineProperty(Platform, "OS", { value: "ios", writable: true, configurable: true });
});

function storeConsent(analytics: boolean) {
  storage[STORAGE_KEY] = JSON.stringify({
    analytics,
    accepted: true,
    acceptedAt: "2026-01-01T00:00:00.000Z",
  });
}

describe("CookieConsentBanner", () => {
  it("shows while nothing is stored", () => {
    renderWithProviders(<CookieConsentBanner />);

    expect(screen.getByText("Accept all")).toBeTruthy();
  });

  /**
   * This is the closed door (#969): once a choice is stored the banner is gone for good,
   * so anything reachable ONLY from it is reachable exactly once, on first visit.
   */
  it("is gone once a choice is stored, taking its Manage preferences door with it", () => {
    storeConsent(false);
    useCookieConsentStore.getState().hydrate();

    renderWithProviders(<CookieConsentBanner />);

    expect(screen.queryByText("Accept all")).toBeNull();
    expect(screen.queryByText("Manage preferences")).toBeNull();
  });
});

/**
 * The withdrawal path. `app/cookies.tsx` hosts this card, which is why it is exported —
 * before #969 it was module-private with exactly one caller, the banner's own state.
 */
describe("CookiePreferencesCard", () => {
  it("renders the analytics switch with consent already accepted", () => {
    storeConsent(false);

    renderWithProviders(<CookiePreferencesCard />);

    expect(screen.getByLabelText("Analytics")).toBeTruthy();
    expect(screen.getByText("Save preferences")).toBeTruthy();
  });

  /**
   * ☠️ The staged toggle is `useState(analytics)`, captured on the FIRST render, while
   * `hydrate` runs in an effect after it. The banner never showed this because it only
   * renders while nothing is stored — but standing on the cookies page the stored value
   * is the entire point, and a stale `false` would show consent as withdrawn and then
   * withdraw it for real on Save.
   */
  it("reflects stored consent rather than the pre-hydration default", () => {
    storeConsent(true);

    renderWithProviders(<CookiePreferencesCard />);

    expect(screen.getByLabelText("Analytics").props.accessibilityState.checked).toBe(true);
  });

  it("withdraws consent that was previously granted", () => {
    storeConsent(true);
    renderWithProviders(<CookiePreferencesCard />);

    fireEvent(screen.getByLabelText("Analytics"), "checkedChange", false);
    fireEvent.press(screen.getByText("Save preferences"));

    expect(useCookieConsentStore.getState().analytics).toBe(false);
    expect(JSON.parse(storage[STORAGE_KEY] ?? "{}").analytics).toBe(false);
  });

  it("grants consent that was previously withheld", () => {
    storeConsent(false);
    renderWithProviders(<CookiePreferencesCard />);

    fireEvent(screen.getByLabelText("Analytics"), "checkedChange", true);
    fireEvent.press(screen.getByText("Save preferences"));

    expect(useCookieConsentStore.getState().analytics).toBe(true);
  });

  // Standalone on a page there is nothing to cancel back to, so the button is absent
  // rather than a no-op. The banner passes `onDone` and keeps it.
  it("offers Cancel only when there is somewhere to go back to", () => {
    storeConsent(false);
    const { unmount } = renderWithProviders(<CookiePreferencesCard />);
    expect(screen.queryByText("Cancel")).toBeNull();
    unmount();

    renderWithProviders(<CookiePreferencesCard onDone={jest.fn()} />);
    expect(screen.getByText("Cancel")).toBeTruthy();
  });
});

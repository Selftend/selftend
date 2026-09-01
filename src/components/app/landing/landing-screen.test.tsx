import { act, fireEvent, screen } from "@testing-library/react-native";

import LandingScreen from "./landing-screen";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    // Mirror Link asChild: forward the href onto the wrapped pressable so
    // tests can assert real link targets instead of spying on router.push.
    Link: ({
      href,
      asChild: _asChild,
      children,
    }: {
      href: string;
      asChild?: boolean;
      children: React.ReactElement;
    }) => React.cloneElement(React.Children.only(children), { href }),
    // The Start-now CTA's failure path navigates through usePushWithOrigin.
    router: { push: jest.fn() },
    usePathname: () => "/",
  };
});

// The CTA's own outcome matrix lives in use-start-as-guest.test.ts; here the
// mock only proves the wiring.
const mockSignInAnonymously = jest.fn();
jest.mock("@/src/lib/supabase", () => ({
  supabase: {
    auth: {
      signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
    },
  },
}));

describe("LandingScreen", () => {
  it("renders the hero headline as the single top-level heading", () => {
    renderWithProviders(<LandingScreen />);

    expect(screen.getByRole("heading", { name: "Small tools for heavy days." })).toBeTruthy();
  });

  it("shows the hero support line", () => {
    renderWithProviders(<LandingScreen />);

    expect(
      screen.getByText(
        "A free, private CBT programme - cognitive behavioural therapy - with ACT and eight everyday tools alongside it. No ads, no subscriptions.",
      ),
    ).toBeTruthy();
  });

  // #1441: the primary CTA is an action, not a link - it creates the guest
  // session in place and the index route's session redirect enters the app.
  it("starts a guest from the primary CTA", async () => {
    mockSignInAnonymously.mockResolvedValue({
      data: { session: { user: { id: "guest-1" } }, user: { id: "guest-1" } },
      error: null,
    });
    renderWithProviders(<LandingScreen />);

    await act(async () => fireEvent.press(screen.getByText("Start now - no account needed")));

    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("keeps the durability line at the CTA", () => {
    renderWithProviders(<LandingScreen />);

    expect(
      screen.getByText(
        "Your data stays in this browser until you create an account - browsers can clear it.",
      ),
    ).toBeTruthy();
  });

  it("links Create an account to sign-up", () => {
    renderWithProviders(<LandingScreen />);

    expect(screen.getByRole("link", { name: "Create an account" }).props.href).toBe(
      "/(auth)/sign-up",
    );
  });

  it("links Sign in to sign-in", () => {
    renderWithProviders(<LandingScreen />);

    expect(screen.getByRole("link", { name: "Sign in" }).props.href).toBe("/(auth)/sign-in");
  });

  it("shows all eight tool pills", () => {
    renderWithProviders(<LandingScreen />);

    for (const name of [
      "Daily check-in",
      "Journal",
      "Breathing",
      "Meditation",
      "Grounding",
      "Gratitude log",
      "Sleep",
      "Habits",
    ]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
  });
});

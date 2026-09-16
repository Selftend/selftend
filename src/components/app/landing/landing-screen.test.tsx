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

/**
 * The hero pills bearing `name`.
 *
 * ☠️ A bare `getByText` is no longer unambiguous on this screen. Since #2469 the
 * site footer the landing renders (#2467) lists `/meditation`, labelled - by the
 * anchor-text rule - with that page's H1, "Meditation": the same word the
 * meditation pill carries, so `getByText("Meditation")` throws "Found multiple
 * elements". Taking the first match instead would be a coin toss on tree order
 * and would keep passing if the pill itself disappeared.
 *
 * ☠️ Disambiguating on the pill's `text-[13.5px]` was the first fix and was
 * WRONG: that utility is not unique to this row - `how-it-works-section.tsx`
 * sets the same scale - so the filter only worked by the accident that no step
 * body's text equals a tool name. The pill carries a `testID` instead, which is
 * a structural handle rather than a styling coincidence, and a restyle no longer
 * reds this test.
 *
 * The count is asserted rather than the presence, so a pill that stops being
 * rendered fails here even while the footer still says the word.
 */
const heroPills = (name: string) =>
  screen.getAllByTestId("hero-tool-pill").filter((node) => node.props.children === name);

describe("LandingScreen", () => {
  it("renders the hero headline as the single top-level heading", () => {
    renderWithProviders(<LandingScreen />);

    expect(screen.getByRole("heading", { name: "Small tools for heavy days." })).toBeTruthy();
  });

  // #1628: the frame lands first and the tools follow it as an on-ramp. The
  // string is pinned in full because the ordering constraint in
  // `docs/positioning.md` is the one positioning rule no regex reaches - the
  // guard in `test/positioning-copy.test.ts` is one-sided by design and cannot
  // express "mentioned, but second". Naming ACT or enumerating the eight tools
  // here again is the regression this assertion is watching for; the chip row
  // below the CTA already carries that inventory, and ACT is named where a user
  // meets it, in the module section further down.
  it("shows the hero support line, with the tools after the frame rather than beside it", () => {
    renderWithProviders(<LandingScreen />);

    expect(
      screen.getByText(
        "A set of free, private mental health tools: everyday tools for right now, and a CBT programme - cognitive behavioural therapy - to work through when you want one. No ads, no subscriptions.",
      ),
    ).toBeTruthy();
  });

  // #2468: the landing's structured-data block asserts `isAccessibleForFree`
  // on its WebSite node, and `docs/brand-result.md` § 6 admits that property
  // for one reason - this page says it. The property is a boolean, so no
  // assertion in the head's own test can tie it to rendered copy; what can be
  // tied is its justification, and it is tied here, where the copy renders.
  // If the hero stops saying it, the block is left asserting a claim the page
  // no longer makes, which is the drift § 6's rule exists to prevent.
  it("states in the hero the free access the structured-data block asserts", () => {
    renderWithProviders(<LandingScreen />);

    expect(screen.getByText("Free · Open source · Private")).toBeTruthy();
    expect(screen.getByText(/No ads, no subscriptions\./)).toBeTruthy();
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
      expect(heroPills(name)).toHaveLength(1);
    }
  });
});

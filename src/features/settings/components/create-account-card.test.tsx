import { fireEvent, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { router } from "expo-router";

import { CreateAccountCard } from "./create-account-card";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/settings",
}));

let mockUser: { id: string; is_anonymous?: boolean; email?: string } | null = null;
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: mockUser }),
}));

const mockPush = router.push as jest.MockedFunction<typeof router.push>;

const TITLE = "Create an account to protect your data";

describe("CreateAccountCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: "guest-1", is_anonymous: true };
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  });

  it("invites a guest, on native in terms of the device", () => {
    renderWithProviders(<CreateAccountCard />);

    expect(screen.getByText(TITLE)).toBeTruthy();
    expect(screen.getByText(/keeps your data if this device is lost/)).toBeTruthy();
  });

  // Stronger wording on web because the risk is real there: the guest session
  // lives in browser storage, which the browser itself can clear.
  it("names the browser-storage fragility on web", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });

    renderWithProviders(<CreateAccountCard />);

    expect(screen.getByText(TITLE)).toBeTruthy();
    expect(screen.getByText(/browsers can clear it/)).toBeTruthy();
  });

  it("links to the conversion form", () => {
    renderWithProviders(<CreateAccountCard />);

    fireEvent.press(screen.getByText("Create account"));

    expect(mockPush).toHaveBeenCalledWith("/sign-up");
  });

  it("renders nothing for a registered user", () => {
    mockUser = { id: "user-1", is_anonymous: false, email: "person@example.com" };

    renderWithProviders(<CreateAccountCard />);

    expect(screen.queryByText(TITLE)).toBeNull();
  });

  // Older tokens predate the claim entirely - absence means registered. Since
  // #1896 the EMAIL carries that: such a token belongs to someone who
  // registered, so it has one.
  it("renders nothing when the claim is absent", () => {
    mockUser = { id: "user-1", email: "person@example.com" };

    renderWithProviders(<CreateAccountCard />);

    expect(screen.queryByText(TITLE)).toBeNull();
  });

  /**
   * ☠️ The window this card was wrong in until #1896: a person who had just
   * registered still carried `is_anonymous: true` in the live JWT, so the card
   * kept inviting them to create the account they had already created.
   */
  it("renders nothing for a just-converted user whose token still claims anonymous", () => {
    mockUser = { id: "user-1", is_anonymous: true, email: "person@example.com" };

    renderWithProviders(<CreateAccountCard />);

    expect(screen.queryByText(TITLE)).toBeNull();
  });

  /**
   * ☠️ The audit logged a tint and a `lock_outline` glyph here as drift; #1830's
   * spec OVERRULES it, and this pins the refusal so a later fidelity pass cannot
   * quietly "fix" the drawing back in.
   *
   * After #1800 the page has **no filled surfaces at all**, so a tinted, bordered
   * callout would make the registration invitation the single loudest element on
   * a page of plain rows. #1446 says the card's stronger web wording exists
   * *"because the risk is real there, not to push"*, and AGENTS.md wants
   * conversion *"never a gate and never nagged"*. `lock_outline` additionally
   * implies protection where the card's whole point is fragility.
   */
  it("stays a plain card with an outline CTA - no tint, no glyph, no filled button", () => {
    mockUser = { id: "guest-1", is_anonymous: true };

    const view = renderWithProviders(<CreateAccountCard />);

    const cta = screen.getByTestId("create-account-card-cta");
    const ctaClasses = String(cta.props.className ?? "");
    // An outline button, never the filled-primary CTA the audit floated (X2).
    expect(ctaClasses).not.toMatch(/\bbg-primary\b/);

    // No tinted fill and no primary-tinted border anywhere in the card.
    const classNames = view.UNSAFE_root.findAll(
      (node) => typeof node.props?.className === "string",
    ).map((node) => String(node.props.className));
    for (const className of classNames) {
      expect(className).not.toMatch(/bg-primary\/|border-primary/);
    }

    // No glyph: the card renders no icon at all.
    expect(view.UNSAFE_root.findAll((node) => typeof node.props?.name === "string")).toHaveLength(
      0,
    );
  });
});

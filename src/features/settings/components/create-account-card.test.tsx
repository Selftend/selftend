import { fireEvent, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { router } from "expo-router";

import { CreateAccountCard } from "./create-account-card";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/settings",
}));

let mockUser: { id: string; email?: string } | null = null;
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: mockUser }),
}));

const mockPush = router.push as jest.MockedFunction<typeof router.push>;

const TITLE = "Create an account to protect your data";

describe("CreateAccountCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: "guest-1", email: "" };
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
    mockUser = { id: "user-1", email: "user@example.com" };

    renderWithProviders(<CreateAccountCard />);

    expect(screen.queryByText(TITLE)).toBeNull();
  });

  /**
   * ☠️☠️ THE DEFECT #1896 FILED THIS CARD FOR. `convertGuestWithPassword` flips
   * `is_anonymous` server-side while the live JWT keeps claiming `true` until
   * the token is minted again — so reading the flag left this card on screen
   * for the length of that window, inviting a person to *"create an account to
   * protect your data"* seconds after they had created one.
   *
   * The fixture is that person: converted, holding an email, and still carrying
   * a stale `is_anonymous: true` claim that the component no longer reads.
   */
  it("stops inviting a just-converted user whose flag is still stale", () => {
    mockUser = { id: "converted-1", email: "converted@example.com", is_anonymous: true } as never;

    renderWithProviders(<CreateAccountCard />);

    expect(screen.queryByText(TITLE)).toBeNull();
  });

  /**
   * ⚠️ REPLACES "renders nothing when the claim is absent", whose premise the
   * move retired rather than whose assertion was flipped. It read a missing
   * `is_anonymous` as an older token, and therefore as registered; nothing
   * reads that claim now. The same fixture — a session with no email — is a
   * GUEST under `isGuestAccount`, which is the intended reading: every
   * registered identity attaches an email, so a session with none has not
   * converted and the invitation is exactly right for them.
   */
  it("still invites a session carrying no email at all", () => {
    mockUser = { id: "user-1" };

    renderWithProviders(<CreateAccountCard />);

    expect(screen.getByText(TITLE)).toBeTruthy();
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
    mockUser = { id: "guest-1", email: "" };

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

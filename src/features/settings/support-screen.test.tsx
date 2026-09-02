import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

// ☠️ This test must NOT live beside the screen: everything under app/ is an
// expo-router ROUTE, so `app/(app)/support.test.tsx` registered a literal
// /support.test route and failed the route-population guards (escape-coverage,
// nav-singular). Screens in app/ get their component tests out here.
import SupportScreen from "@/app/(app)/support";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { requireSupabase } from "@/src/lib/supabase";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

// The delete row's dependencies, mocked the way the Settings screen test does.
jest.mock("@/src/features/settings/queries", () => ({
  useDeleteUserAccount: () => ({ isPending: false, isError: false, mutateAsync: jest.fn() }),
}));
jest.mock("@/src/features/auth/api", () => ({ signOut: jest.fn() }));

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
  usePathname: () => "/support",
}));

jest.mock("@/src/lib/linking", () => ({
  openExternalUrl: jest.fn(),
}));

let mockUser: { id: string; email?: string; is_anonymous?: boolean } | null = null;
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: mockUser }),
}));

const mockInvoke = jest.fn();
jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = requireSupabase as jest.MockedFunction<typeof requireSupabase>;

const REPLY_TO_LABEL = "Email me back at (optional)";
const MESSAGE = "A message long enough to pass validation.";

const originalSupportEmail = appEnv.supportEmail;

async function submit() {
  // The card's TITLE is also "Send feedback"; the role narrows it to the button.
  await act(async () => fireEvent.press(screen.getByRole("button", { name: "Send feedback" })));
}

describe("SupportScreen guest reply-to (#1447)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: "guest-1", is_anonymous: true };
    appEnv.supportEmail = "support@selftend.org";
    mockInvoke.mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue({
      functions: { invoke: mockInvoke },
    } as unknown as ReturnType<typeof requireSupabase>);
  });

  afterEach(() => {
    appEnv.supportEmail = originalSupportEmail;
  });

  it("offers the field to a guest", () => {
    renderWithProviders(<SupportScreen />);

    expect(screen.getByLabelText(REPLY_TO_LABEL)).toBeTruthy();
  });

  it("does not offer the field to a registered user - their address is server-resolved", () => {
    mockUser = { id: "user-1", email: "person@example.com", is_anonymous: false };

    renderWithProviders(<SupportScreen />);

    expect(screen.queryByLabelText(REPLY_TO_LABEL)).toBeNull();
  });

  // A just-converted guest can carry a stale is_anonymous claim until token
  // refresh (#1443) - but they have an account email now, and the server
  // would silently ignore anything typed here in favour of it.
  it("does not offer the field to a converted guest with a stale anonymous claim", () => {
    mockUser = { id: "user-1", email: "person@example.com", is_anonymous: true };

    renderWithProviders(<SupportScreen />);

    expect(screen.queryByLabelText(REPLY_TO_LABEL)).toBeNull();
  });

  it("sends the trimmed reply-to when a guest fills it", async () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText("Message"), MESSAGE);
    fireEvent.changeText(screen.getByLabelText(REPLY_TO_LABEL), "  reply@example.com  ");

    await submit();

    expect(mockInvoke).toHaveBeenCalledWith("send-feedback", {
      body: { category: "suggestion", message: MESSAGE, replyTo: "reply@example.com" },
    });
  });

  it("sends no replyTo key at all when a guest leaves it empty", async () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText("Message"), MESSAGE);

    await submit();

    expect(mockInvoke).toHaveBeenCalledWith("send-feedback", {
      body: { category: "suggestion", message: MESSAGE },
    });
  });

  it("refuses a filled but malformed address without sending", async () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText("Message"), MESSAGE);
    fireEvent.changeText(screen.getByLabelText(REPLY_TO_LABEL), "not-an-email");

    await submit();

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a valid email address, or leave the field empty.")).toBeTruthy();
  });

  it("never sends a replyTo for a registered user", async () => {
    mockUser = { id: "user-1", email: "person@example.com", is_anonymous: false };

    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText("Message"), MESSAGE);

    await submit();

    expect(mockInvoke).toHaveBeenCalledWith("send-feedback", {
      body: { category: "suggestion", message: MESSAGE },
    });
  });
});

/**
 * #1614: the form had three categories and none of them was "this helped".
 *
 * #1598 named that signal the unnumbered half of the yardstick, so someone
 * moved to send it had to file it as a bug, a suggestion or a question — and it
 * then counted as one in the only aggregate that exists.
 *
 * ⚠️ These tests pin the LABEL SET, not just the new member. A fourth button was
 * the change; a row that silently drops back to three, or grows a fifth nobody
 * decided on, is what the equality catches.
 */
describe("SupportScreen feedback categories (#1614)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: "user-1", email: "person@example.com", is_anonymous: false };
    appEnv.supportEmail = "support@selftend.org";
    mockInvoke.mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue({
      functions: { invoke: mockInvoke },
    } as unknown as ReturnType<typeof requireSupabase>);
  });

  afterEach(() => {
    appEnv.supportEmail = originalSupportEmail;
  });

  it("offers four categories, including one that is not a support request", () => {
    renderWithProviders(<SupportScreen />);

    for (const label of ["Bug", "Suggestion", "Question", "This helped"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });

  it("sends `helped` when that category is picked", async () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText("Message"), MESSAGE);

    await act(async () => fireEvent.press(screen.getByRole("button", { name: "This helped" })));
    await submit();

    // The value, not the label, is what reaches the edge function and the
    // Discord mirror - and `validateFeedbackInput` has no allowlist to extend.
    expect(mockInvoke).toHaveBeenCalledWith("send-feedback", {
      body: { category: "helped", message: MESSAGE },
    });
  });

  it("still defaults to suggestion, so the new category is opt-in", async () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText("Message"), MESSAGE);

    await submit();

    expect(mockInvoke).toHaveBeenCalledWith("send-feedback", {
      body: { category: "suggestion", message: MESSAGE },
    });
  });
});

/**
 * #1726: seven cards become one column. These pin the column's ORDER and
 * OUTLINE, the fate of every element §2 of the spec lists, and the env gates -
 * the form itself is left as shipped (its chips, counter and toasts are #1727).
 */
describe("SupportScreen column (#1726)", () => {
  const mockOpenExternalUrl = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;
  const originalEnv = { ...appEnv };

  const SECTION_TITLES = [
    "Other ways to reach us",
    "What support can and can't do",
    "The project",
    "Policies",
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: "user-1", email: "person@example.com", is_anonymous: false };
    appEnv.supportEmail = "support@selftend.org";
    appEnv.githubRepoUrl = "https://github.com/Selftend/selftend";
    appEnv.discordUrl = "https://discord.gg/selftend";
    appEnv.playStoreUrl = "https://play.google.com/store/apps/details?id=org.selftend.app";
    appEnv.appStoreUrl = "";
    mockInvoke.mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue({
      functions: { invoke: mockInvoke },
    } as unknown as ReturnType<typeof requireSupabase>);
  });

  afterEach(() => {
    Object.assign(appEnv, originalEnv);
    setPlatformOS("ios");
  });

  it("reads as one column: the h1, the callout, the form's h2, then four h3 sections in order", () => {
    renderWithProviders(<SupportScreen />);

    const headings = screen.getAllByRole("heading");
    // `Number(...)`: the display heading carries its level as a string, the cards
    // and sections as a number - the outline is the same either way.
    expect(headings.map((h) => Number(h.props["aria-level"]))).toEqual([1, 3, 2, 3, 3, 3, 3]);
    expect(headings.map((h) => h.props.children)).toEqual([
      "Support",
      "Use urgent support for urgent risk",
      "Send feedback",
      ...SECTION_TITLES,
    ]);
    expect(
      screen.getByText("Reach a person, read the policies, or open the project."),
    ).toBeTruthy();
  });

  it("carries one crisis notice - the callout - whose button pushes /crisis", () => {
    renderWithProviders(<SupportScreen />);

    const doors = screen.getAllByRole("button", { name: "Open crisis guidance" });
    expect(doors).toHaveLength(1);
    fireEvent.press(doors[0]);
    expect(router.push).toHaveBeenCalledWith("/crisis");

    // The form's only crisis reminder is now the second sentence of its intro.
    expect(
      screen.getByText(
        "A bug, an idea, a question, or what's working. Leave out private entries and crisis details.",
      ),
    ).toBeTruthy();
  });

  it("offers three ways out of the app: mail, the issue tracker, and Discord", () => {
    renderWithProviders(<SupportScreen />);

    fireEvent.press(screen.getByRole("link", { name: "Email support" }));
    expect(mockOpenExternalUrl).toHaveBeenLastCalledWith(
      "mailto:support@selftend.org?subject=Selftend%20support",
    );
    expect(screen.getByText("support@selftend.org · Include the minimum needed.")).toBeTruthy();

    fireEvent.press(screen.getByRole("link", { name: "Report on GitHub" }));
    expect(mockOpenExternalUrl).toHaveBeenLastCalledWith(
      "https://github.com/Selftend/selftend/issues",
    );

    fireEvent.press(screen.getByRole("link", { name: "Join our Discord" }));
    expect(mockOpenExternalUrl).toHaveBeenLastCalledWith("https://discord.gg/selftend");
  });

  it("without a support email: no form, and the Email row is off with the reason as its second line", () => {
    appEnv.supportEmail = "";
    renderWithProviders(<SupportScreen />);

    expect(screen.queryByLabelText("Message")).toBeNull();
    const row = screen.getByRole("link", { name: "Email support", disabled: true });
    expect(screen.getByText(/Set EXPO_PUBLIC_SUPPORT_EMAIL before public launch/)).toBeTruthy();
    fireEvent.press(row);
    expect(mockOpenExternalUrl).not.toHaveBeenCalled();
  });

  it("without a Discord URL the row is absent, not disabled", () => {
    appEnv.discordUrl = "";
    renderWithProviders(<SupportScreen />);

    expect(screen.queryByRole("link", { name: "Join our Discord" })).toBeNull();
  });

  it("lists five things support can help with and four it cannot, then the FAQ", () => {
    renderWithProviders(<SupportScreen />);

    expect(screen.getByText("Can help with")).toBeTruthy();
    for (const item of [
      "Sign-in problems and sync failures",
      "Missing records or app crashes",
      "Account deletion when the in-app flow fails",
      "Accessibility issues",
      "Translation feedback",
    ]) {
      expect(screen.getByText(item)).toBeTruthy();
    }
    expect(screen.getByText("Can't help with")).toBeTruthy();
    for (const item of [
      "Crisis response",
      "Therapy or diagnosis",
      "Clinical advice",
      "Interpreting your own records",
    ]) {
      expect(screen.getByText(item)).toBeTruthy();
    }
    expect(screen.getAllByRole("listitem")).toHaveLength(9);

    fireEvent.press(screen.getByRole("link", { name: "Read the full FAQ" }));
    expect(router.push).toHaveBeenCalledWith("/faq");
  });

  it("opens the repository and the contribution guide", () => {
    renderWithProviders(<SupportScreen />);

    fireEvent.press(screen.getByRole("link", { name: "Open repository" }));
    expect(mockOpenExternalUrl).toHaveBeenLastCalledWith("https://github.com/Selftend/selftend");
    expect(screen.getByText("GitHub · AGPL-3.0")).toBeTruthy();

    fireEvent.press(screen.getByRole("link", { name: "Open contribution guide" }));
    expect(mockOpenExternalUrl).toHaveBeenLastCalledWith(
      "https://github.com/Selftend/selftend/blob/main/.github/CONTRIBUTING.md",
    );
  });

  // Advertising the Android app inside the Android app is noise, so the store
  // rows are a web-only surface - gated at the mount point, never self-hiding.
  it("hides the store rows on native", () => {
    setPlatformOS("ios");
    renderWithProviders(<SupportScreen />);

    expect(screen.queryByRole("link", { name: "Get it on Android" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Get it on iOS" })).toBeNull();
  });

  it("on web, Android opens Google Play and iOS waits, disabled, with Coming soon", () => {
    setPlatformOS("web");
    renderWithProviders(<SupportScreen />);

    fireEvent.press(screen.getByRole("link", { name: "Get it on Android" }));
    expect(mockOpenExternalUrl).toHaveBeenLastCalledWith(
      "https://play.google.com/store/apps/details?id=org.selftend.app",
    );
    expect(screen.getByText("Google Play")).toBeTruthy();

    expect(screen.getByRole("link", { name: "Get it on iOS", disabled: true })).toBeTruthy();
    expect(screen.getByText("Coming soon")).toBeTruthy();
  });

  it("policies are two rows that push in-app, and none of them is the crisis page", () => {
    renderWithProviders(<SupportScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Privacy policy" }));
    expect(router.push).toHaveBeenLastCalledWith("/privacy");
    fireEvent.press(screen.getByRole("button", { name: "Terms and boundaries" }));
    expect(router.push).toHaveBeenLastCalledWith("/terms");
    expect(router.push).not.toHaveBeenCalledWith("/crisis");
  });

  it("deletes the account from here: the row opens the modal, and nothing points at /account-deletion", () => {
    renderWithProviders(<SupportScreen />);

    // The old ghost button's label; the modal's confirm button shares it, but
    // only once the modal is open.
    expect(screen.queryByRole("button", { name: "Delete account" })).toBeNull();

    fireEvent.press(screen.getByLabelText("Delete my account"));
    expect(screen.getByText("Delete account permanently?")).toBeTruthy();
    expect(router.push).not.toHaveBeenCalledWith("/account-deletion");
  });
});

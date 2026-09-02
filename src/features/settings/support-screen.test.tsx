import { FunctionsHttpError } from "@supabase/supabase-js";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

// ☠️ This test must NOT live beside the screen: everything under app/ is an
// expo-router ROUTE, so `app/(app)/support.test.tsx` registered a literal
// /support.test route and failed the route-population guards (escape-coverage,
// nav-singular). Screens in app/ get their component tests out here.
import SupportScreen from "@/app/(app)/support";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { captureError } from "@/src/lib/sentry";
import { requireSupabase } from "@/src/lib/supabase";
import { useToastStore } from "@/src/stores/toast-store";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/lib/sentry", () => ({
  captureError: jest.fn(),
  // The real predicate: "a 429 is not reported" is tested against the rule the
  // rest of the app reports by, not against a stub of it.
  isReportableError: jest.requireActual("@/src/lib/sentry").isReportableError,
}));

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
  // The card's TITLE is also "Send a message"; the role narrows it to the button.
  await act(async () => fireEvent.press(screen.getByRole("button", { name: "Send message" })));
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
      body: { category: "idea", message: MESSAGE, replyTo: "reply@example.com" },
    });
  });

  it("sends no replyTo key at all when a guest leaves it empty", async () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText("Message"), MESSAGE);

    await submit();

    expect(mockInvoke).toHaveBeenCalledWith("send-feedback", {
      body: { category: "idea", message: MESSAGE },
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
      body: { category: "idea", message: MESSAGE },
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

    for (const label of ["Bug", "Idea", "Question", "This helped"]) {
      expect(screen.getByRole("radio", { name: label })).toBeTruthy();
    }
  });

  it("sends `helped` when that category is picked", async () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText("Message"), MESSAGE);

    await act(async () => fireEvent.press(screen.getByRole("radio", { name: "This helped" })));
    await submit();

    // The value, not the label, is what reaches the edge function and the
    // Discord mirror - and `validateFeedbackInput` has no allowlist to extend.
    expect(mockInvoke).toHaveBeenCalledWith("send-feedback", {
      body: { category: "helped", message: MESSAGE },
    });
  });

  it("still defaults to idea, so the new category is opt-in", async () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText("Message"), MESSAGE);

    await submit();

    expect(mockInvoke).toHaveBeenCalledWith("send-feedback", {
      body: { category: "idea", message: MESSAGE },
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
      "Send a message",
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

/**
 * #1727: the form, field by field - radio chips, a counter, a reply-to line, and
 * a Send that returns. Closes #1722: Send never came back after one success,
 * and the category buttons announced no selection.
 */
describe("SupportScreen form (#1727)", () => {
  const mockCaptureError = captureError as jest.MockedFunction<typeof captureError>;
  const MESSAGE_LABEL = "Message";

  beforeEach(() => {
    jest.clearAllMocks();
    useToastStore.getState().clearToasts();
    mockUser = { id: "user-1", email: "person@example.com", is_anonymous: false };
    appEnv.supportEmail = "support@selftend.org";
    mockInvoke.mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue({
      functions: { invoke: mockInvoke },
    } as unknown as ReturnType<typeof requireSupabase>);
  });

  afterEach(() => {
    appEnv.supportEmail = originalSupportEmail;
    setPlatformOS("ios");
  });

  // The emoji picker's pattern: one tab stop for the group, arrows move the
  // selection, Space selects. The roving props REPLACE the chip's own Space
  // handler, so one Space is one selection (the RNW Space-activation trap).
  it("on web: arrows move the checked chip and the tab stop, Space selects", () => {
    setPlatformOS("web");
    renderWithProviders(<SupportScreen />);

    const idea = screen.getByRole("radio", { name: "Idea" });
    expect(idea.props.tabIndex).toBe(0);
    expect(screen.getByRole("radio", { name: "Bug" }).props.tabIndex).toBe(-1);

    const preventDefault = jest.fn();
    fireEvent(idea, "keyDown", { key: "ArrowRight", repeat: false, preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    const question = screen.getByRole("radio", { name: "Question", checked: true });
    expect(question.props.tabIndex).toBe(0);
    expect(screen.getByRole("radio", { name: "Idea", checked: false }).props.tabIndex).toBe(-1);

    fireEvent(screen.getByRole("radio", { name: "Bug" }), "keyDown", {
      key: " ",
      repeat: false,
      preventDefault: jest.fn(),
    });
    expect(screen.getByRole("radio", { name: "Bug", checked: true })).toBeTruthy();
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
  });

  it("is a radiogroup of four radios with idea checked by default", () => {
    renderWithProviders(<SupportScreen />);

    // The group is a plain View, which RNTL's role query never matches (it is
    // not `accessible`, and must not be - that would fold the radios into one
    // element on iOS). The emoji picker's test reads the role the same way.
    expect(screen.getByLabelText("What is it about?").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("radio", { name: "Idea", checked: true })).toBeTruthy();
    for (const label of ["Bug", "Question", "This helped"]) {
      expect(screen.getByRole("radio", { name: label, checked: false })).toBeTruthy();
    }
    // The old buttons are gone, not doubled.
    expect(screen.queryByRole("button", { name: "Idea" })).toBeNull();
  });

  // The static key-coverage guard cannot see a template key, so every value the
  // two `feedback.*.${cat}` templates can take is resolved here, by rendering.
  it("resolves a label and a placeholder for each of the four categories", () => {
    renderWithProviders(<SupportScreen />);

    const placeholders: Record<string, string> = {
      Bug: "What happened, and what you expected instead.",
      Idea: "What would you change, add, or remove?",
      Question: "Ask anything about how the app or a tool works.",
      "This helped": "What worked, and how? It shapes what gets built next.",
    };
    expect(screen.getByPlaceholderText(placeholders.Idea)).toBeTruthy();
    for (const [label, placeholder] of Object.entries(placeholders)) {
      fireEvent.press(screen.getByRole("radio", { name: label }));
      expect(screen.getByRole("radio", { name: label, checked: true })).toBeTruthy();
      expect(screen.getByPlaceholderText(placeholder)).toBeTruthy();
    }
  });

  it("caps the message at 1000 and counts as the user types", () => {
    renderWithProviders(<SupportScreen />);

    const textarea = screen.getByLabelText(MESSAGE_LABEL);
    expect(textarea.props.maxLength).toBe(1000);
    expect(screen.getByText("0 / 1000")).toBeTruthy();
    expect(screen.getByLabelText("0 of 1000 characters")).toBeTruthy();

    fireEvent.changeText(textarea, "Hello");

    expect(screen.getByText("5 / 1000")).toBeTruthy();
    // ☠️ `{{current}}`, never `{{count}}` - the latter is i18next's plural
    // selector, and the lookup would walk `counterLabel_one` / `_other` first.
    expect(screen.getByLabelText("5 of 1000 characters")).toBeTruthy();
  });

  it("refuses a message shorter than ten characters inline, without invoking", async () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText(MESSAGE_LABEL), "Hello");

    await submit();

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(screen.getByText("Please write at least 10 characters.")).toBeTruthy();
    expect(useToastStore.getState().visible).toBeNull();
  });

  // #1722: the success used to REPLACE the button with a line of text, so a
  // second message had no way to be sent without leaving the page.
  it("on success: a toast, a cleared form, idea again, and the Send button still there", async () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.press(screen.getByRole("radio", { name: "Question" }));
    fireEvent.changeText(screen.getByLabelText(MESSAGE_LABEL), MESSAGE);

    await submit();

    expect(mockInvoke).toHaveBeenCalledWith("send-feedback", {
      body: { category: "question", message: MESSAGE },
    });
    await waitFor(() =>
      expect(useToastStore.getState().visible).toMatchObject({
        tone: "success",
        title: "Your feedback was sent. Thank you!",
      }),
    );
    expect(screen.getByLabelText(MESSAGE_LABEL).props.value).toBe("");
    expect(screen.getByText("0 / 1000")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Idea", checked: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send message" })).toBeTruthy();
    expect(screen.queryByText("Your feedback was sent. Thank you!")).toBeNull();
  });

  it("on a failure that is not a 429: an error toast, the message kept, and a capture", async () => {
    mockInvoke.mockResolvedValue({ error: new FunctionsHttpError({ status: 500 }) });
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText(MESSAGE_LABEL), MESSAGE);

    await submit();

    await waitFor(() =>
      expect(useToastStore.getState().visible).toMatchObject({
        tone: "error",
        title: "Failed to send feedback. Please try again.",
      }),
    );
    expect(screen.getByLabelText(MESSAGE_LABEL).props.value).toBe(MESSAGE);
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Send message" })).toBeTruthy();
  });

  it("on a 429: the rate-limit toast, the message kept, and nothing reported", async () => {
    mockInvoke.mockResolvedValue({ error: new FunctionsHttpError({ status: 429 }) });
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText(MESSAGE_LABEL), MESSAGE);

    await submit();

    await waitFor(() =>
      expect(useToastStore.getState().visible).toMatchObject({
        tone: "error",
        title: "You've sent a few messages recently. Please try again in an hour.",
      }),
    );
    expect(screen.getByLabelText(MESSAGE_LABEL).props.value).toBe(MESSAGE);
    expect(mockCaptureError).not.toHaveBeenCalled();
  });

  it("tells an account holder where replies go, and offers them no field", () => {
    renderWithProviders(<SupportScreen />);

    expect(screen.getByText("Replies go to person@example.com.")).toBeTruthy();
    expect(screen.queryByLabelText(REPLY_TO_LABEL)).toBeNull();
  });

  it("offers a guest the field and no address line", () => {
    mockUser = { id: "guest-1", is_anonymous: true };
    renderWithProviders(<SupportScreen />);

    expect(screen.getByLabelText(REPLY_TO_LABEL)).toBeTruthy();
    expect(screen.queryByText(/Replies go to/)).toBeNull();
  });

  it("shows an account without an email neither the field nor the line", () => {
    mockUser = { id: "user-2", is_anonymous: false };
    renderWithProviders(<SupportScreen />);

    expect(screen.queryByLabelText(REPLY_TO_LABEL)).toBeNull();
    expect(screen.queryByText(/Replies go to/)).toBeNull();
  });

  it("says beside the button that nothing from the person's records is attached", () => {
    renderWithProviders(<SupportScreen />);

    expect(
      screen.getByText("Nothing from your journal, records, or check-ins is attached."),
    ).toBeTruthy();
  });

  it("disables Send only while sending, with the sending label", async () => {
    let resolveInvoke: (value: { error: null }) => void = () => {};
    mockInvoke.mockReturnValue(
      new Promise<{ error: null }>((resolve) => {
        resolveInvoke = resolve;
      }),
    );
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText(MESSAGE_LABEL), MESSAGE);

    await act(async () => fireEvent.press(screen.getByRole("button", { name: "Send message" })));

    expect(screen.getByRole("button", { name: "Sending...", disabled: true })).toBeTruthy();

    await act(async () => resolveInvoke({ error: null }));

    expect(screen.getByRole("button", { name: "Send message", disabled: false })).toBeTruthy();
  });
});

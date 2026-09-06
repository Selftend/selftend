import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { TextInput } from "react-native";

import bgAuth from "@/src/i18n/locales/bg/auth.json";
import i18n from "@/src/i18n";
import { SignInForm } from "./sign-in-form";
import { signInWithPassword } from "@/src/features/auth/api";
import { guestHasContent } from "@/src/features/auth/guest-content";
import { consumeSignInPrefill, recordSignInPrefill } from "@/src/features/auth/sign-in-prefill";
import { captureError } from "@/src/lib/sentry";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => {
  const React = require("react") as typeof import("react");

  return {
    router: { replace: jest.fn(), push: jest.fn() },
    usePathname: () => "/sign-in",
    // The prefill consume runs on focus; outside a navigator, mount is the
    // closest stand-in (same shape as module-home-header.test.tsx).
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(callback, [callback]);
    },
  };
});

// Mutable so the warn-and-abandon tests (#1444) can flip the session into a
// guest; the factory closes over it and reads it at render time.
const mockSessionState: {
  hasSupabaseConfig: boolean;
  user: { is_anonymous?: boolean; email?: string } | null;
} = { hasSupabaseConfig: true, user: null };

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => mockSessionState,
}));

jest.mock("@/src/features/auth/guest-content", () => ({
  guestHasContent: jest.fn(),
}));

// The dialog's in-place export, stubbed at the hook seam: the real one drags
// in the settings mutation + toast store, none of which is under test here.
jest.mock("@/src/features/settings/use-export-data", () => {
  const exportData = jest.fn().mockResolvedValue(true);
  return { useExportData: () => ({ exportData, isPending: false }) };
});

jest.mock("@/src/lib/sentry", () => ({
  captureError: jest.fn(),
  // The real predicate, so "offline is not reported" is tested against the rule
  // the rest of the app reports by rather than against a stub of it.
  isReportableError: jest.requireActual("@/src/lib/sentry").isReportableError,
}));

jest.mock("@/src/features/auth/api", () => ({
  INVALID_CREDENTIALS_ERROR: "INVALID_CREDENTIALS",
  signInWithPassword: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  // Off by default: the Apple button is iOS-only and these tests are about the
  // email/password form, not the provider row.
  isAppleSignInAvailable: jest.fn().mockResolvedValue(false),
  resendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockSignIn = signInWithPassword as jest.MockedFunction<typeof signInWithPassword>;
const mockGuestHasContent = guestHasContent as jest.MockedFunction<typeof guestHasContent>;

const NOT_CONFIRMED_MESSAGE =
  "Please verify your email before signing in. Use the link we emailed you, or resend it below.";

function fillCredentials() {
  const inputs = screen.UNSAFE_getAllByType(TextInput);
  fireEvent.changeText(inputs[0], "person@example.com");
  fireEvent.changeText(inputs[1], "Testpassword1");
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSessionState.user = null;
  // Drain any handoff a previous test recorded - the module is consume-once,
  // so one stray record would leak into the next render.
  consumeSignInPrefill();
});

describe("SignInForm", () => {
  it("shows a friendly, localized verification message and a resend link when the email is unconfirmed", async () => {
    mockSignIn.mockRejectedValue(new Error("Email not confirmed"));
    renderWithProviders(<SignInForm />);

    fillCredentials();
    fireEvent.press(screen.getByText("Continue"));

    expect(await screen.findByText(NOT_CONFIRMED_MESSAGE)).toBeTruthy();
    expect(screen.getByText("Resend verification email")).toBeTruthy();
    expect(screen.queryByText("Email not confirmed")).toBeNull();
  });

  it("maps invalid credentials to friendly copy with the SSO hint (no raw GoTrue text)", async () => {
    mockSignIn.mockRejectedValue(new Error("INVALID_CREDENTIALS"));
    renderWithProviders(<SignInForm />);

    fillCredentials();
    fireEvent.press(screen.getByText("Continue"));

    expect(
      await screen.findByText(
        "Incorrect email or password. If you signed up with Google, use 'Continue with Google' instead.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Invalid login credentials")).toBeNull();
    expect(screen.queryByText("Resend verification email")).toBeNull();
  });

  // This asserted the raw thrown message reaching the user until #1060 - English
  // whatever their language, naming no step they can take. That contract is
  // deliberately gone, not weakened: unmapped failures show the translated sentence,
  // and the raw error goes to Sentry instead (below).
  it("translates other sign-in failures instead of showing the raw message", async () => {
    mockSignIn.mockRejectedValue(new Error("Some GoTrue internals exploded"));
    renderWithProviders(<SignInForm />);

    fillCredentials();
    fireEvent.press(screen.getByText("Continue"));

    expect(await screen.findByText("Unable to sign in.")).toBeTruthy();
    expect(screen.queryByText("Some GoTrue internals exploded")).toBeNull();
    expect(screen.queryByText(NOT_CONFIRMED_MESSAGE)).toBeNull();
    expect(screen.queryByText("Resend verification email")).toBeNull();
    // The message the screen no longer shows stays diagnosable: `signInWithPassword`
    // is not a TanStack mutation, so no global reporter sees it.
    expect(captureError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Some GoTrue internals exploded" }),
    );
  });

  it("does not report the expected offline failure to Sentry, but still tells the user", async () => {
    mockSignIn.mockRejectedValue(new Error("Network request failed"));
    renderWithProviders(<SignInForm />);

    fillCredentials();
    fireEvent.press(screen.getByText("Continue"));

    expect(await screen.findByText("Unable to sign in.")).toBeTruthy();
    expect(captureError).not.toHaveBeenCalled();
  });

  it("gives the email and password inputs accessible names", () => {
    renderWithProviders(<SignInForm />);

    expect(screen.getByLabelText("Email").props.keyboardType).toBe("email-address");
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
  });

  it("renders Google first, then the divider, then the email fields (SSO-first order)", () => {
    renderWithProviders(<SignInForm />);

    // Serialize the rendered tree; textual order mirrors visual order here.
    const flat = JSON.stringify(screen.toJSON());
    const googleIndex = flat.indexOf("Continue with Google");
    const dividerIndex = flat.indexOf("or continue with email");
    const emailIndex = flat.indexOf("Email");

    expect(googleIndex).toBeGreaterThan(-1);
    expect(dividerIndex).toBeGreaterThan(googleIndex);
    expect(emailIndex).toBeGreaterThan(dividerIndex);
  });

  it("renders schema validation messages translated (bg)", async () => {
    // Schemas emit i18n KEYS ("validation.emailRequired"), resolved via t() at
    // render - so switching language switches the validation copy.
    i18n.addResourceBundle("bg", "auth", bgAuth, true, true);
    await act(async () => {
      await i18n.changeLanguage("bg");
    });
    try {
      renderWithProviders(<SignInForm />);

      fireEvent.press(screen.getByText("Продължи"));

      expect(await screen.findByText("Въведи имейл адреса си.")).toBeTruthy();
      expect(screen.queryByText("validation.emailRequired")).toBeNull();
    } finally {
      await act(async () => {
        await i18n.changeLanguage("en");
      });
    }
  });

  /**
   * ⚠️ Both hrefs here are written with their route group - `/(auth)/sign-up` -
   * and `usePathname` never reports one, so recording either verbatim would set
   * a `forPathname` no screen can match. Nothing would break: the destination
   * would just quietly show a plain Up, which is the invisible failure opt-out
   * recording exists to prevent. The helper's `targetPathname` strips the group
   * (#1265, O3).
   */
  it.each([
    ["Forgot your password?", "/reset-password"],
    ["Sign up", "/sign-up"],
  ])("records a group-free target for the %s cross-link", (label, forPathname) => {
    useNavigationOriginStore.setState({ pending: null });
    renderWithProviders(<SignInForm />);

    fireEvent.press(screen.getByText(label));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/sign-in",
      forPathname,
    });
  });

  it("prefills the email from the conversion collision's Sign in instead handoff (#1443)", () => {
    recordSignInPrefill("taken@example.com");
    renderWithProviders(<SignInForm />);

    expect(screen.getByLabelText("Email").props.value).toBe("taken@example.com");
  });

  it("consumes the handoff once: a later plain visit starts empty", () => {
    recordSignInPrefill("taken@example.com");
    renderWithProviders(<SignInForm />);
    screen.unmount();

    renderWithProviders(<SignInForm />);
    expect(screen.getByLabelText("Email").props.value).toBe("");
  });

  // Warn-and-abandon (#1444, spec §6): a guest signing in over content gets
  // one calm confirm with an in-place export; an empty guest signs straight
  // in; registered users never pay the content check.
  describe("guest warn-and-abandon", () => {
    const WARNING_TITLE = "Your guest data stays behind";

    // ☠️ `email: ""`, not an absent key — that is what a guest's user object
    // actually carries, and the predicate reading it is `!email` (#1896).
    function asGuest() {
      mockSessionState.user = { is_anonymous: true, email: "" };
    }

    it("shows the warning instead of signing in when the guest holds content", async () => {
      asGuest();
      mockGuestHasContent.mockResolvedValue(true);
      renderWithProviders(<SignInForm />);

      fillCredentials();
      fireEvent.press(screen.getByText("Continue"));

      expect(await screen.findByText(WARNING_TITLE)).toBeTruthy();
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it("proceeding from the warning runs the held sign-in", async () => {
      asGuest();
      mockGuestHasContent.mockResolvedValue(true);
      mockSignIn.mockResolvedValue(undefined as never);
      renderWithProviders(<SignInForm />);

      fillCredentials();
      fireEvent.press(screen.getByText("Continue"));
      await screen.findByText(WARNING_TITLE);

      await act(async () => {
        fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
      });

      expect(mockSignIn).toHaveBeenCalledWith("person@example.com", "Testpassword1");
    });

    it("cancel closes the warning without signing in", async () => {
      asGuest();
      mockGuestHasContent.mockResolvedValue(true);
      renderWithProviders(<SignInForm />);

      fillCredentials();
      fireEvent.press(screen.getByText("Continue"));
      await screen.findByText(WARNING_TITLE);

      await act(async () => {
        fireEvent.press(screen.getByText("Cancel"));
      });

      expect(screen.queryByText(WARNING_TITLE)).toBeNull();
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it("runs the export in place from the warning, without closing it", async () => {
      asGuest();
      mockGuestHasContent.mockResolvedValue(true);
      renderWithProviders(<SignInForm />);

      fillCredentials();
      fireEvent.press(screen.getByText("Continue"));
      await screen.findByText(WARNING_TITLE);

      const { useExportData } = jest.requireMock("@/src/features/settings/use-export-data") as {
        useExportData: () => { exportData: jest.Mock };
      };
      await act(async () => {
        fireEvent.press(screen.getByText("Export your data first"));
      });

      expect(useExportData().exportData).toHaveBeenCalled();
      expect(screen.getByText(WARNING_TITLE)).toBeTruthy();
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it("an empty guest signs straight in - no warning", async () => {
      asGuest();
      mockGuestHasContent.mockResolvedValue(false);
      mockSignIn.mockResolvedValue(undefined as never);
      renderWithProviders(<SignInForm />);

      fillCredentials();
      await act(async () => {
        fireEvent.press(screen.getByText("Continue"));
      });

      expect(mockSignIn).toHaveBeenCalledWith("person@example.com", "Testpassword1");
      expect(screen.queryByText(WARNING_TITLE)).toBeNull();
    });

    it("fails toward the warning when the content check itself fails", async () => {
      asGuest();
      mockGuestHasContent.mockRejectedValue(new Error("network down"));
      renderWithProviders(<SignInForm />);

      fillCredentials();
      fireEvent.press(screen.getByText("Continue"));

      expect(await screen.findByText(WARNING_TITLE)).toBeTruthy();
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it("never runs the content check for a registered user", async () => {
      mockSessionState.user = { is_anonymous: false, email: "person@example.com" };
      mockSignIn.mockResolvedValue(undefined as never);
      renderWithProviders(<SignInForm />);

      fillCredentials();
      await act(async () => {
        fireEvent.press(screen.getByText("Continue"));
      });

      expect(mockGuestHasContent).not.toHaveBeenCalled();
      expect(mockSignIn).toHaveBeenCalled();
    });
  });

  /**
   * #1865: the confirm above is calm and complete, but it fires from inside
   * `guardSignIn`, which wraps the SUBMIT actions - so the first mention that
   * this device's data stays behind arrived after an email and a password had
   * been typed. The line says it on arrival instead.
   */
  describe("the guest content notice", () => {
    const NOTICE =
      "What you've saved as a guest stays on this device — you can export a copy before you finish signing in.";

    // ☠️ `email: ""`, not an absent key — that is what a guest's user object
    // actually carries, and the predicate reading it is `!email` (#1896).
    function asGuest() {
      mockSessionState.user = { is_anonymous: true, email: "" };
    }

    it("tells a guest holding content before they have typed anything", async () => {
      asGuest();
      mockGuestHasContent.mockResolvedValue(true);
      renderWithProviders(<SignInForm />);

      // No `fillCredentials()` - arriving is the whole trigger, and the point of
      // the ticket is that this used to need a filled-in form to appear.
      expect(await screen.findByTestId("sign-in-guest-notice")).toBeTruthy();
      expect(screen.getByText(NOTICE)).toBeTruthy();
    });

    /**
     * ☠️ `CONTEXT.md` §Abandonment: both words hide that data is being left
     * behind, which is the one thing this line exists to say.
     */
    it("says it without the words that hide it", () => {
      expect(NOTICE).not.toMatch(/\b(switch|log ?out|sign ?out)\b/i);
    });

    /**
     * ☠️☠️ THE SURFACE #1896 MISSED. `useGuestContentNotice` was still reading
     * `is_anonymous` after the predicate was extracted, so inside the stale-JWT
     * window this line told a person who had JUST converted that their work
     * "stays on this device". It does not — it is theirs by email and password
     * now, and it is going nowhere.
     *
     * That makes this the costliest of the flag-reading surfaces to leave: the
     * line is a standing false claim of impending loss, sitting in front of the
     * account, which `docs/product-principles.md` §12 removes steps toward.
     *
     * ⚠️ The check must never even be ASKED for them. `enabled` is the same
     * predicate, so a converted user pays for no `export_user_data` round trip.
     */
    it("says nothing, and asks nothing, inside the stale-flag window", async () => {
      mockSessionState.user = { is_anonymous: true, email: "converted@example.com" };
      mockGuestHasContent.mockResolvedValue(true);
      renderWithProviders(<SignInForm />);

      await waitFor(() => expect(screen.getByText("Continue")).toBeTruthy());
      expect(screen.queryByTestId("sign-in-guest-notice")).toBeNull();
      expect(mockGuestHasContent).not.toHaveBeenCalled();
    });

    it("says nothing to a guest with an empty account", async () => {
      asGuest();
      mockGuestHasContent.mockResolvedValue(false);
      renderWithProviders(<SignInForm />);

      // Wait for the check to actually resolve, so this is "asked and answered
      // no" rather than "asserted before the answer arrived".
      await waitFor(() => expect(mockGuestHasContent).toHaveBeenCalled());
      expect(screen.queryByTestId("sign-in-guest-notice")).toBeNull();
    });

    /**
     * ☠️ The two halves fail in OPPOSITE directions, and this test is the pair.
     * A standing line is a claim, so an unreachable `export_user_data` must not
     * put one on the screen - but the confirm's polarity is untouched, so an
     * unreachable check still warns at submit. The line can under-promise; it
     * can never over-promise.
     */
    it("stays silent when the check fails, while the confirm still warns", async () => {
      asGuest();
      mockGuestHasContent.mockRejectedValue(new Error("network down"));
      renderWithProviders(<SignInForm />);

      await waitFor(() => expect(mockGuestHasContent).toHaveBeenCalled());
      expect(screen.queryByTestId("sign-in-guest-notice")).toBeNull();

      fillCredentials();
      fireEvent.press(screen.getByText("Continue"));

      expect(await screen.findByText("Your guest data stays behind")).toBeTruthy();
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it("shows nothing, and asks nothing, for a registered user", async () => {
      mockSessionState.user = { is_anonymous: false, email: "person@example.com" };
      renderWithProviders(<SignInForm />);

      await waitFor(() => expect(screen.getByText("Continue")).toBeTruthy());
      expect(screen.queryByTestId("sign-in-guest-notice")).toBeNull();
      // The mount check is disabled outright, so a registered user never pays
      // the export round trip for a line that could not apply to them.
      expect(mockGuestHasContent).not.toHaveBeenCalled();
    });
  });
});

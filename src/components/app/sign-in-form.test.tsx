import { act, fireEvent, screen } from "@testing-library/react-native";
import { TextInput } from "react-native";

import bgAuth from "@/src/i18n/locales/bg/auth.json";
import i18n from "@/src/i18n";
import { SignInForm } from "./sign-in-form";
import { signInWithPassword } from "@/src/features/auth/api";
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

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ hasSupabaseConfig: true }),
}));

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

const NOT_CONFIRMED_MESSAGE =
  "Please verify your email before signing in. Use the link we emailed you, or resend it below.";

function fillCredentials() {
  const inputs = screen.UNSAFE_getAllByType(TextInput);
  fireEvent.changeText(inputs[0], "person@example.com");
  fireEvent.changeText(inputs[1], "Testpassword1");
}

beforeEach(() => {
  jest.clearAllMocks();
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
});

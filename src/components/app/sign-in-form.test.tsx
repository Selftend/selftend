import { act, fireEvent, screen } from "@testing-library/react-native";
import { TextInput } from "react-native";

import bgAuth from "@/src/i18n/locales/bg/auth.json";
import i18n from "@/src/i18n";
import { SignInForm } from "./sign-in-form";
import { signInWithPassword } from "@/src/features/auth/api";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ hasSupabaseConfig: true }),
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

  it("shows the raw error and no resend link for other sign-in failures", async () => {
    mockSignIn.mockRejectedValue(new Error("Network request failed"));
    renderWithProviders(<SignInForm />);

    fillCredentials();
    fireEvent.press(screen.getByText("Continue"));

    expect(await screen.findByText("Network request failed")).toBeTruthy();
    expect(screen.queryByText(NOT_CONFIRMED_MESSAGE)).toBeNull();
    expect(screen.queryByText("Resend verification email")).toBeNull();
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
});

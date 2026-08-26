import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { TextInput } from "react-native";
import { router } from "expo-router";

import { SignUpForm } from "./sign-up-form";
import {
  convertGuestWithPassword,
  signUpWithPassword,
  EMAIL_ALREADY_EXISTS_ERROR,
  LEAKED_PASSWORD_ERROR,
} from "@/src/features/auth/api";
import { consumeSignInPrefill } from "@/src/features/auth/sign-in-prefill";
import { useSession } from "@/src/providers/session-provider";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  usePathname: () => "/sign-up",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/src/features/auth/api", () => {
  const actual = jest.requireActual("@/src/features/auth/api");
  return {
    ...actual,
    signUpWithPassword: jest.fn(),
    convertGuestWithPassword: jest.fn(),
    signInWithGoogle: jest.fn(),
    signInWithApple: jest.fn(),
    // Pinned rather than inherited from requireActual: jest-expo runs this
    // suite as iOS, so the real check would consult the native module and make
    // these assertions depend on the host.
    isAppleSignInAvailable: jest.fn().mockResolvedValue(false),
  };
});

const mockSignUp = signUpWithPassword as jest.MockedFunction<typeof signUpWithPassword>;
const mockConvert = convertGuestWithPassword as jest.MockedFunction<
  typeof convertGuestWithPassword
>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

type SessionValue = ReturnType<typeof useSession>;

const registeredOutSession = { hasSupabaseConfig: true } as SessionValue;
const guestSession = {
  hasSupabaseConfig: true,
  user: { id: "guest-1", is_anonymous: true },
} as unknown as SessionValue;

function fillForm() {
  const inputs = screen.UNSAFE_getAllByType(TextInput);
  // Fields in order: name, email, password, confirmPassword
  fireEvent.changeText(inputs[1], "person@example.com");
  fireEvent.changeText(inputs[2], "twelvechars1!");
  fireEvent.changeText(inputs[3], "twelvechars1!");
}

beforeEach(() => {
  jest.clearAllMocks();
  // The signed-out default: existing sign-up behaviour. Conversion tests
  // override with a guest session per-test.
  mockUseSession.mockReturnValue(registeredOutSession);
});

describe("SignUpForm", () => {
  it("shows the leaked-password message when the API throws LEAKED_PASSWORD_ERROR", async () => {
    mockSignUp.mockRejectedValue(new Error(LEAKED_PASSWORD_ERROR));
    renderWithProviders(<SignUpForm />);
    fillForm();
    fireEvent.press(screen.getByText("Sign up"));

    expect(
      await screen.findByText(
        "This password appears in known data breaches. Please pick a different one.",
      ),
    ).toBeTruthy();
  });

  it("routes straight into the app when signup returns a session (autoconfirm, #489)", async () => {
    mockSignUp.mockResolvedValue({ session: { access_token: "t" }, user: { id: "u1" } } as Awaited<
      ReturnType<typeof signUpWithPassword>
    >);
    renderWithProviders(<SignUpForm />);
    fillForm();
    fireEvent.press(screen.getByText("Sign up"));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/(app)"));
  });

  it("falls back to the verify-email screen when signup returns no session", async () => {
    // A confirmation-mode environment (prod until its flip) returns a null
    // session - the legacy interstitial still owns that path.
    mockSignUp.mockResolvedValue({ session: null, user: { id: "u1" } } as Awaited<
      ReturnType<typeof signUpWithPassword>
    >);
    renderWithProviders(<SignUpForm />);
    fillForm();
    fireEvent.press(screen.getByText("Sign up"));

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith({
        pathname: "/(auth)/verify-email",
        params: { email: "person@example.com" },
      }),
    );
  });

  it("gives every input an accessible name", () => {
    renderWithProviders(<SignUpForm />);

    expect(screen.getByLabelText("Display name")).toBeTruthy();
    expect(screen.getByLabelText("Email").props.keyboardType).toBe("email-address");
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
    expect(screen.getByLabelText("Confirm password").props.secureTextEntry).toBe(true);
  });

  /**
   * ⚠️ The href is written `/(auth)/sign-in` and `usePathname` never reports a
   * route group, so recording it verbatim would set a `forPathname` no screen
   * can ever match - and nothing would break, the sign-in screen would just
   * quietly show a plain Up. That silent failure is what opt-out recording
   * exists to prevent, so reintroducing it one call site at a time is the way
   * this batch could go wrong. The helper's `targetPathname` strips the group
   * (#1265, O3).
   */
  it("records a group-free target for the sign-in cross-link", () => {
    useNavigationOriginStore.setState({ pending: null });
    renderWithProviders(<SignUpForm />);

    fireEvent.press(screen.getByText("Sign in"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/sign-up",
      forPathname: "/sign-in",
    });
  });

  describe("conversion mode (#1443, guest session)", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(guestSession);
    });

    it("shows the conversion copy and hides the OAuth buttons until #1445", () => {
      renderWithProviders(<SignUpForm />);

      expect(screen.getByText("Create your account")).toBeTruthy();
      expect(
        screen.getByText("Your data comes with you - everything you've added stays."),
      ).toBeTruthy();
      // ☠️ signInWithOAuth would strand the guest's data - OAuth conversion is
      // linkIdentity only and arrives with #1445.
      expect(screen.queryByText("Continue with Google")).toBeNull();
      expect(screen.getByText("Create account")).toBeTruthy();
    });

    it("converts the guest in place and routes into the app", async () => {
      mockConvert.mockResolvedValue(undefined);
      renderWithProviders(<SignUpForm />);
      fillForm();
      fireEvent.press(screen.getByText("Create account"));

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/(app)"));
      expect(mockConvert).toHaveBeenCalledWith("person@example.com", "twelvechars1!", "");
      expect(signUpWithPassword).not.toHaveBeenCalled();
    });

    it("shows the collision error with a Sign in instead link carrying the typed email", async () => {
      mockConvert.mockRejectedValue(new Error(EMAIL_ALREADY_EXISTS_ERROR));
      renderWithProviders(<SignUpForm />);
      fillForm();
      fireEvent.press(screen.getByText("Create account"));

      expect(await screen.findByText("An account with this email already exists.")).toBeTruthy();

      useNavigationOriginStore.setState({ pending: null });
      fireEvent.press(screen.getByText("Sign in instead"));

      // The email travels as an in-memory handoff, NOT a query param - sign-in
      // is `dangerouslySingular` and nav-singular.test.ts forbids a singular
      // screen keying off search params (see sign-in-prefill.ts).
      expect(router.push).toHaveBeenCalledWith("/(auth)/sign-in");
      expect(consumeSignInPrefill()).toBe("person@example.com");
      expect(useNavigationOriginStore.getState().pending).toEqual({
        origin: "/sign-up",
        forPathname: "/sign-in",
      });
    });
  });
});

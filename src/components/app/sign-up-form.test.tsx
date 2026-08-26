import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { TextInput } from "react-native";
import { router } from "expo-router";

import { SignUpForm } from "./sign-up-form";
import {
  convertGuestWithPassword,
  linkGoogleIdentity,
  signInWithGoogle,
  signUpWithPassword,
  EMAIL_ALREADY_EXISTS_ERROR,
  IDENTITY_ALREADY_EXISTS_ERROR,
  LEAKED_PASSWORD_ERROR,
} from "@/src/features/auth/api";
import {
  consumeConversionCollision,
  recordConversionCollision,
} from "@/src/features/auth/conversion-collision";
import { guestHasContent } from "@/src/features/auth/guest-content";
import { consumeSignInPrefill } from "@/src/features/auth/sign-in-prefill";
import { useSession } from "@/src/providers/session-provider";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => {
  const React = require("react") as typeof import("react");

  return {
    router: { replace: jest.fn(), push: jest.fn() },
    usePathname: () => "/sign-up",
    // The collision-handoff consume runs on focus; outside a navigator, mount
    // is the closest stand-in (same shape as sign-in-form.test.tsx).
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(callback, [callback]);
    },
  };
});

jest.mock("@/src/features/auth/guest-content", () => ({
  guestHasContent: jest.fn(),
}));

// The abandon dialog's in-place export, stubbed at the hook seam - the real
// one drags in the settings mutation + toast store.
jest.mock("@/src/features/settings/use-export-data", () => {
  const exportData = jest.fn().mockResolvedValue(true);
  return { useExportData: () => ({ exportData, isPending: false }) };
});

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
    // ☠️ requireActual would hand back the REAL link functions (the barrel is
    // spread-mocked): every export the form reaches must be pinned here.
    linkGoogleIdentity: jest.fn(),
    linkAppleIdentity: jest.fn(),
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
const mockLinkGoogle = linkGoogleIdentity as jest.MockedFunction<typeof linkGoogleIdentity>;
const mockSignInWithGoogle = signInWithGoogle as jest.MockedFunction<typeof signInWithGoogle>;
const mockGuestHasContent = guestHasContent as jest.MockedFunction<typeof guestHasContent>;

type SessionValue = ReturnType<typeof useSession>;

const signedOutSession = { hasSupabaseConfig: true } as SessionValue;
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
  mockUseSession.mockReturnValue(signedOutSession);
  // Drain the consume-once collision handoff so one test's record never
  // leaks into the next render (same reasoning as consumeSignInPrefill).
  consumeConversionCollision();
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

    it("shows the conversion copy with the OAuth buttons present (linking, since #1445)", () => {
      renderWithProviders(<SignUpForm />);

      expect(screen.getByText("Create your account")).toBeTruthy();
      expect(
        screen.getByText("Your data comes with you - everything you've added stays."),
      ).toBeTruthy();
      // Present since #1445 - wired to linkIdentity, never signInWithOAuth
      // (the "OAuth conversion" describe below pins that fork).
      expect(screen.getByText("Continue with Google")).toBeTruthy();
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

  // OAuth conversion (#1445): in conversion mode the provider buttons LINK
  // the identity to the guest's account; the sign-in dance appears only as
  // the collision one-tap, behind the abandonment warning (#1444's dialog).
  describe("OAuth conversion", () => {
    const COLLISION_MESSAGE = "That Google account is already connected to a different account.";
    const WARNING_TITLE = "Your guest data stays behind";

    it("links Google instead of signing in when converting a guest", async () => {
      mockUseSession.mockReturnValue(guestSession);
      mockLinkGoogle.mockResolvedValue(true);
      renderWithProviders(<SignUpForm />);

      await waitFor(() => {
        fireEvent.press(screen.getByText("Continue with Google"));
      });

      await waitFor(() => expect(mockLinkGoogle).toHaveBeenCalled());
      expect(mockSignInWithGoogle).not.toHaveBeenCalled();
    });

    it("keeps the plain sign-in dance for a signed-out visitor", async () => {
      mockSignInWithGoogle.mockResolvedValue(true);
      renderWithProviders(<SignUpForm />);

      await waitFor(() => {
        fireEvent.press(screen.getByText("Continue with Google"));
      });

      await waitFor(() => expect(mockSignInWithGoogle).toHaveBeenCalled());
      expect(mockLinkGoogle).not.toHaveBeenCalled();
    });

    it("a link collision shows the inline error and the provider one-tap", async () => {
      mockUseSession.mockReturnValue(guestSession);
      mockLinkGoogle.mockRejectedValue(new Error(IDENTITY_ALREADY_EXISTS_ERROR));
      renderWithProviders(<SignUpForm />);

      fireEvent.press(screen.getByText("Continue with Google"));

      expect(await screen.findByText(COLLISION_MESSAGE)).toBeTruthy();
      expect(screen.getByText("Sign in with Google instead")).toBeTruthy();
    });

    it("the one-tap warns before the second dance when the guest holds content", async () => {
      mockUseSession.mockReturnValue(guestSession);
      mockLinkGoogle.mockRejectedValue(new Error(IDENTITY_ALREADY_EXISTS_ERROR));
      mockGuestHasContent.mockResolvedValue(true);
      renderWithProviders(<SignUpForm />);

      fireEvent.press(screen.getByText("Continue with Google"));
      await screen.findByText(COLLISION_MESSAGE);

      fireEvent.press(screen.getByText("Sign in with Google instead"));

      // The warning interposes - the second dance has NOT started.
      expect(await screen.findByText(WARNING_TITLE)).toBeTruthy();
      expect(mockSignInWithGoogle).not.toHaveBeenCalled();

      await waitFor(() => {
        fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
      });

      await waitFor(() => expect(mockSignInWithGoogle).toHaveBeenCalled());
    });

    it("consumes the web collision handoff on focus in conversion mode", async () => {
      mockUseSession.mockReturnValue(guestSession);
      recordConversionCollision("google");
      renderWithProviders(<SignUpForm />);

      expect(await screen.findByText(COLLISION_MESSAGE)).toBeTruthy();
      expect(screen.getByText("Sign in with Google instead")).toBeTruthy();
      // Consume-once: drained by the render above.
      expect(consumeConversionCollision()).toBeNull();
    });

    it("drains but ignores the handoff outside conversion mode", async () => {
      recordConversionCollision("google");
      renderWithProviders(<SignUpForm />);

      await waitFor(() => expect(consumeConversionCollision()).toBeNull());
      expect(screen.queryByText(COLLISION_MESSAGE)).toBeNull();
    });
  });
});

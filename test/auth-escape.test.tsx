import { fireEvent, screen } from "@testing-library/react-native";
import type { ComponentType } from "react";

import ResetPasswordScreen from "@/app/(auth)/reset-password";
import SignInScreen from "@/app/(auth)/sign-in";
import SignUpScreen from "@/app/(auth)/sign-up";
import UpdatePasswordScreen from "@/app/(auth)/update-password";
import VerifyEmailScreen from "@/app/(auth)/verify-email";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The five form (auth) routes carry an Escape (#1254; W5–W9, clauses R1/R3/T3).
 *
 * They rendered no chrome component at all - `MobileFormScreen` without a
 * `topBar` - so the Escape slot never reached them; they were missed entirely
 * when the escape work was charted, and the rule explicitly pulls them in
 * scope, because a carve-out is precisely the shape that rots. Each is a leaf
 * off the root: the Escape leads to `/`, announces "Back to Home", and the
 * one-crumb trail stays hidden (T3) - the deliverable is the Escape alone.
 *
 * The sixth route, `auth-callback`, renders through its own screen component;
 * its Escape is asserted in `src/components/app/auth-callback-screen.test.tsx`
 * alongside that screen's branch mocks.
 *
 * The forms themselves are mocked to markers: their behaviour (submission,
 * redirect handling, resend flows) is each form's own test file's job, and
 * this suite is about the route wiring - the marker assertion pins that the
 * route still renders its form, so the chrome cannot silently replace it.
 */

let mockPathname = "/sign-in";
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args), push: jest.fn() },
  usePathname: () => mockPathname,
  Redirect: () => null,
}));

jest.mock("@/src/providers/session-provider", () => ({
  // No session: the signed-out render is the one that carries the chrome
  // (signed in, sign-in/sign-up return a `<Redirect>` before any UI).
  useSession: () => ({ session: null, hasSupabaseConfig: true }),
}));

jest.mock("@/src/components/app/sign-in-form", () => {
  const { View } = jest.requireActual("react-native");
  return { SignInForm: () => <View testID="auth-form" /> };
});
jest.mock("@/src/components/app/sign-up-form", () => {
  const { View } = jest.requireActual("react-native");
  return { SignUpForm: () => <View testID="auth-form" /> };
});
jest.mock("@/src/components/app/forgot-password-form", () => {
  const { View } = jest.requireActual("react-native");
  return { ForgotPasswordForm: () => <View testID="auth-form" /> };
});
jest.mock("@/src/components/app/reset-password-form", () => {
  const { View } = jest.requireActual("react-native");
  return { ResetPasswordForm: () => <View testID="auth-form" /> };
});
jest.mock("@/src/components/app/verify-email-form", () => {
  const { View } = jest.requireActual("react-native");
  return { VerifyEmailForm: () => <View testID="auth-form" /> };
});

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ⚠️ The crumb label is what the TRAIL would render if it ever un-hid here -
// its absence is the "no trail" acceptance criterion, not decoration.
const ROUTES: [pathname: string, Screen: ComponentType, crumbLabel: string][] = [
  ["/sign-in", SignInScreen, "Sign in"],
  ["/sign-up", SignUpScreen, "Sign up"],
  ["/reset-password", ResetPasswordScreen, "Reset password"],
  ["/update-password", UpdatePasswordScreen, "Update password"],
  ["/verify-email", VerifyEmailScreen, "Verify email"],
];

describe.each(ROUTES)("the %s route", (pathname, Screen, crumbLabel) => {
  it("carries exactly one Escape, leading to `/` as 'Back to Home', with no trail", () => {
    mockPathname = pathname;
    renderWithProviders(<Screen />);

    // R1: exactly one; the form itself still renders under it.
    expect(screen.getAllByTestId("screen-escape")).toHaveLength(1);
    expect(screen.getByTestId("auth-form")).toBeTruthy();

    // T3: a leaf off the root - the Escape names the root and `replace`s to it.
    fireEvent.press(screen.getByLabelText("Back to Home"));
    expect(mockReplace).toHaveBeenCalledWith("/");

    // T3: an Escape but no trail - a one-crumb screen's crumb stays hidden, so
    // the route's own name never appears as a crumb beside the arrow.
    expect(screen.queryByText(crumbLabel)).toBeNull();
  });
});

import { fireEvent, screen } from "@testing-library/react-native";
import { TextInput } from "react-native";

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
  signInWithPassword: jest.fn(),
  signInWithGoogle: jest.fn(),
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

  it("shows the raw error and no resend link for other sign-in failures", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid login credentials"));
    renderWithProviders(<SignInForm />);

    fillCredentials();
    fireEvent.press(screen.getByText("Continue"));

    expect(await screen.findByText("Invalid login credentials")).toBeTruthy();
    expect(screen.queryByText(NOT_CONFIRMED_MESSAGE)).toBeNull();
    expect(screen.queryByText("Resend verification email")).toBeNull();
  });
});

import { fireEvent, screen } from "@testing-library/react-native";
import { TextInput } from "react-native";

import { SignUpForm } from "./sign-up-form";
import { signUpWithPassword, LEAKED_PASSWORD_ERROR } from "@/src/features/auth/api";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ hasSupabaseConfig: true }),
}));

jest.mock("@/src/features/auth/api", () => {
  const actual = jest.requireActual("@/src/features/auth/api");
  return {
    ...actual,
    signUpWithPassword: jest.fn(),
    signInWithGoogle: jest.fn(),
  };
});

const mockSignUp = signUpWithPassword as jest.MockedFunction<typeof signUpWithPassword>;

function fillForm() {
  const inputs = screen.UNSAFE_getAllByType(TextInput);
  // Fields in order: name, email, password, confirmPassword
  fireEvent.changeText(inputs[1], "person@example.com");
  fireEvent.changeText(inputs[2], "twelvechars1!");
  fireEvent.changeText(inputs[3], "twelvechars1!");
}

beforeEach(() => {
  jest.clearAllMocks();
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
});

import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { ForgotPasswordForm } from "./forgot-password-form";
import { EMAIL_RATE_LIMITED_ERROR, sendPasswordResetEmail } from "@/src/features/auth/api";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ hasSupabaseConfig: true }),
}));

jest.mock("@/src/features/auth/api", () => ({
  EMAIL_RATE_LIMITED_ERROR: "EMAIL_RATE_LIMITED",
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockSendReset = jest.mocked(sendPasswordResetEmail);

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
});

async function submitWithEmail() {
  renderWithProviders(<ForgotPasswordForm />);
  fireEvent.changeText(screen.getByLabelText("Email"), "person@example.com");
  fireEvent.press(screen.getByText("Send reset link"));
  await waitFor(() => {
    expect(mockSendReset).toHaveBeenCalledWith("person@example.com");
  });
}

describe("ForgotPasswordForm", () => {
  it("confirms where the reset link was sent on success", async () => {
    await submitWithEmail();
    expect(
      await screen.findByText(
        "A password-reset link was sent to person@example.com. Check your inbox.",
      ),
    ).toBeTruthy();
  });

  it("shows translated rate-limit copy when the reset email is rate limited", async () => {
    mockSendReset.mockRejectedValueOnce(new Error(EMAIL_RATE_LIMITED_ERROR));
    await submitWithEmail();
    expect(
      await screen.findByText("Please wait a minute before requesting another reset email."),
    ).toBeTruthy();
  });

  it("never surfaces a raw Supabase message for unmapped errors", async () => {
    mockSendReset.mockRejectedValueOnce(new Error("email rate limit exceeded"));
    await submitWithEmail();
    expect(await screen.findByText("Unable to send reset email.")).toBeTruthy();
    expect(screen.queryByText("email rate limit exceeded")).toBeNull();
  });
});

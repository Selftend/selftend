import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { ResetPasswordForm } from "./reset-password-form";
import { updatePassword } from "@/src/features/auth/api";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

const VALID_PASSWORD = "correct-horse-battery";

const mockReplace = jest.fn();
let mockSessionState: { session: { user: { id: string } } | null; status: "loading" | "ready" };

jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => mockSessionState,
}));

jest.mock("@/src/features/auth/api", () => ({
  LEAKED_PASSWORD_ERROR: "LEAKED_PASSWORD",
  SESSION_MISSING_ERROR: "SESSION_MISSING",
  updatePassword: jest.fn().mockResolvedValue(undefined),
}));

const mockUpdatePassword = jest.mocked(updatePassword);

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSessionState = { session: { user: { id: "u1" } }, status: "ready" };
});

async function submitNewPassword() {
  fireEvent.changeText(screen.getByLabelText("New password"), VALID_PASSWORD);
  fireEvent.changeText(screen.getByLabelText("Confirm new password"), VALID_PASSWORD);
  fireEvent.press(screen.getByText("Update password"));
  await waitFor(() => {
    expect(mockUpdatePassword).toHaveBeenCalledWith(VALID_PASSWORD);
  });
}

describe("ResetPasswordForm", () => {
  it("updates the password and enters the app on success", async () => {
    renderWithProviders(<ResetPasswordForm />);
    await submitNewPassword();
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(app)");
    });
  });

  it("shows the expired-link state instead of the form when there is no recovery session", () => {
    mockSessionState = { session: null, status: "ready" };
    renderWithProviders(<ResetPasswordForm />);

    expect(screen.getByText("Link invalid or expired")).toBeTruthy();
    expect(screen.queryByText("Reset your password")).toBeNull();

    fireEvent.press(screen.getByText("Request a new reset link"));
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/reset-password");
  });

  it("renders neither the form nor the expired state while the session read is pending", () => {
    mockSessionState = { session: null, status: "loading" };
    renderWithProviders(<ResetPasswordForm />);

    expect(screen.queryByText("Reset your password")).toBeNull();
    expect(screen.queryByText("Link invalid or expired")).toBeNull();
  });

  it("switches to the expired-link state when the update reports a missing session", async () => {
    mockUpdatePassword.mockRejectedValueOnce(new Error("SESSION_MISSING"));
    renderWithProviders(<ResetPasswordForm />);
    await submitNewPassword();

    expect(await screen.findByText("Link invalid or expired")).toBeTruthy();
    expect(screen.queryByText("Auth session missing!")).toBeNull();
  });

  it("never surfaces a raw Supabase message for unmapped errors", async () => {
    mockUpdatePassword.mockRejectedValueOnce(new Error("Auth session missing?!"));
    renderWithProviders(<ResetPasswordForm />);
    await submitNewPassword();

    expect(await screen.findByText("Unable to update password.")).toBeTruthy();
    expect(screen.queryByText("Auth session missing?!")).toBeNull();
  });
});

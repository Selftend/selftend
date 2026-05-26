import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { VerifyEmailForm } from "./verify-email-form";
import { resendVerificationEmail } from "@/src/features/auth/api";
import { renderWithProviders } from "@/test/render-with-providers";

const mockReplace = jest.fn();
let mockParams: { email?: string } = { email: "person@example.com" };
let mockSessionState: {
  session: { user: { email_confirmed_at: string | null; id: string } } | null;
  user: { email: string | null; email_confirmed_at: string | null; id: string } | null;
} = { session: null, user: null };
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();

jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
  useLocalSearchParams: () => mockParams,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => mockSessionState,
}));

jest.mock("@/src/features/auth/api", () => ({
  resendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
    },
  },
}));

const mockResend = resendVerificationEmail as jest.MockedFunction<typeof resendVerificationEmail>;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { email: "person@example.com" };
  mockSessionState = { session: null, user: null };
  mockGetSession.mockResolvedValue({ data: { session: null } });
  mockRefreshSession.mockResolvedValue({ data: { session: null } });
});

describe("VerifyEmailForm", () => {
  it("shows the email the link was sent to", () => {
    renderWithProviders(<VerifyEmailForm />);
    expect(screen.getByText(/person@example.com/)).toBeTruthy();
  });

  it("resends the verification email and confirms it was sent", async () => {
    renderWithProviders(<VerifyEmailForm />);
    fireEvent.press(screen.getByText("Resend verification email"));
    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith("person@example.com");
    });
    expect(await screen.findByText("Verification email resent. Check your inbox.")).toBeTruthy();
  });

  it("returns to sign in when 'Back to sign in' is pressed", () => {
    renderWithProviders(<VerifyEmailForm />);
    fireEvent.press(screen.getByText("Back to sign in"));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("shows a rate-limit message and disables resend after a rate-limited attempt", async () => {
    mockResend.mockRejectedValueOnce(new Error("Email rate limit exceeded"));
    renderWithProviders(<VerifyEmailForm />);

    const resendButton = screen.getByText("Resend verification email");
    fireEvent.press(resendButton);

    expect(
      await screen.findByText("Too many attempts. Please wait before trying again."),
    ).toBeTruthy();

    fireEvent.press(resendButton);
    expect(mockResend).toHaveBeenCalledTimes(1);
  });

  it("advances into the app once a confirmed session is present", async () => {
    mockSessionState = {
      session: { user: { email_confirmed_at: "2026-05-26T00:00:00.000Z", id: "u1" } },
      user: {
        email: "person@example.com",
        email_confirmed_at: "2026-05-26T00:00:00.000Z",
        id: "u1",
      },
    };
    renderWithProviders(<VerifyEmailForm />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)");
    });
  });
});

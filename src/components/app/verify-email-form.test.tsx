import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { VerifyEmailForm } from "./verify-email-form";
import { resendVerificationEmail } from "@/src/features/auth/api";
import i18n from "@/src/i18n";
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

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

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
    expect(
      await screen.findByText(
        "Verification email sent. Check your inbox — if this address is already verified, just sign in.",
      ),
    ).toBeTruthy();
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
      expect(mockReplace).toHaveBeenCalledWith("/(app)");
    });
  });
});

describe("VerifyEmailForm resend feedback", () => {
  // The rejection message intentionally avoids the words "rate" and the digits "429" -
  // those substrings are what the real (unmocked) useAuthThrottle hook used elsewhere in
  // this file scans for to trigger its own client-side cooldown message
  // ("Too many attempts..."), which would otherwise mask the server-driven message this
  // test asserts on. The text below is the actual GoTrue v2.188.1 rate-limit message
  // observed locally (see task-4-report.md), so this is also the more realistic fixture.
  it("shows a wait message when the resend is rate limited", async () => {
    mockResend.mockRejectedValueOnce(
      Object.assign(
        new Error("For security purposes, you can only request this after 0 seconds."),
        { status: 429, code: "over_email_send_rate_limit" },
      ),
    );
    renderWithProviders(<VerifyEmailForm />);
    fireEvent.press(screen.getByText("Resend verification email"));
    expect(
      await screen.findByText("Please wait a minute before requesting another email."),
    ).toBeTruthy();
  });

  it("tells an already-confirmed user to sign in", async () => {
    mockResend.mockRejectedValueOnce(
      Object.assign(new Error("Email address already confirmed"), { status: 400 }),
    );
    renderWithProviders(<VerifyEmailForm />);
    fireEvent.press(screen.getByText("Resend verification email"));
    expect(await screen.findByText("Your email is already verified. Try signing in.")).toBeTruthy();
  });

  it("keeps the generic error for unknown failures", async () => {
    mockResend.mockRejectedValueOnce(new Error("network down"));
    renderWithProviders(<VerifyEmailForm />);
    fireEvent.press(screen.getByText("Resend verification email"));
    expect(await screen.findByText("Unable to resend verification email.")).toBeTruthy();
  });

  it("survives a non-object rejection and still shows the generic error", async () => {
    mockResend.mockImplementationOnce(() => Promise.reject(null));
    renderWithProviders(<VerifyEmailForm />);
    fireEvent.press(screen.getByText("Resend verification email"));
    expect(await screen.findByText("Unable to resend verification email.")).toBeTruthy();
  });
});

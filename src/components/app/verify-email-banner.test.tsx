import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { VerifyEmailBanner } from "./verify-email-banner";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import {
  EMAIL_RATE_LIMITED_ERROR,
  INVALID_VERIFICATION_CODE_ERROR,
  sendVerificationCode,
  verifyEmailCode,
} from "@/src/features/auth/api";
import { renderWithProviders } from "@/test/render-with-providers";

let mockUser: {
  id: string;
  email: string | null;
  app_metadata?: { provider?: string };
  identities?: { provider: string }[];
} | null = null;

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: mockUser }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/auth/api", () => ({
  ...jest.requireActual("@/src/features/auth/api"),
  sendVerificationCode: jest.fn(),
  verifyEmailCode: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;
const mockSendVerificationCode = sendVerificationCode as jest.MockedFunction<
  typeof sendVerificationCode
>;
const mockVerifyEmailCode = verifyEmailCode as jest.MockedFunction<typeof verifyEmailCode>;

describe("VerifyEmailBanner", () => {
  const mutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: "user-1",
      email: "person@example.com",
      app_metadata: { provider: "email" },
    };
    mutateAsync.mockResolvedValue({ ...defaultUserPreferences, emailVerified: true });
    mockUseUpdateUserPreferences.mockReturnValue({
      isPending: false,
      mutate: jest.fn(),
      mutateAsync,
    } as unknown as ReturnType<typeof useUpdateUserPreferences>);
    mockUseUserPreferences.mockReturnValue({
      data: { ...defaultUserPreferences, emailVerified: false },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
    mockSendVerificationCode.mockResolvedValue(undefined);
    mockVerifyEmailCode.mockResolvedValue(undefined);
  });

  it("shows the prompt for an unverified email-provider user", () => {
    renderWithProviders(<VerifyEmailBanner />);
    expect(screen.getByText("Verify your email to secure your account.")).toBeTruthy();
    expect(screen.getByText("Send code")).toBeTruthy();
  });

  it("renders nothing once the flag is set", () => {
    mockUseUserPreferences.mockReturnValue({
      data: { ...defaultUserPreferences, emailVerified: true },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<VerifyEmailBanner />);
    expect(screen.queryByText("Verify your email to secure your account.")).toBeNull();
  });

  it("renders nothing for an OAuth user, whose provider vouched for the mailbox", () => {
    mockUser = {
      id: "user-1",
      email: "person@example.com",
      app_metadata: { provider: "google" },
      identities: [{ provider: "google" }],
    };

    renderWithProviders(<VerifyEmailBanner />);
    expect(screen.queryByText("Verify your email to secure your account.")).toBeNull();
  });

  it("shows the prompt for a converted guest, whose provider claim never arrives (#1443)", () => {
    // Observed against GoTrue: converting a guest via updateUser attaches an
    // "email" identity but leaves app_metadata {} - the provider check alone
    // would silently exempt every converted account from verification.
    mockUser = {
      id: "user-1",
      email: "person@example.com",
      app_metadata: {},
      identities: [{ provider: "email" }],
    };

    renderWithProviders(<VerifyEmailBanner />);
    expect(screen.getByText("Verify your email to secure your account.")).toBeTruthy();
  });

  it("renders nothing while preferences have not loaded, so it cannot flash", () => {
    // A slow fetch means the verified state is UNKNOWN - showing the banner
    // would flash it at users who verified long ago.
    mockUseUserPreferences.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<VerifyEmailBanner />);
    expect(screen.queryByText("Verify your email to secure your account.")).toBeNull();
  });

  it("sends a code and swaps to the code-entry half", async () => {
    renderWithProviders(<VerifyEmailBanner />);

    await act(async () => fireEvent.press(screen.getByText("Send code")));

    expect(mockSendVerificationCode).toHaveBeenCalledWith("person@example.com");
    await waitFor(() =>
      expect(screen.getByText("We emailed you a verification code.")).toBeTruthy(),
    );
    expect(screen.getByLabelText("Verification code")).toBeTruthy();
  });

  it("verifies the code and stamps the preference flag", async () => {
    renderWithProviders(<VerifyEmailBanner />);
    await act(async () => fireEvent.press(screen.getByText("Send code")));

    fireEvent.changeText(screen.getByLabelText("Verification code"), "123456");
    await act(async () => fireEvent.press(screen.getByText("Verify")));

    expect(mockVerifyEmailCode).toHaveBeenCalledWith("person@example.com", "123456");
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ emailVerified: true }));
  });

  it("accepts a code longer than six digits, which the backend may issue", async () => {
    // The bug this guards: the input's maxLength was hardcoded to 6 while the
    // hosted project issued 8-digit codes, so every code was truncated to its
    // first six digits and verification failed silently. changeText bypasses
    // maxLength (it is native behaviour, not JS), so asserting on the submitted
    // value alone would not catch a regression - the prop has to be checked too.
    renderWithProviders(<VerifyEmailBanner />);
    await act(async () => fireEvent.press(screen.getByText("Send code")));

    const input = screen.getByLabelText("Verification code");
    expect(input.props.maxLength).toBeGreaterThanOrEqual(8);

    fireEvent.changeText(input, "12345678");
    await act(async () => fireEvent.press(screen.getByText("Verify")));

    expect(mockVerifyEmailCode).toHaveBeenCalledWith("person@example.com", "12345678");
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ emailVerified: true }));
  });

  it("surfaces an error when the flag write silently no-ops (#504)", async () => {
    // A database that predates the email_verified migration: the write's
    // missing-column retry drops the flag, the mutation resolves, and the row
    // comes back with emailVerified still false. The banner must say
    // something rather than nag silently while every code entry "works".
    mutateAsync.mockResolvedValue({ ...defaultUserPreferences, emailVerified: false });

    renderWithProviders(<VerifyEmailBanner />);
    await act(async () => fireEvent.press(screen.getByText("Send code")));
    fireEvent.changeText(screen.getByLabelText("Verification code"), "123456");
    await act(async () => fireEvent.press(screen.getByText("Verify")));

    await waitFor(() =>
      expect(screen.getByText("Couldn't verify the code. Please try again.")).toBeTruthy(),
    );
  });

  it("shows the invalid-code copy for a wrong or expired code", async () => {
    mockVerifyEmailCode.mockRejectedValue(new Error(INVALID_VERIFICATION_CODE_ERROR));

    renderWithProviders(<VerifyEmailBanner />);
    await act(async () => fireEvent.press(screen.getByText("Send code")));
    fireEvent.changeText(screen.getByLabelText("Verification code"), "000000");
    await act(async () => fireEvent.press(screen.getByText("Verify")));

    await waitFor(() =>
      expect(
        screen.getByText(
          "That code didn't match or has expired. Check the newest email or resend.",
        ),
      ).toBeTruthy(),
    );
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("surfaces the rate-limit copy without leaving the prompt", async () => {
    mockSendVerificationCode.mockRejectedValue(new Error(EMAIL_RATE_LIMITED_ERROR));

    renderWithProviders(<VerifyEmailBanner />);
    await act(async () => fireEvent.press(screen.getByText("Send code")));

    await waitFor(() =>
      expect(
        screen.getByText("Too many emails requested. Please wait a bit before trying again."),
      ).toBeTruthy(),
    );
    // The send half stays up - nothing was sent, so no code can be entered.
    expect(screen.queryByLabelText("Verification code")).toBeNull();
  });
});

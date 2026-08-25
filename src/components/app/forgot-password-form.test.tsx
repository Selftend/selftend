import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { ForgotPasswordForm } from "./forgot-password-form";
import { EMAIL_RATE_LIMITED_ERROR, sendPasswordResetEmail } from "@/src/features/auth/api";
import i18n from "@/src/i18n";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  usePathname: () => "/reset-password",
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
  /**
   * ⚠️ The route-group trap, and the reason this assertion is worth its lines.
   *
   * The href here is written `/(auth)/sign-in`, the form every nav href in this
   * repo takes, and `usePathname` never reports a route group. Recording that
   * string verbatim would set `forPathname` to something no screen can ever
   * match, and nothing would break: the sign-in screen would just quietly show a
   * plain Up, which is the invisible failure O3 chose opt-out recording to
   * avoid, reintroduced one call site at a time. `targetPathname` inside the
   * helper strips the group, so what lands in the store is `/sign-in`.
   *
   * ⚠️ `/reset-password` is the route that renders THIS form - the route and
   * form names are crossed in this group, and `/update-password` renders
   * `ResetPasswordForm`.
   */
  it("records a group-free target, so the sign-in screen can match it", () => {
    useNavigationOriginStore.setState({ pending: null });
    renderWithProviders(<ForgotPasswordForm />);

    fireEvent.press(screen.getByText("Back to sign in"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/reset-password",
      forPathname: "/sign-in",
    });
  });
});

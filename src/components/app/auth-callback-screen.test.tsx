import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as Linking from "expo-linking";

import AuthCallbackScreen from "./auth-callback-screen";
import { completeAuthRedirect } from "@/src/features/auth/callback";
import { AuthCallbackError } from "@/src/features/auth/callback-errors";
import { renderWithProviders } from "@/test/render-with-providers";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

jest.mock("expo-linking", () => ({
  useLinkingURL: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ hasSupabaseConfig: true }),
}));

// parseAuthCallbackUrl stays REAL (the screen uses it to route "Request a new
// link" by the link's type param); only the network-touching completion is mocked.
jest.mock("@/src/features/auth/callback", () => ({
  ...jest.requireActual("@/src/features/auth/callback"),
  completeAuthRedirect: jest.fn(),
}));

const mockUseLinkingURL = Linking.useLinkingURL as jest.MockedFunction<
  typeof Linking.useLinkingURL
>;
const mockCompleteAuthRedirect = completeAuthRedirect as jest.MockedFunction<
  typeof completeAuthRedirect
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AuthCallbackScreen (email verified)", () => {
  beforeEach(() => {
    mockUseLinkingURL.mockReturnValue(
      "http://localhost:8081/auth-callback?token_hash=th&type=signup",
    );
    mockCompleteAuthRedirect.mockResolvedValue("email-verified");
  });

  it("does not consume the one-time token until a human presses the button", async () => {
    // Mail security scanners (Safe Links etc.) open email links in a headless
    // browser that runs page JS - anything consumed on load is spent before the
    // human clicks. The token must only be spent on an explicit press.
    renderWithProviders(<AuthCallbackScreen />);

    expect(await screen.findByText("Confirm your email")).toBeTruthy();
    expect(mockCompleteAuthRedirect).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Confirm my email"));
    await waitFor(() => expect(mockCompleteAuthRedirect).toHaveBeenCalledTimes(1));
  });

  it("shows the verification-complete card without auto-navigating", async () => {
    renderWithProviders(<AuthCallbackScreen />);

    fireEvent.press(await screen.findByText("Confirm my email"));
    expect(await screen.findByText("You're verified")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not retry a verified link when URL scrubbing publishes the clean callback URL", async () => {
    const view = renderWithProviders(<AuthCallbackScreen />);
    fireEvent.press(await screen.findByText("Confirm my email"));
    expect(await screen.findByText("You're verified")).toBeTruthy();

    mockUseLinkingURL.mockReturnValue("http://localhost:8081/auth-callback");
    view.rerender(<AuthCallbackScreen />);

    await waitFor(() => expect(mockCompleteAuthRedirect).toHaveBeenCalledTimes(1));
    expect(screen.getByText("You're verified")).toBeTruthy();
    expect(screen.queryByText("Authentication link problem")).toBeNull();
  });

  it("enters the app when 'Continue to the app' is pressed", async () => {
    renderWithProviders(<AuthCallbackScreen />);

    fireEvent.press(await screen.findByText("Confirm my email"));
    fireEvent.press(await screen.findByText("Continue to the app"));
    expect(mockReplace).toHaveBeenCalledWith("/(app)");
  });
});

describe("AuthCallbackScreen - error mapping", () => {
  it("never renders raw error text - only the mapped calm copy", async () => {
    // Anyone can hand a victim a link carrying arbitrary error_description text,
    // and GoTrue's own messages read as jargon. Whatever the completion throws,
    // the screen must render OUR copy, never the raw string.
    const hostile = "Your account was locked, call +1-555-0100 now";
    mockUseLinkingURL.mockReturnValue(
      `selftend://auth-callback?error_code=strange_code&error_description=${encodeURIComponent(hostile)}`,
    );
    mockCompleteAuthRedirect.mockRejectedValue(
      Object.assign(new AuthCallbackError("generic"), { message: hostile }),
    );

    renderWithProviders(<AuthCallbackScreen />);

    expect(
      await screen.findByText("We couldn't finish signing you in with this link."),
    ).toBeTruthy();
    expect(screen.queryByText(hostile, { exact: false })).toBeNull();
    expect(screen.queryByText(/555-0100/)).toBeNull();
    expect(screen.getByText("Request a new link")).toBeTruthy();
  });

  it("shows generic copy even for unclassified throws (no raw message leak)", async () => {
    mockUseLinkingURL.mockReturnValue("selftend://auth-callback?code=abc");
    mockCompleteAuthRedirect.mockRejectedValue(new Error("ECONNREFUSED 127.0.0.1:54321"));

    renderWithProviders(<AuthCallbackScreen />);

    expect(
      await screen.findByText("We couldn't finish signing you in with this link."),
    ).toBeTruthy();
    expect(screen.queryByText(/ECONNREFUSED/)).toBeNull();
  });

  it("maps an expired recovery link to calm copy and routes 'Request a new link' to the reset form", async () => {
    mockUseLinkingURL.mockReturnValue("selftend://auth-callback?token_hash=spent&type=recovery");
    mockCompleteAuthRedirect.mockRejectedValue(new AuthCallbackError("expired_or_used"));

    renderWithProviders(<AuthCallbackScreen />);

    fireEvent.press(await screen.findByText("Choose a new password"));
    expect(await screen.findByText(/This link has expired or was already used/)).toBeTruthy();

    fireEvent.press(screen.getByText("Request a new link"));
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/reset-password");

    // Secondary escape hatch still available when the primary goes elsewhere.
    expect(screen.getByText("Back to sign in")).toBeTruthy();
  });

  it("routes 'Request a new link' to verify-email for a failed signup link", async () => {
    mockUseLinkingURL.mockReturnValue("selftend://auth-callback?token_hash=spent&type=signup");
    mockCompleteAuthRedirect.mockRejectedValue(new AuthCallbackError("expired_or_used"));

    renderWithProviders(<AuthCallbackScreen />);

    fireEvent.press(await screen.findByText("Confirm my email"));
    expect(await screen.findByText(/This link has expired or was already used/)).toBeTruthy();

    fireEvent.press(screen.getByText("Request a new link"));
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/verify-email");
  });

  it("maps a cross-device failure to the 'request a new link on this device' copy", async () => {
    mockUseLinkingURL.mockReturnValue("selftend://auth-callback?code=abc&type=recovery");
    mockCompleteAuthRedirect.mockRejectedValue(new AuthCallbackError("cross_device"));

    renderWithProviders(<AuthCallbackScreen />);

    expect(
      await screen.findByText(
        "This link couldn't be completed here. Request a new link below and open it on this device.",
      ),
    ).toBeTruthy();
  });
});

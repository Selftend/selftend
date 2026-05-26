import { fireEvent, screen } from "@testing-library/react-native";

import AuthCallbackScreen from "./auth-callback-screen";
import { renderWithProviders } from "@/test/render-with-providers";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

jest.mock("expo-linking", () => ({
  useLinkingURL: () =>
    "http://localhost:8081/auth-callback#access_token=a&refresh_token=r&type=signup",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ hasSupabaseConfig: true }),
}));

jest.mock("@/src/features/auth/callback", () => ({
  completeAuthRedirect: jest.fn().mockResolvedValue("email-verified"),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AuthCallbackScreen (email verified)", () => {
  it("shows the verification-complete card without auto-navigating", async () => {
    renderWithProviders(<AuthCallbackScreen />);

    expect(await screen.findByText("You're verified")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("enters the app when 'Continue to the app' is pressed", async () => {
    renderWithProviders(<AuthCallbackScreen />);

    fireEvent.press(await screen.findByText("Continue to the app"));
    expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)");
  });
});

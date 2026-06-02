import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { AuthLandingBlock } from "./auth-landing-block";
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

const mockPush = router.push as jest.MockedFunction<typeof router.push>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AuthLandingBlock", () => {
  it("shows the self-help disclaimer so the not-medical boundary is visible without an account", () => {
    renderWithProviders(<AuthLandingBlock />);

    expect(
      screen.getByText(
        "Selftend is for guided self-help when there is time and safety to reflect. It is not emergency support and is not monitored by crisis responders.",
      ),
    ).toBeTruthy();
  });

  it("links to crisis guidance from the public landing", () => {
    renderWithProviders(<AuthLandingBlock />);

    fireEvent.press(screen.getByText("Open crisis guidance"));

    expect(mockPush).toHaveBeenCalledWith("/crisis");
  });

  it("links to the terms, privacy, and cookie policies from the public landing", () => {
    renderWithProviders(<AuthLandingBlock />);

    fireEvent.press(screen.getByText("Terms of service"));
    fireEvent.press(screen.getByText("Privacy policy"));
    fireEvent.press(screen.getByText("Cookie policy"));

    expect(mockPush).toHaveBeenCalledWith("/terms");
    expect(mockPush).toHaveBeenCalledWith("/privacy");
    expect(mockPush).toHaveBeenCalledWith("/cookies");
  });
});

import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import LandingScreen from "./landing-screen";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

const mockPush = router.push as jest.MockedFunction<typeof router.push>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("LandingScreen", () => {
  it("renders the hero headline as the single top-level heading", () => {
    renderWithProviders(<LandingScreen />);

    expect(
      screen.getByRole("heading", { name: "Guided self-help, private by design." }),
    ).toBeTruthy();
  });

  it("shows the hero support line", () => {
    renderWithProviders(<LandingScreen />);

    expect(
      screen.getByText(
        "Free, open-source tools for working with thoughts, moods, and habits — no ads, no subscriptions, for adults 18+.",
      ),
    ).toBeTruthy();
  });

  it("navigates to sign-up when Get started is pressed", () => {
    renderWithProviders(<LandingScreen />);

    fireEvent.press(screen.getByText("Get started"));

    expect(mockPush).toHaveBeenCalledWith("/(auth)/sign-up");
  });

  it("navigates to sign-in when Sign in is pressed", () => {
    renderWithProviders(<LandingScreen />);

    fireEvent.press(screen.getByText("Sign in"));

    expect(mockPush).toHaveBeenCalledWith("/(auth)/sign-in");
  });
});

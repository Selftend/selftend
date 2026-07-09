import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { LandingFooter } from "./landing-footer";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/src/lib/linking", () => ({
  openExternalUrl: jest.fn(),
}));

jest.mock("@/src/lib/env", () => ({
  appEnv: {
    discordUrl: "https://discord.gg/R96NRx6AH3",
  },
}));

const mockPush = router.push as jest.MockedFunction<typeof router.push>;
const mockOpen = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;

beforeEach(() => {
  appEnv.discordUrl = "https://discord.gg/R96NRx6AH3";
  jest.clearAllMocks();
});

describe("LandingFooter", () => {
  it("shows the full safety disclaimer", () => {
    renderWithProviders(<LandingFooter />);

    expect(
      screen.getByText(
        "Selftend is for guided self-help when there is time and safety to reflect. It is not emergency support and is not monitored by crisis responders.",
      ),
    ).toBeTruthy();
  });

  it("links to crisis guidance", () => {
    renderWithProviders(<LandingFooter />);

    fireEvent.press(screen.getByText("Open crisis guidance"));

    expect(mockPush).toHaveBeenCalledWith("/crisis");
  });

  it("links to the terms, privacy, and cookie policies", () => {
    renderWithProviders(<LandingFooter />);

    fireEvent.press(screen.getByText("Terms of service"));
    fireEvent.press(screen.getByText("Privacy policy"));
    fireEvent.press(screen.getByText("Cookie policy"));

    expect(mockPush).toHaveBeenCalledWith("/terms");
    expect(mockPush).toHaveBeenCalledWith("/privacy");
    expect(mockPush).toHaveBeenCalledWith("/cookies");
  });

  it("links to the FAQ", () => {
    renderWithProviders(<LandingFooter />);

    fireEvent.press(screen.getByText("FAQ"));

    expect(mockPush).toHaveBeenCalledWith("/faq");
  });

  it("opens Discord externally when appEnv.discordUrl is set", () => {
    renderWithProviders(<LandingFooter />);

    fireEvent.press(screen.getByText("Join our Discord"));

    expect(mockOpen).toHaveBeenCalledWith("https://discord.gg/R96NRx6AH3");
  });

  it("hides the Discord link when appEnv.discordUrl is empty", () => {
    appEnv.discordUrl = "";

    renderWithProviders(<LandingFooter />);

    expect(screen.queryByText("Join our Discord")).toBeNull();
  });
});

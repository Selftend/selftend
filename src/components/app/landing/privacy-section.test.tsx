import { fireEvent, screen } from "@testing-library/react-native";

import { PrivacySection } from "./privacy-section";
import { openExternalUrl } from "@/src/lib/linking";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/lib/linking", () => ({
  openExternalUrl: jest.fn(),
}));

jest.mock("@/src/lib/env", () => ({
  appEnv: {
    githubRepoUrl: "https://github.com/Selftend/selftend",
  },
}));

const mockOpen = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PrivacySection", () => {
  it("renders the privacy heading and body", () => {
    renderWithProviders(<PrivacySection />);

    expect(screen.getByRole("heading", { name: "Yours, and private" })).toBeTruthy();
    expect(screen.getByText(/Your entries are encrypted at the field level/)).toBeTruthy();
  });

  it("renders a control to view the source on GitHub", () => {
    renderWithProviders(<PrivacySection />);

    expect(screen.getByText("View the source on GitHub")).toBeTruthy();
  });

  it("opens the GitHub repo when the view-source control is pressed", () => {
    renderWithProviders(<PrivacySection />);

    fireEvent.press(screen.getByText("View the source on GitHub"));

    expect(mockOpen).toHaveBeenCalledWith("https://github.com/Selftend/selftend");
  });
});

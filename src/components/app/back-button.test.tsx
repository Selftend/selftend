import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { BackButton } from "@/src/components/app/back-button";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
  },
  usePathname: () => "/tools/mood-tracker/new",
}));

const mockRouter = jest.mocked(router);

describe("BackButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.canGoBack.mockReturnValue(false);
  });

  it("uses hierarchical parent navigation by default", () => {
    renderWithProviders(<BackButton />);

    fireEvent.press(screen.getByLabelText("Back"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/mood-tracker");
  });

  it("uses browser history in history mode when available", () => {
    mockRouter.canGoBack.mockReturnValue(true);

    renderWithProviders(<BackButton fallbackHref="/tools/mood-tracker" mode="history" />);

    fireEvent.press(screen.getByLabelText("Back"));

    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("uses fallback navigation in history mode when history is unavailable", () => {
    renderWithProviders(<BackButton fallbackHref="/tools/mood-tracker" mode="history" />);

    fireEvent.press(screen.getByLabelText("Back"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/mood-tracker");
  });
});

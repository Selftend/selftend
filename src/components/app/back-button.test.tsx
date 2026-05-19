import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { BackButton } from "@/src/components/app/back-button";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  usePathname: () => "/tools/mood-tracker/new",
}));

const mockRouter = jest.mocked(router);

describe("BackButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.canGoBack.mockReturnValue(true);
  });

  it("calls router.back on press", () => {
    renderWithProviders(<BackButton />);

    fireEvent.press(screen.getByLabelText("Back"));

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("renders nothing when there is no history", () => {
    mockRouter.canGoBack.mockReturnValue(false);

    renderWithProviders(<BackButton />);

    expect(screen.queryByLabelText("Back")).toBeNull();
  });
});

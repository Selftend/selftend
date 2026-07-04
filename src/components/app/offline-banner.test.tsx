import { screen } from "@testing-library/react-native";

import { OfflineBanner } from "@/src/components/app/offline-banner";
import { useIsOnline } from "@/src/lib/online-manager";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/lib/online-manager", () => ({
  useIsOnline: jest.fn(),
}));

const mockUseIsOnline = useIsOnline as jest.Mock;

describe("OfflineBanner", () => {
  it("renders nothing while online", () => {
    mockUseIsOnline.mockReturnValue(true);

    renderWithProviders(<OfflineBanner />);

    expect(screen.queryByText("You're offline - changes can't be saved right now")).toBeNull();
  });

  it("shows the banner while offline", () => {
    mockUseIsOnline.mockReturnValue(false);

    renderWithProviders(<OfflineBanner />);

    expect(screen.getByText("You're offline - changes can't be saved right now")).toBeTruthy();
  });
});

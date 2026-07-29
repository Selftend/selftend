import { fireEvent, screen } from "@testing-library/react-native";

import { UpdateBanner } from "./update-banner";
import { useUpdateAvailability } from "@/src/lib/use-update-availability";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/lib/use-update-availability", () => ({
  useUpdateAvailability: jest.fn(),
}));

const mockUseUpdateAvailability = useUpdateAvailability as jest.MockedFunction<
  typeof useUpdateAvailability
>;

describe("UpdateBanner", () => {
  const act = jest.fn();
  const dismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when no update is available", () => {
    mockUseUpdateAvailability.mockReturnValue({ available: false, version: null, act, dismiss });
    renderWithProviders(<UpdateBanner />);
    expect(screen.queryByText("A newer version of Selftend is available.")).toBeNull();
  });

  it("offers quietly when an update is available, with working actions", () => {
    mockUseUpdateAvailability.mockReturnValue({ available: true, version: "9.9.9", act, dismiss });
    renderWithProviders(<UpdateBanner />);

    expect(screen.getByText("A newer version of Selftend is available.")).toBeTruthy();

    // jest-expo runs the default platform; either action label is the same
    // wired button - what matters is that pressing it calls act().
    fireEvent.press(screen.getByText(/Refresh|Open Google Play/));
    expect(act).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText("Dismiss"));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});

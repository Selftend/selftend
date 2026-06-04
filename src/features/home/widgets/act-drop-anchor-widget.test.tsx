import { fireEvent, screen } from "@testing-library/react-native";

import { router } from "expo-router";

import { ActDropAnchorWidget } from "@/src/features/home/widgets/act-drop-anchor-widget";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

describe("ActDropAnchorWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the ACT module badge", () => {
    renderWithProviders(<ActDropAnchorWidget userId="user-1" />);
    expect(screen.getByText("ACT")).toBeTruthy();
  });

  it("deep-links to the drop-anchor tool from the CTA", () => {
    renderWithProviders(<ActDropAnchorWidget userId="user-1" />);
    fireEvent.press(screen.getByText("Steady me"));
    expect(router.push as jest.Mock).toHaveBeenCalledWith("/modules/act/connection/drop-anchor");
  });
});

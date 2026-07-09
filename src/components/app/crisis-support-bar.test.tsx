import { fireEvent, screen } from "@testing-library/react-native";

import { router } from "expo-router";

import { CrisisSupportBar } from "./crisis-support-bar";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

describe("CrisisSupportBar", () => {
  it("renders the slim crisis label", () => {
    renderWithProviders(<CrisisSupportBar />);

    expect(screen.getByText("Not for emergencies · Crisis resources")).toBeTruthy();
  });

  it("is a single pressable that navigates to the crisis page on press", () => {
    renderWithProviders(<CrisisSupportBar />);

    const pressables = screen.getAllByRole("button");
    expect(pressables).toHaveLength(1);

    fireEvent.press(pressables[0]);

    expect(router.push as jest.Mock).toHaveBeenCalledWith("/crisis");
  });
});

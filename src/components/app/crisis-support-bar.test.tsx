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

  /**
   * #887 (decided on #882/#868): a hairline row, not a filled box. The quiet
   * redesign left the filled container the loudest element on screens that gave
   * up their cards — the affordance stays, the box goes.
   */
  it("draws hairline rules, never a filled rounded container", () => {
    renderWithProviders(<CrisisSupportBar />);

    const tokens = String(screen.getByRole("button").props.className).split(/\s+/);
    expect(tokens).toContain("border-y");
    expect(tokens).not.toContain("bg-muted/40");
    expect(tokens.some((token) => token.startsWith("rounded"))).toBe(false);
  });
});

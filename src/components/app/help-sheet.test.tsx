import { fireEvent, screen } from "@testing-library/react-native";

import { HelpSheet } from "./help-sheet";
import { renderWithProviders } from "@/test/render-with-providers";

describe("HelpSheet", () => {
  it("renders the title and all three sections for a key", () => {
    renderWithProviders(<HelpSheet helpKey="beliefs" visible onDismiss={jest.fn()} />);
    expect(screen.getByText("Core beliefs")).toBeTruthy();
    expect(
      screen.getByText("Deep, long-held rules about yourself, others, or the world."),
    ).toBeTruthy();
    expect(screen.getByText("What it is")).toBeTruthy();
    expect(screen.getByText("How it works")).toBeTruthy();
    expect(screen.getByText("Why it helps")).toBeTruthy();
  });

  it("calls onDismiss when the close control is pressed", () => {
    const onDismiss = jest.fn();
    renderWithProviders(<HelpSheet helpKey="beliefs" visible onDismiss={onDismiss} />);
    fireEvent.press(screen.getByLabelText("Close"));
    expect(onDismiss).toHaveBeenCalled();
  });
});

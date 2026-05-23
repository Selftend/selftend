import { fireEvent, screen } from "@testing-library/react-native";

import { ProgramGraduation } from "./program-graduation";
import { renderWithProviders } from "@/test/render-with-providers";

const lines = ["5 thought records", "3 activities completed", "2 goals set", "1 beliefs examined"];

describe("ProgramGraduation", () => {
  it("shows the celebration and stats when not dismissed", () => {
    renderWithProviders(
      <ProgramGraduation
        lines={lines}
        dismissed={false}
        onDismiss={jest.fn()}
        onReplay={jest.fn()}
      />,
    );
    expect(screen.getByText("Program complete")).toBeTruthy();
    expect(screen.getByText("5 thought records")).toBeTruthy();
  });

  it("calls onDismiss when continue is pressed", () => {
    const onDismiss = jest.fn();
    renderWithProviders(
      <ProgramGraduation
        lines={lines}
        dismissed={false}
        onDismiss={onDismiss}
        onReplay={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText("Continue with my tools"));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("shows the compact replay row when dismissed", () => {
    const onReplay = jest.fn();
    renderWithProviders(
      <ProgramGraduation lines={lines} dismissed onDismiss={jest.fn()} onReplay={onReplay} />,
    );
    expect(screen.queryByText("5 thought records")).toBeNull();
    fireEvent.press(screen.getByText("Replay the program"));
    expect(onReplay).toHaveBeenCalled();
  });
});

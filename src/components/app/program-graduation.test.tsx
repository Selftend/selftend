import { fireEvent, screen } from "@testing-library/react-native";

import { ProgramGraduation } from "./program-graduation";
import { renderWithProviders } from "@/test/render-with-providers";

const stats = { thoughtRecords: 5, activitiesCompleted: 3, goalsSet: 2, beliefsExamined: 1 };

describe("ProgramGraduation", () => {
  it("shows the celebration and stats when not dismissed", () => {
    renderWithProviders(
      <ProgramGraduation
        stats={stats}
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
        stats={stats}
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
      <ProgramGraduation stats={stats} dismissed onDismiss={jest.fn()} onReplay={onReplay} />,
    );
    expect(screen.queryByText("5 thought records")).toBeNull();
    fireEvent.press(screen.getByText("Replay the program"));
    expect(onReplay).toHaveBeenCalled();
  });
});

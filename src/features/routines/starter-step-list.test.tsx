import { screen } from "@testing-library/react-native";

import { StarterStepList } from "@/src/features/routines/starter-step-list";
import { renderWithProviders } from "@/test/render-with-providers";

describe("StarterStepList", () => {
  it("renders one numbered row per step, in order, with the tool's routines label", () => {
    renderWithProviders(<StarterStepList steps={["mood", "gratitude", "breathing"]} />);

    const rows = screen.getAllByTestId("starter-step-row");
    expect(rows).toHaveLength(3);
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    // The labels come from the routines namespace's tools table, not a hardcoded name.
    expect(screen.getByText("Mood check-in")).toBeTruthy();
    expect(screen.getByText("Gratitude")).toBeTruthy();
    expect(screen.getByText("Breathing")).toBeTruthy();
    // Order is the caller's step order: the first row holds the first tool.
    expect(rows[0]).toHaveTextContent(/1.*Mood check-in/);
    expect(rows[2]).toHaveTextContent(/3.*Breathing/);
  });

  it("renders nothing for an empty list", () => {
    renderWithProviders(<StarterStepList steps={[]} />);
    expect(screen.queryAllByTestId("starter-step-row")).toHaveLength(0);
  });
});

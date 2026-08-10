import { screen } from "@testing-library/react-native";

import { SleepQualityMix } from "@/src/features/sleep/sleep-quality-mix";
import { renderWithProviders } from "@/test/render-with-providers";

describe("SleepQualityMix", () => {
  it("renders five labelled columns, counts and level words, in scale order", () => {
    renderWithProviders(<SleepQualityMix distribution={[2, 0, 3, 1, 0]} />);

    expect(screen.getByText("Very poor")).toBeTruthy();
    expect(screen.getByText("Poor")).toBeTruthy();
    expect(screen.getByText("Fair")).toBeTruthy();
    expect(screen.getByText("Good")).toBeTruthy();
    expect(screen.getByText("Excellent")).toBeTruthy();
    expect(screen.getAllByTestId("bar-chart-bar")).toHaveLength(5);
  });

  // Counts, never percentages, and never a separate swatch legend: the columns
  // label themselves.
  it("prints raw counts above each column, including the zeros", () => {
    renderWithProviders(<SleepQualityMix distribution={[2, 0, 3, 1, 0]} />);

    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  /**
   * The bug this replaced. Painted as `hueRampClass("ink", quality)` over a
   * `bg-muted/40` track, the five steps measured 1.23 / 1.55 / 2.11 / 3.08 /
   * 5.03 — three of them under 1.4.11's 3:1, on every palette in both schemes.
   * One fill for every level, and it is the accent `test/theme-contrast.test.ts`
   * already gates at 3:1 across all eight styles.
   */
  it("fills every non-zero column with the same accent, and never the ink ramp", () => {
    renderWithProviders(<SleepQualityMix distribution={[2, 0, 3, 1, 0]} />);

    const fills = screen.getAllByTestId("bar-chart-bar").map((bar) => String(bar.props.className));
    expect(fills[0]).toContain("bg-primary");
    expect(fills[2]).toContain("bg-primary");
    expect(fills[3]).toContain("bg-primary");
    // Absence is a hairline on the baseline, not a faint tint of the fill.
    expect(fills[1]).toContain("bg-border");
    expect(fills[4]).toContain("bg-border");
    for (const fill of fills) expect(fill).not.toMatch(/bg-ink/);
  });

  // Each column is one fact. Without this a screen reader meets the count and
  // the level word as two unrelated strings and has to pair them by position.
  it("announces each column as level plus count, pluralised", () => {
    renderWithProviders(<SleepQualityMix distribution={[2, 0, 3, 1, 0]} />);

    expect(screen.getByLabelText("Very poor: 2 nights")).toBeTruthy();
    expect(screen.getByLabelText("Poor: 0 nights")).toBeTruthy();
    expect(screen.getByLabelText("Good: 1 night")).toBeTruthy();
  });

  /**
   * `Много лошо` measures 60.7 at 10px against a 49.6dp column, so it wraps —
   * the only label in either shipped locale that does. Two lines are reserved on
   * all five columns so that one wrap cannot lift its neighbour's bar off the
   * shared baseline.
   */
  it("reserves two lines under every column so one wrapping label cannot skew the row", () => {
    renderWithProviders(<SleepQualityMix distribution={[2, 0, 3, 1, 0]} />);

    for (const word of ["Very poor", "Poor", "Fair", "Good", "Excellent"]) {
      expect(String(screen.getByText(word).props.className)).toContain("min-h-[26px]");
    }
  });

  /**
   * A fixed last-30-days window, unlike check-in's user-chosen range — so a user
   * whose nights all predate it gets the empty line rather than five hairlines
   * and five zeros, which would read as lost data.
   */
  it("says the window is empty rather than drawing five zeros", () => {
    renderWithProviders(<SleepQualityMix distribution={[0, 0, 0, 0, 0]} />);

    expect(screen.getByText("Log a few sleep entries to see this.")).toBeTruthy();
    expect(screen.queryAllByTestId("bar-chart-bar")).toHaveLength(0);
  });

  // A glance view: a quality level is not an entity, so there is nowhere to go.
  it("is not interactive", () => {
    renderWithProviders(<SleepQualityMix distribution={[2, 0, 3, 1, 0]} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

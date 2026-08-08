import { screen } from "@testing-library/react-native";

import { MoodDistributionChart } from "@/src/features/mood/mood-distribution";
import { getMoodDistribution } from "@/src/features/mood/summaries";
import { renderWithProviders } from "@/test/render-with-providers";

describe("getMoodDistribution", () => {
  it("counts each level, index 0 being score 1", () => {
    expect(
      getMoodDistribution([{ moodScore: 1 }, { moodScore: 3 }, { moodScore: 3 }, { moodScore: 5 }]),
    ).toEqual([1, 0, 2, 0, 1]);
  });

  it("returns five zeros for no points", () => {
    expect(getMoodDistribution([])).toEqual([0, 0, 0, 0, 0]);
    expect(getMoodDistribution(undefined)).toEqual([0, 0, 0, 0, 0]);
  });

  // Clamping would fold a bad row into a real level and inflate its count.
  it("ignores scores outside 1-5 rather than clamping them", () => {
    expect(getMoodDistribution([{ moodScore: 0 }, { moodScore: 6 }, { moodScore: 2.5 }])).toEqual([
      0, 0, 0, 0, 0,
    ]);
  });
});

describe("MoodDistributionChart", () => {
  it("renders five labelled columns, counts and level words, in scale order", () => {
    renderWithProviders(<MoodDistributionChart counts={[2, 0, 3, 1, 0]} />);

    // Level words come from checkin.scaleLabels, left to right 1 -> 5.
    expect(screen.getByText("Awful")).toBeTruthy();
    expect(screen.getByText("Low")).toBeTruthy();
    expect(screen.getByText("OK")).toBeTruthy();
    expect(screen.getByText("Good")).toBeTruthy();
    expect(screen.getByText("Great")).toBeTruthy();
    expect(screen.getAllByTestId("bar-chart-bar")).toHaveLength(5);
  });

  // Counts, never percentages: "33%" from three check-ins claims a precision the
  // data has not earned.
  it("prints raw counts above each column, including the zeros", () => {
    renderWithProviders(<MoodDistributionChart counts={[2, 0, 3, 1, 0]} />);

    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    // A level with no check-ins keeps its 0 rather than vanishing.
    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  /**
   * #691 forbids hue that encodes identity, and `RAMP_ALPHAS[0]` is 0.16 — a
   * ramp would render level 1 at ~1.26, making the tallest bar of someone's
   * worst month the faintest thing on screen. Every non-zero column takes the
   * same fill, which is the token the trend line above resolves to.
   */
  it("fills every non-zero column with the same accent, and never the ramp", () => {
    renderWithProviders(<MoodDistributionChart counts={[2, 0, 3, 1, 0]} />);

    const fills = screen.getAllByTestId("bar-chart-bar").map((bar) => String(bar.props.className));
    expect(fills[0]).toContain("bg-primary");
    expect(fills[2]).toContain("bg-primary");
    expect(fills[3]).toContain("bg-primary");
    // Absence is a hairline on the baseline, not a faint tint of the fill.
    expect(fills[1]).toContain("bg-border");
    expect(fills[4]).toContain("bg-border");
    for (const fill of fills) expect(fill).not.toMatch(/bg-be/);
  });

  // Each column is one fact. Without this a screen reader meets the count and
  // the level word as two unrelated strings and has to pair them by position.
  it("announces each column as level plus count, pluralised", () => {
    renderWithProviders(<MoodDistributionChart counts={[2, 0, 3, 1, 0]} />);

    expect(screen.getByLabelText("Awful: 2 check-ins")).toBeTruthy();
    expect(screen.getByLabelText("Low: 0 check-ins")).toBeTruthy();
    expect(screen.getByLabelText("Good: 1 check-in")).toBeTruthy();
  });

  /**
   * The case the stacked pill could not survive: at one entry a pill is a solid
   * single-colour bar reading "100% Okay" — a confident claim about a
   * distribution from a sample of one. Four visible zeros are part of the
   * picture here, so the chart cannot make that claim.
   */
  it("reads as one check-in rather than 100% at a single entry", () => {
    renderWithProviders(<MoodDistributionChart counts={[0, 0, 1, 0, 0]} />);

    expect(screen.getByLabelText("OK: 1 check-in")).toBeTruthy();
    expect(screen.getAllByText("0")).toHaveLength(4);
    expect(screen.queryByText("100%")).toBeNull();
  });

  // A glance view, like the mood map: a level is not an entity and #696
  // declined history filters, so there is nowhere to navigate to.
  it("is not interactive", () => {
    renderWithProviders(<MoodDistributionChart counts={[2, 0, 3, 1, 0]} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

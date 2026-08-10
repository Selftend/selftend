import { screen } from "@testing-library/react-native";

import { SleepWeekdayChart } from "@/src/features/sleep/sleep-weekday-chart";
import { renderWithProviders } from "@/test/render-with-providers";

describe("SleepWeekdayChart", () => {
  it("keeps the existing empty state until any weekday has data", () => {
    renderWithProviders(<SleepWeekdayChart averages={Array(7).fill(null)} />);

    expect(screen.getByText("Log a few sleep entries to see this.")).toBeTruthy();
    expect(screen.queryAllByTestId("bar-chart-bar")).toHaveLength(0);
  });

  it("prints every available average and a dash for a missing weekday", () => {
    renderWithProviders(<SleepWeekdayChart averages={[360, null, 450, 480, 420, 390, 510]} />);

    expect(screen.getByText("6h")).toBeTruthy();
    expect(screen.getByText("7.5h")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("uses one accessible neutral fill with no best-day highlight", () => {
    renderWithProviders(<SleepWeekdayChart averages={[360, 420, 420, 480, 420, 390, 510]} />);

    for (const bar of screen.getAllByTestId("bar-chart-bar")) {
      expect(bar.props.className).toContain("bg-muted-foreground/80");
      expect(bar.props.className).not.toContain("bg-primary");
    }
  });

  it("announces a complete fact for populated and missing weekdays", () => {
    renderWithProviders(<SleepWeekdayChart averages={[360, null, 450, 480, 420, 390, 510]} />);

    expect(screen.getByLabelText("Monday: 6h average sleep duration")).toBeTruthy();
    expect(screen.getByLabelText("Tuesday: no sleep entries logged")).toBeTruthy();
  });
});

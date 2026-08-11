import { screen } from "@testing-library/react-native";

import { SleepDurationChart } from "@/src/features/sleep/sleep-duration-chart";
import type { SleepLog } from "@/src/features/sleep/types";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { renderWithProviders } from "@/test/render-with-providers";

const mockUseWindowDimensions = jest.fn();

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === "useWindowDimensions") return mockUseWindowDimensions;
      return Reflect.get(target, prop, receiver);
    },
  });
});

function night(overrides: Partial<SleepLog> = {}): SleepLog {
  const loggedAt = "2026-05-31T01:00:00Z";
  return {
    id: "n-1",
    userId: "user-1",
    durationMinutes: 420,
    quality: 3,
    notes: "",
    loggedAt,
    loggedOffsetMinutes: null,
    dayKey: entryDayKey(loggedAt, null),
    entryDay: entryDayKey(loggedAt, null),
    window: null,
    createdAt: loggedAt,
    ...overrides,
  };
}

describe("SleepDurationChart", () => {
  beforeEach(() => {
    mockUseWindowDimensions.mockReturnValue({ width: 720, height: 800, scale: 1, fontScale: 1 });
  });

  it("shows the empty state with no nights", () => {
    renderWithProviders(<SleepDurationChart nights={[]} />);
    expect(screen.getByText(/Log a few sleep entries/)).toBeTruthy();
  });

  it("dates a bar by the night's captured day, not the viewer's day for that instant", () => {
    // Captured at UTC-11, where 2026-05-31T01:00Z is still May 30. The bar IS
    // the night's civil day, so its date label must come from dayKey - dating
    // it from the instant reads 5/31 in any viewer zone east of UTC (#433 §2).
    const log = night({
      loggedOffsetMinutes: -660,
      dayKey: entryDayKey("2026-05-31T01:00:00Z", -660),
    });
    expect(log.dayKey).toBe("2026-05-30");

    renderWithProviders(<SleepDurationChart nights={[log]} />);
    expect(screen.getByText("5/30")).toBeTruthy();
    expect(screen.queryByText("5/31")).toBeNull();
  });

  it("uses a uniform accessible fill instead of grading entries by quality", () => {
    renderWithProviders(
      <SleepDurationChart
        nights={[
          night({ id: "rough", quality: 1 }),
          night({ id: "excellent", quality: 5, dayKey: "2026-06-01" }),
        ]}
      />,
    );

    for (const bar of screen.getAllByTestId("bar-chart-bar")) {
      expect(bar.props.className).toContain("bg-muted-foreground/80");
      expect(bar.props.className).not.toContain("bg-ink/");
    }
  });

  it("extends the scale beyond ten hours without clamping longer entries together", () => {
    renderWithProviders(
      <SleepDurationChart
        nights={[
          night({ id: "twelve", durationMinutes: 12 * 60 }),
          night({ id: "fourteen", durationMinutes: 14 * 60, dayKey: "2026-06-01" }),
        ]}
      />,
    );

    const heights = screen.getAllByTestId("bar-chart-bar").map((bar) => bar.props.style.height);
    expect(heights[0]).toBeCloseTo((12 / 14) * 80);
    expect(heights[1]).toBe(80);
    // Exact values sit over their bars; no horizontal row masquerades as a
    // vertical-axis scale (#842 review).
    expect(screen.queryByText("7h")).toBeNull();
    expect(screen.getByText("14h")).toBeTruthy();
  });

  it("keeps each date and duration together in one accessible column", () => {
    renderWithProviders(<SleepDurationChart nights={[night()]} />);

    expect(screen.getByLabelText("5/31: 7h of sleep")).toBeTruthy();
  });

  it("prints every other visual date at phone width while retaining all fourteen bars", () => {
    mockUseWindowDimensions.mockReturnValue({ width: 360, height: 800, scale: 3, fontScale: 1 });
    const nights = Array.from({ length: 14 }, (_, index) =>
      night({
        id: `n-${index}`,
        dayKey: `2026-05-${String(index + 1).padStart(2, "0")}`,
      }),
    );

    renderWithProviders(<SleepDurationChart nights={nights} />);

    expect(screen.getAllByTestId("bar-chart-bar")).toHaveLength(14);
    expect(screen.getByText("5/1")).toBeTruthy();
    expect(screen.queryByText("5/2")).toBeNull();
    expect(screen.getByText("5/13")).toBeTruthy();
    expect(screen.queryByText("5/14")).toBeNull();
    expect(screen.getByLabelText("5/14: 7h of sleep")).toBeTruthy();
  });
});

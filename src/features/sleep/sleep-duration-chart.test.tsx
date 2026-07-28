import { screen } from "@testing-library/react-native";

import { SleepDurationChart } from "@/src/features/sleep/sleep-duration-chart";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { renderWithProviders } from "@/test/render-with-providers";

function night(overrides: Record<string, unknown> = {}) {
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
    createdAt: loggedAt,
    ...overrides,
  };
}

describe("SleepDurationChart", () => {
  it("shows the empty state with no nights", () => {
    renderWithProviders(<SleepDurationChart nights={[]} />);
    expect(screen.getByText(/Log a few nights/)).toBeTruthy();
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
});

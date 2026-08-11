import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { SleepRecentList } from "@/src/features/sleep/sleep-recent-list";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

const mockRouter = jest.mocked(router);

function sleepLog(i: number) {
  const loggedAt = new Date(2026, 4, 30 - i, 12).toISOString();
  const dayKey = entryDayKey(loggedAt, null);
  return {
    id: `s-${i}`,
    userId: "user-1",
    durationMinutes: 360 + i,
    quality: 3,
    notes: "",
    loggedAt,
    loggedOffsetMinutes: null,
    dayKey,
    entryDay: dayKey,
    window: null,
    createdAt: loggedAt,
  };
}

describe("SleepRecentList", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the empty state with no logs", () => {
    renderWithProviders(<SleepRecentList logs={[]} />);
    expect(screen.getByText(/No sleep logged yet/)).toBeTruthy();
  });

  it("shows exactly five rows with no expand-in-place toggle", () => {
    const logs = Array.from({ length: 10 }, (_, i) => sleepLog(i));
    renderWithProviders(<SleepRecentList logs={logs} />);

    // The five newest by entry day: 360..364 minutes → "6h", "6h 1m"…"6h 4m".
    expect(screen.getByText("6h")).toBeTruthy();
    expect(screen.getByText("6h 4m")).toBeTruthy();
    expect(screen.queryByText("6h 5m")).toBeNull();
    // Depth moved to the all-history screen; nothing expands in place.
    expect(screen.queryByText("Show all (10)")).toBeNull();
    expect(screen.queryByText("Show less")).toBeNull();
  });

  it("gives each row one accessible name carrying duration and quality", () => {
    // The five-dot read-out is a sighted-only count cue; the label is where a
    // screen-reader user hears the level (#775).
    renderWithProviders(<SleepRecentList logs={[sleepLog(0)]} />);
    expect(screen.getByLabelText(/6h of sleep, Fair/)).toBeTruthy();
  });

  it("routes to the detail screen on row press", () => {
    renderWithProviders(<SleepRecentList logs={[sleepLog(0)]} />);
    fireEvent.press(screen.getByText("6h")); // 360 min => "6h"
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/tools/sleep/[id]",
      params: { id: "s-0" },
    });
  });

  it("labels a row by its captured day, not the viewer's day for that instant", () => {
    // Frozen viewer clock: the instant below is "today" in the viewer's zone,
    // but the night was captured at UTC-11 where it was still the previous
    // civil day - the row must read "Yesterday" to agree with the summary
    // block above it, which groups on dayKey (#433 §2).
    jest.useFakeTimers({ now: new Date("2026-05-31T12:00:00Z"), doNotFake: ["performance"] });
    try {
      const loggedAt = "2026-05-31T01:00:00Z";
      const log = {
        ...sleepLog(0),
        loggedAt,
        loggedOffsetMinutes: -660,
        dayKey: entryDayKey(loggedAt, -660),
      };
      expect(log.dayKey).toBe("2026-05-30");

      renderWithProviders(<SleepRecentList logs={[log]} />);
      expect(screen.getByText("Yesterday")).toBeTruthy();
      expect(screen.queryByText("Today")).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

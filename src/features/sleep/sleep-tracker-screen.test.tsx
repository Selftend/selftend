import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import SleepTrackerScreen from "@/src/features/sleep/sleep-tracker-screen";
import { useSleepLogs, useSleepLogCount, useSleepStats } from "@/src/features/sleep/queries";
import { formatHours } from "@/src/features/sleep/format";
import { averageDurationMinutes } from "@/src/features/sleep/summaries";
import type { SleepStats } from "@/src/features/sleep/types";
import { addDaysToKey, currentDateKey } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
  },
  usePathname: () => "/tools/sleep",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

jest.mock("@/src/components/app/notification-settings-modal", () => ({
  NotificationSettingsModal: () => null,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/sleep/queries", () => ({
  useSleepLogs: jest.fn(),
  useSleepLogCount: jest.fn(),
  useSleepStats: jest.fn(),
}));

const mockUseSleepLogs = useSleepLogs as jest.MockedFunction<typeof useSleepLogs>;
const mockUseSleepLogCount = useSleepLogCount as jest.MockedFunction<typeof useSleepLogCount>;
const mockUseSleepStats = useSleepStats as jest.MockedFunction<typeof useSleepStats>;
const mockRouter = jest.mocked(router);

function sleepLog(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "s-1",
    userId: "user-1",
    durationMinutes: 450,
    quality: 4,
    notes: "",
    loggedAt: "2026-07-20T22:30:00.000Z",
    // The civil day the repository resolves for that instant; day-scoped summaries
    // bucket on this rather than converting the timestamp themselves (#250).
    dayKey: "2026-07-20",
    createdAt: "2026-07-20T22:30:00.000Z",
    ...overrides,
  };
}

const setServerStats = (data: SleepStats | null | undefined) =>
  mockUseSleepStats.mockReturnValue({ data } as unknown as ReturnType<typeof useSleepStats>);

describe("SleepTrackerScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSleepLogCount.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useSleepLogCount>);
    setServerStats(undefined);
  });

  it("renders the ink field header with title, stats, and empty-state subline", () => {
    mockUseSleepLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useSleepLogs>);

    renderWithProviders(<SleepTrackerScreen />);

    expect(screen.getByRole("heading", { name: "Sleep tracker" })).toBeTruthy();
    expect(screen.getByTestId("module-field-gradient")).toBeTruthy();
    // Calm muted subline when nothing is logged - never a shame state.
    expect(screen.getByText("No sleep logged yet")).toBeTruthy();
    // Section headings render on the sheet.
    expect(screen.getByRole("heading", { name: "Recent entries" })).toBeTruthy();
  });

  it("shows the last-logged subline when a night exists", () => {
    mockUseSleepLogs.mockReturnValue({
      data: [sleepLog()],
    } as unknown as ReturnType<typeof useSleepLogs>);

    renderWithProviders(<SleepTrackerScreen />);

    expect(screen.getByText(/^Last · /)).toBeTruthy();
    expect(screen.queryByText("No sleep logged yet")).toBeNull();
  });

  it("omits the subline until the logs query has actually loaded", () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "no sleep logged" there would erase a returning user's real history.
    mockUseSleepLogs.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useSleepLogs>);

    renderWithProviders(<SleepTrackerScreen />);

    expect(screen.queryByText("No sleep logged yet")).toBeNull();
    expect(screen.queryByText(/^Last · /)).toBeNull();
  });

  // -------------------------------------------------------------------------
  // #256: every summary on this screen used to be computed from the 50-log list
  // query, so each was really a "newest 50 logs" figure. These cover the
  // server-aggregated replacement.
  // -------------------------------------------------------------------------

  // 70 nights inside the last 30 captured days - four a night, which a user logging
  // naps or split sleep reaches in under three weeks. The 30 newest are short (300
  // min), the 40 older ones long (600 min), so the newest-50 window the list query
  // returns is short-heavy and its average is well below the true one.
  function history() {
    return Array.from({ length: 70 }, (_, i) => {
      const daysAgo = Math.floor(i / 4);
      const short = i < 30;
      return sleepLog({
        id: `s-${i}`,
        durationMinutes: short ? 300 : 600,
        quality: short ? 2 : 5,
        dayKey: addDaysToKey(currentDateKey(), -daysAgo),
        // Strictly decreasing, so `.slice(0, 50)` really is the newest 50.
        loggedAt: new Date(Date.UTC(2026, 0, 1, 12) - i * 60_000).toISOString(),
      });
    });
  }

  it("shows the 30-day average over every night, not just the newest 50 logged", () => {
    const all = history();
    // What `useSleepLogs(userId, 50)` actually hands the screen.
    const capped = all.slice(0, 50);

    // The premise, asserted rather than assumed: the capped list disagrees with the
    // full history, and it is the capped figure the screen used to render.
    expect(averageDurationMinutes(capped, 30)).toBe(420); // 7.0h
    expect(averageDurationMinutes(all, 30)).toBe(471); // 7.9h

    mockUseSleepLogs.mockReturnValue({ data: capped } as unknown as ReturnType<
      typeof useSleepLogs
    >);
    setServerStats({
      sevenDayDurationMinutes: 300,
      sevenDayQuality: 2,
      thirtyDayDurationMinutes: 471,
      thirtyDayQuality: 3.7,
      qualityDistribution30: [0, 30, 0, 0, 40],
      longestMinutes: 600,
      shortestMinutes: 300,
      weekdayAverageMinutes: [471, null, null, null, null, null, null],
    });

    renderWithProviders(<SleepTrackerScreen />);

    expect(screen.getByText(formatHours(471))).toBeTruthy();
    // The capped-list average, which is what the screen used to show.
    expect(screen.queryByText(formatHours(420))).toBeNull();
  });

  it("shows lifetime longest and shortest, not the extremes of the newest 50", () => {
    // The labels name no window, so these read as lifetime figures - but a user's
    // longest ever night falls out of the capped list as soon as they pass 50 logs.
    mockUseSleepLogs.mockReturnValue({
      data: [sleepLog({ durationMinutes: 450, dayKey: currentDateKey() })],
    } as unknown as ReturnType<typeof useSleepLogs>);
    setServerStats({
      sevenDayDurationMinutes: 450,
      sevenDayQuality: 4,
      thirtyDayDurationMinutes: 450,
      thirtyDayQuality: 4,
      qualityDistribution30: [0, 0, 0, 1, 0],
      longestMinutes: 660,
      shortestMinutes: 240,
      weekdayAverageMinutes: [null, null, null, null, null, null, null],
    });

    renderWithProviders(<SleepTrackerScreen />);

    expect(screen.getByText("11h")).toBeTruthy();
    expect(screen.getByText("4h")).toBeTruthy();
    // The capped list's only night. It still appears once, in the recent-entries list
    // below - but taking the extremes over that list is what used to put it in both
    // stat tiles as well, i.e. three times.
    expect(screen.getAllByText("7h 30m")).toHaveLength(1);
  });

  it("falls back to the loaded logs until the server stats arrive", () => {
    mockUseSleepLogs.mockReturnValue({
      data: [sleepLog({ durationMinutes: 480, dayKey: currentDateKey() })],
    } as unknown as ReturnType<typeof useSleepLogs>);
    setServerStats(undefined);

    renderWithProviders(<SleepTrackerScreen />);

    // 480 min = 8.0h, from the capped list - a slightly truncated summary beats a
    // screen full of dashes while the aggregate is in flight.
    expect(screen.getAllByText("8.0h").length).toBeGreaterThan(0);
  });

  it("renders dashes when the server reports no nights in the window", () => {
    // Null is "nothing logged in that window", which is not a zero-hour average.
    mockUseSleepLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useSleepLogs>);
    setServerStats({
      sevenDayDurationMinutes: null,
      sevenDayQuality: null,
      thirtyDayDurationMinutes: null,
      thirtyDayQuality: null,
      qualityDistribution30: [0, 0, 0, 0, 0],
      longestMinutes: null,
      shortestMinutes: null,
      weekdayAverageMinutes: [null, null, null, null, null, null, null],
    });

    renderWithProviders(<SleepTrackerScreen />);

    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("routes to the new sleep log screen from the CTA", () => {
    mockUseSleepLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useSleepLogs>);

    renderWithProviders(<SleepTrackerScreen />);

    fireEvent.press(screen.getByText("Log last night's sleep"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/sleep/new");
  });
});

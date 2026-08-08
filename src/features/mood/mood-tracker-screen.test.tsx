import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import MoodTrackerScreen from "@/src/features/mood/mood-tracker-screen";
import {
  useFirstMoodDayKey,
  useMoodHistory,
  useMoodLogCount,
  useMoodScorePoints,
} from "@/src/features/mood/queries";
import { currentDateKey } from "@/src/stores/selected-date-store";
import { startOfDayDaysAgo } from "@/src/utils/date";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
  },
  usePathname: () => "/tools/check-in",
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

jest.mock("@/src/features/mood/queries", () => ({
  useFirstMoodDayKey: jest.fn(),
  useMoodHistory: jest.fn(),
  useMoodLogCount: jest.fn(),
  useMoodScorePoints: jest.fn(),
}));

jest.mock("@/src/features/mood/emotion-preferences-queries", () => ({
  useEmotionPreferences: () => ({ data: [] }),
}));

const mockUseMoodLogs = useMoodHistory as jest.MockedFunction<typeof useMoodHistory>;
const mockUseMoodLogCount = useMoodLogCount as jest.MockedFunction<typeof useMoodLogCount>;
const mockUseMoodScorePoints = useMoodScorePoints as jest.MockedFunction<typeof useMoodScorePoints>;
const mockUseFirstMoodLogDate = useFirstMoodDayKey as jest.MockedFunction<
  typeof useFirstMoodDayKey
>;
const mockRouter = jest.mocked(router);

/**
 * Sections are staged (#735): the picker always renders, week/map need a
 * lifetime check-in, and the trend needs two charted points. So a test about
 * anything below the picker has to say which of those it is standing on -
 * `mockLogged()` is that statement, and the staging itself is asserted
 * separately in "section staging" below.
 */
function dayKeyDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Enough state for every section to have earned its place. */
function mockLogged({ points = 2, count = 5 }: { points?: number; count?: number } = {}) {
  mockUseMoodLogCount.mockReturnValue({
    data: count,
  } as unknown as ReturnType<typeof useMoodLogCount>);
  mockUseMoodScorePoints.mockReturnValue({
    data: Array.from({ length: points }, (_, i) => ({
      dayKey: dayKeyDaysAgo(i),
      moodScore: 4,
    })),
  } as unknown as ReturnType<typeof useMoodScorePoints>);
}

describe("MoodTrackerScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoodLogCount.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useMoodLogCount>);
    mockUseMoodScorePoints.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodScorePoints>);
    mockUseFirstMoodLogDate.mockReturnValue({
      data: null,
    } as unknown as ReturnType<typeof useFirstMoodDayKey>);
  });

  describe("section staging", () => {
    // The screen GROWS rather than rearranges: sections append in a fixed order
    // as they earn their place, so nothing already on screen ever moves (#695).
    it("meets a brand-new user with the picker alone, not four empty panels", () => {
      mockUseMoodLogs.mockReturnValue({
        data: [],
      } as unknown as ReturnType<typeof useMoodHistory>);

      renderWithProviders(<MoodTrackerScreen />);

      expect(screen.getByRole("heading", { name: "Check-in" })).toBeTruthy();
      expect(screen.getByLabelText("Awful")).toBeTruthy();
      // Nothing below the picker has anything to say yet.
      expect(screen.queryByRole("heading", { name: "This week" })).toBeNull();
      expect(screen.queryByRole("heading", { name: "Mood trend" })).toBeNull();
      expect(screen.queryByRole("heading", { name: "All time" })).toBeNull();
      // And none of the old nothing-yet copy is on screen either.
      expect(screen.queryByText("Log a mood to start your trend.")).toBeNull();
      expect(screen.queryByText("Log a mood to start your map.")).toBeNull();
    });

    it("adds the week and the map at one check-in, but not the trend", () => {
      // One point is a dot, not a direction - "trend" is a claim one check-in
      // cannot make.
      mockLogged({ points: 1, count: 1 });
      mockUseMoodLogs.mockReturnValue({
        data: [],
      } as unknown as ReturnType<typeof useMoodHistory>);

      renderWithProviders(<MoodTrackerScreen />);

      expect(screen.getByRole("heading", { name: "This week" })).toBeTruthy();
      expect(screen.getByRole("heading", { name: "All time" })).toBeTruthy();
      expect(screen.queryByRole("heading", { name: "Mood trend" })).toBeNull();
    });

    it("adds the trend at two charted points", () => {
      mockLogged({ points: 2, count: 2 });
      mockUseMoodLogs.mockReturnValue({
        data: [],
      } as unknown as ReturnType<typeof useMoodHistory>);

      renderWithProviders(<MoodTrackerScreen />);

      expect(screen.getByRole("heading", { name: "Mood trend" })).toBeTruthy();
    });

    it("keeps a section it has earned even while the count query is reloading", () => {
      // `totalCount` undefined means loading, not zero - tearing the page down
      // mid-refetch would be the rearrangement the staging exists to avoid.
      mockLogged({ points: 2, count: 2 });
      mockUseMoodLogs.mockReturnValue({
        data: [],
      } as unknown as ReturnType<typeof useMoodHistory>);

      const { rerender } = renderWithProviders(<MoodTrackerScreen />);
      expect(screen.getByRole("heading", { name: "Mood trend" })).toBeTruthy();

      rerender(<MoodTrackerScreen />);
      expect(screen.getByRole("heading", { name: "Mood trend" })).toBeTruthy();
    });
  });

  it("no longer renders an entry list on the overview", () => {
    // The week strip is check-in's recency view; a list underneath duplicated
    // it, which is why check-in was also the one tool of eight without a
    // "Load 5 more" (#695). The list moved to /tools/check-in/history (#734).
    mockLogged();
    const loggedAt = new Date(`${currentDateKey()}T12:00:00`).toISOString();
    mockUseMoodLogs.mockReturnValue({
      data: [
        {
          id: "log-1",
          userId: "user-1",
          moodScore: 4,
          emotions: [],
          notes: "Felt steadier after a walk",
          linkedStrategy: null,
          loggedAt,
          loggedOffsetMinutes: null,
          dayKey: entryDayKey(loggedAt, null),
          createdAt: loggedAt,
        },
      ],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.queryByRole("heading", { name: "History" })).toBeNull();
    expect(screen.queryByText("Your check-ins will appear here.")).toBeNull();
    expect(screen.queryByText(/^avg /)).toBeNull();
    // The entry's own note only ever rendered inside that list.
    expect(screen.queryByText("Felt steadier after a walk")).toBeNull();
  });

  it("renders a pending Today card when there are no mood logs", () => {
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    // Field header renders the title as the h1 heading over the hue gradient.
    expect(screen.getByRole("heading", { name: "Check-in" })).toBeTruthy();
    expect(screen.getByText("How are you feeling right now?")).toBeTruthy();
    expect(screen.getByLabelText("Awful")).toBeTruthy();
    // The stats row stays away too (#695 spells the zero state out: breadcrumb,
    // title, tagline, no stats row, the picker). "0 check-ins · 0 this week ·
    // - 7-day avg" is a row of nothing dressed as data.
    expect(screen.queryByTestId("module-header-stats")).toBeNull();
    expect(screen.queryByText("No check-ins yet")).toBeNull();
  });

  it("brings the stats row in with the first check-in", () => {
    mockLogged({ points: 1, count: 1 });
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.getByTestId("module-header-stats")).toBeTruthy();
  });

  it("renders the week block once it has earned its place", () => {
    mockLogged({ points: 1, count: 1 });
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    // WeekHero: section heading, null average placeholder (appears in both stats row and hero),
    // delta copy when there is no prior-week data, sub-section labels, empty emotion state
    expect(screen.getByRole("heading", { name: "This week" })).toBeTruthy();
    expect(screen.getAllByText("-")).toHaveLength(2); // stats row 7-day avg + WeekHero big number
    expect(screen.getByText("first week of data")).toBeTruthy();
    expect(screen.getByText("Mood by day")).toBeTruthy();
    expect(screen.getByText("No emotions tagged yet")).toBeTruthy();
  });

  it("omits the subline until the history query has actually loaded", () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "no check-ins" there would erase a returning user's real history.
    mockUseMoodLogs.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.queryByText("No check-ins yet")).toBeNull();
    expect(screen.queryByText(/^last logged /)).toBeNull();
  });

  it("renders the completed Today card with score when a single entry was logged today", () => {
    mockLogged();
    // Anchor to today's LOCAL date (the app groups entries by local date via
    // toLocalDateKey), so the test is independent of timezone / time of day.
    const loggedAt = new Date(`${currentDateKey()}T12:00:00`).toISOString();
    mockUseMoodLogs.mockReturnValue({
      data: [
        {
          id: "log-1",
          userId: "user-1",
          moodScore: 4,
          emotions: ["Anxious"],
          notes: "Felt steadier after a walk",
          linkedStrategy: null,
          loggedAt,
          loggedOffsetMinutes: null,
          dayKey: entryDayKey(loggedAt, null),
          createdAt: loggedAt,
        },
      ],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.getByText("Logged · 4/5")).toBeTruthy();
    // "Log another" button has been removed; MoodScale emoji row is the only re-log affordance
    expect(screen.queryByText("Log another")).toBeNull();
    // WeekHero: the 7-day average appears in both the stats row and the WeekHero big number
    expect(screen.getAllByText("4.0")).toHaveLength(2); // stats row 7-day avg + WeekHero large number
    expect(screen.getByText("first week of data")).toBeTruthy();
    // WeekHero's top-emotion pill is now the ONLY place the emotion appears -
    // the entry card that used to echo it went with the list (#735).
    expect(screen.getAllByText(/Anxious/)).toHaveLength(1);
  });

  it("shows the average and count when multiple entries were logged today", () => {
    mockLogged();
    const dayKey = currentDateKey();
    const morning = new Date(`${dayKey}T09:00:00`).toISOString();
    const evening = new Date(`${dayKey}T18:00:00`).toISOString();
    mockUseMoodLogs.mockReturnValue({
      data: [
        {
          id: "log-2",
          userId: "user-1",
          moodScore: 4,
          emotions: [],
          notes: "",
          linkedStrategy: null,
          loggedAt: evening,
          loggedOffsetMinutes: null,
          dayKey: entryDayKey(evening, null),
          createdAt: evening,
        },
        {
          id: "log-1",
          userId: "user-1",
          moodScore: 2,
          emotions: [],
          notes: "",
          linkedStrategy: null,
          loggedAt: morning,
          loggedOffsetMinutes: null,
          dayKey: entryDayKey(morning, null),
          createdAt: morning,
        },
      ],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.getByText("2 logs · avg 3/5")).toBeTruthy();
    // "Log another" button removed; assert it is absent
    expect(screen.queryByText("Log another")).toBeNull();
    // The day's average is stated once, by the picker. The list that repeated it
    // as a group average is gone (#735), and under paging that average was the
    // defect #705 filed anyway.
    expect(screen.queryByText("avg 3.0")).toBeNull();
  });

  it("renders 5 MoodScale buttons on the home check-in tile (compact)", async () => {
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    // Compact MoodScale renders emoji + accessibility label only (no visible text label).
    // Assert on the a11y label via getByLabelText, which works regardless of visible text.
    expect(await screen.findByLabelText("OK")).toBeTruthy();
    expect(screen.getByLabelText("Awful")).toBeTruthy();
    expect(screen.getByLabelText("Great")).toBeTruthy();
  });

  it("routes to the new mood entry page when the CTA is pressed", () => {
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    fireEvent.press(screen.getByLabelText("OK"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/check-in/new?score=3");
  });

  it("links to the all-history screen from the week row", () => {
    mockLogged();
    // The week strip is check-in's recency view, so the overview carries no
    // recent-entries list of its own - this link is the only way to a list of
    // past check-ins, and the mood map deliberately never navigates (#696).
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);
    fireEvent.press(screen.getByText("Show all history"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/check-in/history");
  });

  it("offers 7d/30d/90d/Custom trend ranges, defaulting to a 30-day window (no 14d)", () => {
    mockLogged();
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.getByText("7d")).toBeTruthy();
    expect(screen.getByText("30d")).toBeTruthy();
    expect(screen.getByText("90d")).toBeTruthy();
    expect(screen.getByText("Custom")).toBeTruthy();
    expect(screen.queryByText("14d")).toBeNull();
    // Default window: the narrow score-points query is asked for the 30-day window.
    expect(mockUseMoodScorePoints).toHaveBeenCalledWith(
      "user-1",
      startOfDayDaysAgo(30).toISOString(),
      undefined,
    );
  });

  it("switches the score-points window when a preset range is tapped", () => {
    mockLogged();
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    fireEvent.press(screen.getByText("90d"));

    // (Not "last called": the all-time heatmap query shares this hook.)
    expect(mockUseMoodScorePoints).toHaveBeenCalledWith(
      "user-1",
      startOfDayDaysAgo(90).toISOString(),
      undefined,
    );
  });

  it("renders the all-time heatmap section below the trend", () => {
    mockLogged();
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.getByRole("heading", { name: "All time" })).toBeTruthy();
    // The map's own "log a mood to start your map" is no longer the first thing
    // a new user meets: the section only renders once there IS a check-in, so
    // that copy is now reachable only when the map's window is empty while the
    // lifetime count is not (#735).
    expect(screen.queryByText("Log a mood to start your map.")).toBeNull();
  });

  it("opens the range picker when Custom is tapped", () => {
    mockLogged();
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.queryByText("Done")).toBeNull();
    fireEvent.press(screen.getByText("Custom"));
    expect(screen.getByText("Done")).toBeTruthy();
  });
});

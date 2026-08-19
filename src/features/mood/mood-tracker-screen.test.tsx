import { fireEvent, screen, within } from "@testing-library/react-native";
import { router } from "expo-router";

import MoodTrackerScreen from "@/src/features/mood/mood-tracker-screen";
import {
  useFirstMoodDayKey,
  useMoodHistory,
  useMoodLogCount,
  useMoodScorePoints,
  useMoodWeek,
} from "@/src/features/mood/queries";
import { currentDateKey } from "@/src/stores/selected-date-store";
import { startOfDayDaysAgo } from "@/src/utils/date";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { useMoodSeedStore } from "@/src/stores/mood-seed-store";
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

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/mood/queries", () => ({
  ALL_TIME_FROM_ISO: "1970-01-01T00:00:00.000Z",
  useFirstMoodDayKey: jest.fn(),
  useMoodHistory: jest.fn(),
  useMoodLogCount: jest.fn(),
  useMoodScorePoints: jest.fn(),
  useMoodWeek: jest.fn(),
}));

jest.mock("@/src/features/mood/emotion-preferences-queries", () => ({
  useEmotionPreferences: () => ({ data: [] }),
  useEmotionUsageCounts: () => ({ data: {} }),
}));

const mockUseMoodLogs = useMoodHistory as jest.MockedFunction<typeof useMoodHistory>;
const mockUseMoodLogCount = useMoodLogCount as jest.MockedFunction<typeof useMoodLogCount>;
const mockUseMoodScorePoints = useMoodScorePoints as jest.MockedFunction<typeof useMoodScorePoints>;
const mockUseFirstMoodLogDate = useFirstMoodDayKey as jest.MockedFunction<
  typeof useFirstMoodDayKey
>;
const mockUseMoodWeek = useMoodWeek as jest.MockedFunction<typeof useMoodWeek>;
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
    // The week block reads its own per-week query now (#736) - it can page past
    // the 200-row history cache, so it cannot be fed by it. Every fixture below
    // describes one user's recent check-ins, all of them dated today or within
    // the current week, so the week query mirrors the history mock rather than
    // making each test state the same rows twice. Tests that care about the
    // difference set it explicitly.
    mockUseMoodWeek.mockImplementation(
      () => mockUseMoodLogs("user-1") as unknown as ReturnType<typeof useMoodWeek>,
    );
  });

  /**
   * A week that has not loaded is not an empty week. `weekLogs` is undefined
   * both while the fetch is in flight and after it fails, and every aggregation
   * turns undefined into "-", seven blank days and "No emotions tagged yet" -
   * which would tell a user on a flaky connection that a week they filled is
   * empty. Same distinction the subline makes for `moodLogs` (#735).
   */
  describe("week block load states", () => {
    it("does not claim an empty week while the week query is still in flight", () => {
      mockLogged({ points: 1, count: 3 });
      mockUseMoodLogs.mockReturnValue({
        data: [],
      } as unknown as ReturnType<typeof useMoodHistory>);
      mockUseMoodWeek.mockReturnValue({
        data: undefined,
        isError: false,
        refetch: jest.fn(),
      } as unknown as ReturnType<typeof useMoodWeek>);

      renderWithProviders(<MoodTrackerScreen />);

      // The section is there (the account has check-ins) but says nothing about
      // this week yet.
      expect(screen.getByRole("heading", { name: "This week" })).toBeTruthy();
      expect(screen.queryByText("No emotions tagged yet")).toBeNull();
      expect(screen.queryByText("Felt most often")).toBeNull();
    });

    it("offers a retry instead of an empty week when the week query fails", () => {
      const refetch = jest.fn();
      mockLogged({ points: 1, count: 3 });
      mockUseMoodLogs.mockReturnValue({
        data: [],
      } as unknown as ReturnType<typeof useMoodHistory>);
      mockUseMoodWeek.mockReturnValue({
        data: undefined,
        isError: true,
        refetch,
      } as unknown as ReturnType<typeof useMoodWeek>);

      renderWithProviders(<MoodTrackerScreen />);

      expect(screen.getByText("This week couldn't be loaded.")).toBeTruthy();
      expect(screen.queryByText("No emotions tagged yet")).toBeNull();
      fireEvent.press(screen.getByText("Retry"));
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    // A failed BACKGROUND refetch that still has the week cached must keep
    // rendering the week rather than replacing it with a retry prompt.
    it("keeps rendering cached data when a background refetch fails", () => {
      mockLogged({ points: 1, count: 3 });
      mockUseMoodLogs.mockReturnValue({
        data: [],
      } as unknown as ReturnType<typeof useMoodHistory>);
      mockUseMoodWeek.mockReturnValue({
        data: [],
        isError: true,
        refetch: jest.fn(),
      } as unknown as ReturnType<typeof useMoodWeek>);

      renderWithProviders(<MoodTrackerScreen />);

      expect(screen.getByText("Felt most often")).toBeTruthy();
      expect(screen.queryByText("This week couldn't be loaded.")).toBeNull();
    });
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
      expect(screen.queryByRole("heading", { name: "Mood map" })).toBeNull();
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
      expect(screen.getByRole("heading", { name: "Mood map" })).toBeTruthy();
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

    it("falls back to the loaded logs when the count query has no answer", () => {
      // A pending or failed count must not retract the week block - and with it
      // the only link to all history - from a user whose entries are on screen.
      const loggedAt = new Date(`${currentDateKey()}T12:00:00`).toISOString();
      mockUseMoodLogCount.mockReturnValue({
        data: undefined,
      } as unknown as ReturnType<typeof useMoodLogCount>);
      mockUseMoodLogs.mockReturnValue({
        data: [
          {
            id: "log-1",
            userId: "user-1",
            moodScore: 4,
            emotions: [],
            notes: "",
            linkedStrategy: null,
            loggedAt,
            loggedOffsetMinutes: null,
            dayKey: entryDayKey(loggedAt, null),
            createdAt: loggedAt,
          },
        ],
      } as unknown as ReturnType<typeof useMoodHistory>);

      renderWithProviders(<MoodTrackerScreen />);

      expect(screen.getByRole("heading", { name: "This week" })).toBeTruthy();
      expect(screen.getByText("Show all history")).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Mood map" })).toBeTruthy();
    });

    it("keeps the trend section mounted when a narrower range holds too little", () => {
      // The range switch lives INSIDE this section. Gating on the selected
      // range's point count would let a user pick 7d, fall under two points,
      // and lose the control they need to get back to 30d.
      mockLogged({ points: 2, count: 2 });
      mockUseMoodLogs.mockReturnValue({
        data: [],
      } as unknown as ReturnType<typeof useMoodHistory>);

      const { rerender } = renderWithProviders(<MoodTrackerScreen />);
      expect(screen.getByRole("heading", { name: "Mood trend" })).toBeTruthy();

      // The narrowed range comes back with a single day of data.
      mockLogged({ points: 1, count: 2 });
      rerender(<MoodTrackerScreen />);

      expect(screen.getByRole("heading", { name: "Mood trend" })).toBeTruthy();
      // Its own control is still there to change the range with.
      expect(screen.getAllByText("7d").length).toBeGreaterThan(0);
      expect(screen.getAllByText("30d").length).toBeGreaterThan(0);
      // The chart empties, not the page - and it blames the range, not the user.
      expect(screen.getByText("Not enough check-ins in this range yet.")).toBeTruthy();
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

    // WeekHero (design 2a): section heading, the strip, and the felt-most row
    // carrying the inline week average — the 40px display block and its delta
    // copy are gone.
    expect(screen.getByRole("heading", { name: "This week" })).toBeTruthy();
    expect(screen.getByText("Felt most often")).toBeTruthy();
    expect(screen.getByText("No emotions tagged yet")).toBeTruthy();
    // No loaded week logs in this fixture, so the inline average is an em dash.
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.queryByText("Week average")).toBeNull();
    expect(screen.queryByText("first week of data")).toBeNull();
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

  it("shows today's log selected on the picker with the caption naming it", () => {
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

    // The caption names today's latest log (design 2a): scale word plus the
    // "tap to add another" invitation. Scoped to the caption row - "Good"
    // also labels a distribution column and the heatmap callout.
    const caption = within(screen.getByTestId("today-caption"));
    expect(caption.getByText("Good")).toBeTruthy();
    expect(caption.getByText(/tap to add another/)).toBeTruthy();
    // The 7-day average appears in the stats row AND inline on the felt-most
    // row - the 40px display block it used to headline is gone.
    expect(screen.getAllByText("4.0")).toHaveLength(2);
    // WeekHero's top-emotion chip is the ONLY place the emotion appears -
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

    // The caption follows the LATEST of today's logs (the evening 4), never a
    // day average - the day's mean lives on the week strip cell instead.
    const caption = within(screen.getByTestId("today-caption"));
    expect(caption.getByText("Good")).toBeTruthy();
    expect(caption.getByText(/tap to add another/)).toBeTruthy();
    expect(screen.queryByText("2 logs · avg 3/5")).toBeNull();
    expect(screen.queryByText("avg 3.0")).toBeNull();
  });

  it("renders 5 MoodScale buttons on the home check-in tile (compact)", async () => {
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    // Compact MoodScale renders emoji + accessibility label only (no visible text label).
    // Assert on the a11y label via getByLabelText, which works regardless of visible text.
    expect(await screen.findByLabelText("Okay")).toBeTruthy();
    expect(screen.getByLabelText("Awful")).toBeTruthy();
    expect(screen.getByLabelText("Great")).toBeTruthy();
  });

  it("routes to the new mood entry page when the CTA is pressed", () => {
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    fireEvent.press(screen.getByLabelText("Okay"));

    // Asserts the SEED, not a new URL shape. Re-pointing this at a different path would
    // be the tests-weakened-to-fit failure AGENTS.md asks reviewers to flag: the whole
    // point of #961 is that the score must not be in the URL at all.
    expect(useMoodSeedStore.getState().score).toBe(3);
    expect(mockRouter.push).toHaveBeenCalledWith("/tools/check-in/new");
    expect(mockRouter.push).not.toHaveBeenCalledWith(expect.stringContaining("score="));
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

  it("gives the trend and the distribution their own range control, and the map none (#899)", () => {
    mockLogged();
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    // Two independent controls — Mood trend and Distribution — each with the
    // full segment set. The Mood map has NO control (#899 reverted the one
    // #880 gave it): it always shows the whole history, reached by its own
    // horizontal scroller.
    expect(screen.getAllByText("7d")).toHaveLength(2);
    expect(screen.getAllByText("30d")).toHaveLength(2);
    expect(screen.getAllByText("90d")).toHaveLength(2);
    expect(screen.getAllByText("All time")).toHaveLength(2);
    expect(screen.getAllByText("Custom")).toHaveLength(2);
    expect(screen.queryByText("14d")).toBeNull();
    // ONE all-time query behind every section (#900): selections are
    // client-side narrowings, so no selection state appears in the fetch — the
    // screen and the map share the heatmap's fixed-epoch cache entry.
    expect(mockUseMoodScorePoints).toHaveBeenCalledWith("user-1", "1970-01-01T00:00:00.000Z");
  });

  /**
   * The distribution's control outlives the trend's staging: the distribution
   * earns its place at ONE check-in while the trend needs two, so it carries
   * its own control from the start (#880).
   */
  it("shows the distribution with its own range control at one check-in, before the trend", () => {
    mockLogged({ points: 1, count: 1 });
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.getByRole("heading", { name: "Distribution" })).toBeTruthy();
    // One control: the distribution's. One point is a dot, not a direction,
    // so the trend section (and its control) is not mounted — and the map
    // carries no control at all (#899).
    expect(screen.getAllByText("30d")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Mood trend" })).toBeNull();
  });

  /**
   * `listMoodScorePoints` pads its instant window by a whole day at each end,
   * because its bounds filter `logged_at` while points bucket by the civil day
   * captured with them. Every consumer must narrow back by day key. Handing the
   * RAW response to the distribution counted those padded rows, so a check-in
   * on the day just outside the range showed up in one chart and not the other
   * — breaking the single guarantee this ticket exists to make.
   */
  it("counts only the selected range, not the day the query pads either side", () => {
    mockUseMoodLogCount.mockReturnValue({
      data: 9,
    } as unknown as ReturnType<typeof useMoodLogCount>);
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);
    // Two in-window days, plus one the pad drags in from just outside 7d.
    mockUseMoodScorePoints.mockReturnValue({
      data: [
        { dayKey: dayKeyDaysAgo(0), moodScore: 5 },
        { dayKey: dayKeyDaysAgo(6), moodScore: 5 },
        { dayKey: dayKeyDaysAgo(7), moodScore: 1 },
      ],
    } as unknown as ReturnType<typeof useMoodScorePoints>);

    renderWithProviders(<MoodTrackerScreen />);
    // Controls render in section order — trend, then distribution — so [1] is
    // the distribution's own 7d segment.
    fireEvent.press(screen.getAllByText("7d")[1]);

    // Two "Great" check-ins in range; the out-of-range "Awful" is not counted —
    // it shows only as a zero legend entry, never a bar segment (#881).
    expect(screen.getByLabelText("Great: 2 check-ins")).toBeTruthy();
    expect(screen.getByText("Awful · 0")).toBeTruthy();
  });

  /**
   * The selections are INDEPENDENT (#880): narrowing the distribution must not
   * narrow the trend. Since #900 both are client-side narrowings of the one
   * all-time fetch, so the query cannot move either — independence shows in
   * what each section renders.
   */
  it("keeps the trend window when the distribution is narrowed to 7d", () => {
    mockUseMoodLogCount.mockReturnValue({
      data: 9,
    } as unknown as ReturnType<typeof useMoodLogCount>);
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);
    mockUseMoodScorePoints.mockReturnValue({
      data: [
        { dayKey: dayKeyDaysAgo(0), moodScore: 5 },
        { dayKey: dayKeyDaysAgo(10), moodScore: 1 },
      ],
    } as unknown as ReturnType<typeof useMoodScorePoints>);

    renderWithProviders(<MoodTrackerScreen />);
    fireEvent.press(screen.getAllByText("7d")[1]);

    // The distribution dropped the 10-day-old "Awful"…
    expect(screen.getByText("Awful · 0")).toBeTruthy();
    expect(screen.getByLabelText("Great: 1 check-in")).toBeTruthy();
    // …and no selection reaches the fetch: the all-time query is the only
    // window ever asked for (#900 replaced #880's union-of-selections).
    expect(mockUseMoodScorePoints).toHaveBeenCalledWith("user-1", "1970-01-01T00:00:00.000Z");
    expect(mockUseMoodScorePoints).not.toHaveBeenCalledWith(
      "user-1",
      startOfDayDaysAgo(7).toISOString(),
      undefined,
    );
  });

  /**
   * Presets are viewports, not fetch windows (#900): changing one re-frames
   * the chart over data the screen already holds. A selection that narrowed
   * the query would refetch on every tap and pan into nothing.
   */
  it("never moves the score-points window when a range is chosen", () => {
    mockLogged();
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);
    mockUseFirstMoodLogDate.mockReturnValue({
      data: "2026-01-15",
    } as unknown as ReturnType<typeof useFirstMoodDayKey>);

    renderWithProviders(<MoodTrackerScreen />);
    fireEvent.press(screen.getAllByText("90d")[0]);
    fireEvent.press(screen.getAllByText("All time")[0]);

    // Every call — trend, distribution, and the map's own — carries the fixed
    // epoch; neither the 90d preset nor All time's first-entry key appears.
    for (const call of mockUseMoodScorePoints.mock.calls) {
      expect(call[1]).toBe("1970-01-01T00:00:00.000Z");
    }
    expect(mockUseMoodScorePoints).not.toHaveBeenCalledWith(
      "user-1",
      startOfDayDaysAgo(90).toISOString(),
      undefined,
    );
    expect(mockUseMoodScorePoints).not.toHaveBeenCalledWith(
      "user-1",
      "2026-01-15T00:00:00.000Z",
      undefined,
    );
  });

  /**
   * The preset viewport pans (#900): with history older than the 30d default,
   * the trend renders inside a horizontal scroller anchored at the newest
   * edge. All time fits the whole span instead — nothing left to pan — so the
   * scroller goes away. (The mood map's scroller is a plain ScrollView without
   * this testID, so the query is unambiguous.)
   */
  it("pans the trend under a preset when history outgrows it, and fits it under All time", () => {
    mockUseMoodLogCount.mockReturnValue({
      data: 9,
    } as unknown as ReturnType<typeof useMoodLogCount>);
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);
    mockUseMoodScorePoints.mockReturnValue({
      data: [
        { dayKey: dayKeyDaysAgo(0), moodScore: 5 },
        { dayKey: dayKeyDaysAgo(120), moodScore: 1 },
      ],
    } as unknown as ReturnType<typeof useMoodScorePoints>);
    mockUseFirstMoodLogDate.mockReturnValue({
      data: dayKeyDaysAgo(120),
    } as unknown as ReturnType<typeof useFirstMoodDayKey>);

    renderWithProviders(<MoodTrackerScreen />);

    // 120 days of history against a 30-day viewport: the chart pans.
    expect(screen.getByTestId("line-chart-scroller")).toBeTruthy();

    fireEvent.press(screen.getAllByText("All time")[0]);
    expect(screen.queryByTestId("line-chart-scroller")).toBeNull();
  });

  it("fits the trend to the viewport while history is shorter than the preset", () => {
    // Two points inside the default 30 days: the same trailing window as
    // before #900, nothing to pan.
    mockLogged();
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.getByRole("heading", { name: "Mood trend" })).toBeTruthy();
    expect(screen.queryByTestId("line-chart-scroller")).toBeNull();
  });

  it("renders the Mood map section below the trend", () => {
    mockLogged();
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    // Renamed from "All time" (#884): the design's section is MOOD MAP, and
    // the rename dissolves the title/segment collision the range control the
    // map briefly carried (#880, reverted by #899) would otherwise create.
    expect(screen.getByRole("heading", { name: "Mood map" })).toBeTruthy();
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
    fireEvent.press(screen.getAllByText("Custom")[0]);
    expect(screen.getByText("Done")).toBeTruthy();
  });
});

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

  it("renders the empty states and a pending Today card when there are no mood logs", () => {
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    // Field header renders the title as the h1 heading over the hue gradient.
    expect(screen.getByRole("heading", { name: "Check-in" })).toBeTruthy();
    expect(screen.getByText("How are you feeling right now?")).toBeTruthy();
    expect(screen.getByLabelText("Awful")).toBeTruthy();
    expect(screen.getByText("Log a mood to start your trend.")).toBeTruthy();
    expect(screen.getByText("Your check-ins will appear here.")).toBeTruthy();
    // WeekHero: section heading, null average placeholder (appears in both stats row and hero),
    // delta copy when there is no prior-week data, sub-section labels, empty emotion state
    expect(screen.getByRole("heading", { name: "This week" })).toBeTruthy();
    expect(screen.getAllByText("-")).toHaveLength(2); // stats row 7-day avg + WeekHero big number
    expect(screen.getByText("first week of data")).toBeTruthy();
    expect(screen.getByText("Mood by day")).toBeTruthy();
    expect(screen.getByText("No emotions tagged yet")).toBeTruthy();
    // A loaded, empty history may claim the never state.
    expect(screen.getByText("No check-ins yet")).toBeTruthy();
  });

  it("omits the subline until the history query has actually loaded", () => {
    // `data === undefined` means still loading, or a failed fetch with no cache -
    // claiming "no check-ins" there would erase a returning user's real history.
    mockUseMoodLogs.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.queryByText("No check-ins yet")).toBeNull();
    expect(screen.queryByText(/^Last · /)).toBeNull();
  });

  it("renders the completed Today card with score when a single entry was logged today", () => {
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
    // WeekHero: top emotion pill AND history entry card both reference Anxious
    expect(screen.getAllByText(/Anxious/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Felt steadier after a walk")).toBeTruthy();
    // History section: entry grouped under "Today" with its group average
    expect(screen.getByRole("heading", { name: "History" })).toBeTruthy();
    expect(screen.getByText("avg 4.0")).toBeTruthy();
  });

  it("shows the average and count when multiple entries were logged today", () => {
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
    // History section groups both entries under "Today" with the group average (avg of 4 and 2)
    expect(screen.getByRole("heading", { name: "History" })).toBeTruthy();
    expect(screen.getByText("avg 3.0")).toBeTruthy();
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

  it("offers 7d/30d/90d/Custom trend ranges, defaulting to a 30-day window (no 14d)", () => {
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

  it("renders the all-time heatmap section below the trend with its empty state", () => {
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.getByRole("heading", { name: "All time" })).toBeTruthy();
    expect(screen.getByText("Log a mood to start your map.")).toBeTruthy();
  });

  it("opens the range picker when Custom is tapped", () => {
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodHistory>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.queryByText("Done")).toBeNull();
    fireEvent.press(screen.getByText("Custom"));
    expect(screen.getByText("Done")).toBeTruthy();
  });
});

import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import MoodTrackerScreen from "@/src/features/mood/mood-tracker-screen";
import { useMoodLogs } from "@/src/features/mood/queries";
import { currentDateKey } from "@/src/stores/selected-date-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
  },
  usePathname: () => "/tools/mood-tracker",
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
  useMoodLogs: jest.fn(),
}));

const mockUseMoodLogs = useMoodLogs as jest.MockedFunction<typeof useMoodLogs>;
const mockRouter = jest.mocked(router);

describe("MoodTrackerScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the empty states and a pending Today card when there are no mood logs", () => {
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodLogs>);

    renderWithProviders(<MoodTrackerScreen />);

    // Hero renders title in chip + heading; use heading role for uniqueness.
    expect(screen.getByRole("heading", { name: "Check-in" })).toBeTruthy();
    expect(screen.getByText("How are you feeling right now?")).toBeTruthy();
    expect(screen.getByLabelText("Awful")).toBeTruthy();
    expect(screen.getByText("Log a mood to start your 14-day trend.")).toBeTruthy();
    expect(
      screen.getByText('Nothing logged yet. Tap "Log mood" to add your first entry.'),
    ).toBeTruthy();
    expect(screen.getAllByText("No logs in this window")).toHaveLength(2);
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
          createdAt: loggedAt,
        },
      ],
    } as unknown as ReturnType<typeof useMoodLogs>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.getByText("Logged · 4/5")).toBeTruthy();
    expect(screen.getByText("Log another")).toBeTruthy();
    expect(screen.getAllByText("Avg 4")).toHaveLength(2);
    expect(screen.getAllByText("1 log")).toHaveLength(2); // 2 summary tiles (hero meta removed)
    expect(screen.getByText("Felt steadier after a walk")).toBeTruthy();
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
          createdAt: morning,
        },
      ],
    } as unknown as ReturnType<typeof useMoodLogs>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.getByText("2 logs · avg 3/5")).toBeTruthy();
    expect(screen.getByText("Log another")).toBeTruthy();
  });

  it("renders score labels on the home check-in tiles via MoodScale", async () => {
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodLogs>);

    renderWithProviders(<MoodTrackerScreen />);

    expect((await screen.findAllByText("OK")).length).toBeGreaterThan(0);
  });

  it("routes to the new mood entry page when the CTA is pressed", () => {
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodLogs>);

    renderWithProviders(<MoodTrackerScreen />);

    fireEvent.press(screen.getByLabelText("OK"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/mood-tracker/new?score=3");
  });
});

import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import MoodTrackerScreen from "@/src/features/mood/mood-tracker-screen";
import { useMoodLogs } from "@/src/features/mood/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
  usePathname: () => "/tools/mood-tracker",
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

    expect(screen.getByText("Mood tracker")).toBeTruthy();
    expect(screen.getByText("No mood logged yet today.")).toBeTruthy();
    expect(screen.getByText("Log mood")).toBeTruthy();
    expect(screen.getByText("Log a mood to start your 14-day trend.")).toBeTruthy();
    expect(
      screen.getByText('Nothing logged yet. Tap "Log mood" to add your first entry.'),
    ).toBeTruthy();
    expect(screen.getAllByText("No logs in this window")).toHaveLength(2);
  });

  it("renders the completed Today card with score when a single entry was logged today", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    mockUseMoodLogs.mockReturnValue({
      data: [
        {
          id: "log-1",
          userId: "user-1",
          moodScore: 4,
          emotions: ["Anxious"],
          notes: "Felt steadier after a walk",
          linkedStrategy: null,
          loggedAt: today.toISOString(),
          createdAt: today.toISOString(),
        },
      ],
    } as unknown as ReturnType<typeof useMoodLogs>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.getByText("Logged today · 4")).toBeTruthy();
    expect(screen.getByText("Log another")).toBeTruthy();
    expect(screen.getAllByText("Avg 4")).toHaveLength(2);
    expect(screen.getAllByText("1 log")).toHaveLength(2);
    expect(screen.getByText("Felt steadier after a walk")).toBeTruthy();
  });

  it("shows the average and count when multiple entries were logged today", () => {
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    const later = new Date(today);
    later.setHours(18, 0, 0, 0);
    mockUseMoodLogs.mockReturnValue({
      data: [
        {
          id: "log-2",
          userId: "user-1",
          moodScore: 4,
          emotions: [],
          notes: "",
          linkedStrategy: null,
          loggedAt: later.toISOString(),
          createdAt: later.toISOString(),
        },
        {
          id: "log-1",
          userId: "user-1",
          moodScore: 2,
          emotions: [],
          notes: "",
          linkedStrategy: null,
          loggedAt: today.toISOString(),
          createdAt: today.toISOString(),
        },
      ],
    } as unknown as ReturnType<typeof useMoodLogs>);

    renderWithProviders(<MoodTrackerScreen />);

    expect(screen.getByText("2 logs today · avg 3")).toBeTruthy();
    expect(screen.getByText("Log another")).toBeTruthy();
  });

  it("routes to the new mood entry page when the CTA is pressed", () => {
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodLogs>);

    renderWithProviders(<MoodTrackerScreen />);

    fireEvent.press(screen.getByText("Log mood"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/mood-tracker/new");
  });
});

import { screen } from "@testing-library/react-native";

import ProgressScreen from "@/src/features/progress/progress-screen";
import { useMoodScorePoints } from "@/src/features/mood/queries";
import { startOfDayDaysAgo } from "@/src/utils/date";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/mood/queries", () => ({
  useMoodScorePoints: jest.fn(),
}));

const mockUseMoodScorePoints = useMoodScorePoints as jest.MockedFunction<typeof useMoodScorePoints>;

describe("ProgressScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the mood trend from a fixed 30-day score-points window with no range controls", () => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    mockUseMoodScorePoints.mockReturnValue({
      data: [
        {
          loggedAt: noon.toISOString(),
          loggedOffsetMinutes: null,
          dayKey: entryDayKey(noon.toISOString(), null),
          moodScore: 4,
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useMoodScorePoints>);

    renderWithProviders(<ProgressScreen />);

    expect(mockUseMoodScorePoints).toHaveBeenCalledWith(
      "user-1",
      startOfDayDaysAgo(30).toISOString(),
    );
    // Fixed window: no range tabs on this screen.
    expect(screen.queryByText("7d")).toBeNull();
    expect(screen.queryByText("30d")).toBeNull();
    expect(screen.queryByText("90d")).toBeNull();
    expect(screen.queryByText("Custom")).toBeNull();
    expect(screen.queryByText("Log a mood to start your trend.")).toBeNull();
  });

  it("shows the empty state when the window has no points", () => {
    mockUseMoodScorePoints.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useMoodScorePoints>);

    renderWithProviders(<ProgressScreen />);

    expect(screen.getByText("Log a mood to start your trend.")).toBeTruthy();
  });
});

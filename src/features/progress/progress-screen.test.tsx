import { fireEvent, screen } from "@testing-library/react-native";
import { ScrollView } from "react-native";
import { Svg } from "react-native-svg";

import ProgressScreen from "@/src/features/progress/progress-screen";
import { useMoodScorePoints } from "@/src/features/mood/queries";
import { startOfDayDaysAgo } from "@/src/utils/date";
import { HOME_COLUMN } from "@/src/lib/layout";
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

  it("sizes the chart to the card's measured content box, not the window", () => {
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

    fireEvent(screen.getByTestId("mood-trend-layout"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 294, height: 160 } },
    });

    const chartSvg = screen.UNSAFE_getByType(Svg);
    expect(chartSvg.props.width).toBe(294);
  });

  it("pins one reflection prompt - the same question on every weekday (#1665)", () => {
    mockUseMoodScorePoints.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useMoodScorePoints>);

    // A Sunday and a Wednesday: the retired weekday-modulo pick rendered a
    // different question on each (#1665) - content that changes daily on a rule
    // the user cannot see is a schedule, not a library. The Sunday case is the
    // one that went red against the old code (index 0 was a different string);
    // the retired strings are gone from every locale, so there is nothing to
    // assert absent.
    for (const now of ["2026-09-06T12:00:00", "2026-09-09T12:00:00"]) {
      jest.useFakeTimers({ now: new Date(now) });
      try {
        const view = renderWithProviders(<ProgressScreen />);

        expect(
          screen.getByText("What is one thing you noticed about your mood or energy?"),
        ).toBeTruthy();

        view.unmount();
      } finally {
        jest.useRealTimers();
      }
    }
  });

  it("shows the empty state when the window has no points", () => {
    mockUseMoodScorePoints.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useMoodScorePoints>);

    renderWithProviders(<ProgressScreen />);

    expect(screen.getByText("Log a mood to start your trend.")).toBeTruthy();
  });

  /**
   * #1721: `/progress` ran edge-to-edge on a wide browser while Settings and
   * Notifications sat in a 672px column. The column is `HOME_COLUMN` on the
   * PADDED scroll box, the way `/support` applies it - 720 outer minus the
   * `p-6` gutters is the 672 the siblings show. Jest does not run NativeWind's
   * compiler, so the class prop is asserted as tokens (className never becomes
   * style here); the padding is pinned on the SAME element because a column
   * placed inside the gutters would read 720, not 672.
   */
  it("takes the 672px content column of Settings and Notifications (#1721)", () => {
    mockUseMoodScorePoints.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useMoodScorePoints>);

    renderWithProviders(<ProgressScreen />);

    const tokens = String(
      screen.UNSAFE_getByType(ScrollView).props.contentContainerClassName,
    ).split(/\s+/);

    for (const token of HOME_COLUMN.split(/\s+/)) {
      expect(tokens).toContain(token);
    }
    expect(tokens).toContain("p-6");
  });
});

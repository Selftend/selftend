import { fireEvent, screen } from "@testing-library/react-native";

import { MoodHeatmap } from "@/src/features/mood/mood-heatmap";
import { useMoodScorePoints } from "@/src/features/mood/queries";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/features/mood/queries", () => ({
  useMoodScorePoints: jest.fn(),
}));

const mockUseMoodScorePoints = useMoodScorePoints as jest.MockedFunction<typeof useMoodScorePoints>;

function isoDaysAgo(daysAgo: number, hour = 12) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function mockPoints(points: { loggedAt: string; moodScore: number }[]) {
  mockUseMoodScorePoints.mockReturnValue({
    // No captured offset: the day key falls back to the viewer's local day, which
    // is the frame `isoDaysAgo` builds these timestamps in.
    data: points.map((p) => ({
      ...p,
      loggedOffsetMinutes: null,
      dayKey: entryDayKey(p.loggedAt, null),
    })),
  } as unknown as ReturnType<typeof useMoodScorePoints>);
}

describe("MoodHeatmap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches score points over all time", () => {
    mockPoints([]);
    renderWithProviders(<MoodHeatmap userId="user-1" />);
    expect(mockUseMoodScorePoints).toHaveBeenCalledWith("user-1", "1970-01-01T00:00:00.000Z");
  });

  it("shows a quiet empty message before the first entry", () => {
    mockPoints([]);
    renderWithProviders(<MoodHeatmap userId="user-1" />);
    expect(screen.getByText("Log a mood to start your map.")).toBeTruthy();
  });

  it("renders an always-visible legend with the five scale words", () => {
    mockPoints([{ loggedAt: isoDaysAgo(0), moodScore: 3 }]);
    renderWithProviders(<MoodHeatmap userId="user-1" />);

    expect(screen.getByText("Awful")).toBeTruthy();
    expect(screen.getByText("Bad")).toBeTruthy();
    expect(screen.getByText("Okay")).toBeTruthy();
    expect(screen.getByText("Good")).toBeTruthy();
    expect(screen.getByText("Great")).toBeTruthy();
  });

  it("labels cells with date + score word, and no-entry days as such", () => {
    mockPoints([
      { loggedAt: isoDaysAgo(2), moodScore: 4 },
      { loggedAt: isoDaysAgo(0), moodScore: 1 },
    ]);
    renderWithProviders(<MoodHeatmap userId="user-1" />);

    expect(screen.getByLabelText(/: Good$/)).toBeTruthy();
    expect(screen.getByLabelText(/: Awful$/)).toBeTruthy();
    expect(screen.getByLabelText(/: no entry$/)).toBeTruthy(); // the day between the two entries
  });

  it("tapping a cell shows a read-only callout with date, face, and score word; tapping again dismisses", () => {
    mockPoints([{ loggedAt: isoDaysAgo(0), moodScore: 4 }]);
    renderWithProviders(<MoodHeatmap userId="user-1" />);

    expect(screen.queryByText(/🙂 · Good/)).toBeNull();
    fireEvent.press(screen.getByLabelText(/: Good$/));
    // Callout: "<date> · 🙂 · Good" in one line, read-only.
    expect(screen.getByText(/· 🙂 · Good$/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/: Good$/));
    expect(screen.queryByText(/🙂 · Good/)).toBeNull();
  });
});

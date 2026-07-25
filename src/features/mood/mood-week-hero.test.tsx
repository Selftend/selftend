import { screen } from "@testing-library/react-native";

import { WeekHero } from "@/src/features/mood/mood-week-hero";
import type { DayAverage } from "@/src/features/mood/summaries";
import { localDateKey } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/mood/emotion-preferences-queries", () => ({
  useEmotionPreferences: () => ({ data: [] }),
}));

function dateKeyDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return localDateKey(d);
}

/** Oldest→newest, today last — the shape getDailyAverages produces. */
function weekOf(averages: (number | null)[]): DayAverage[] {
  return averages.map((average, i) => ({
    dateKey: dateKeyDaysAgo(averages.length - 1 - i),
    average,
  }));
}

const NO_DELTA = { current: null, previous: null, delta: null };

describe("WeekHero week strip", () => {
  it("renders a face per logged day, rounding the day average to the nearest score", () => {
    // 1→😭, 2.4→🙁, 3→😐, 3.6→😊, 4.9→😁 — all five faces via the shared emoji map
    renderWithProviders(
      <WeekHero
        delta={NO_DELTA}
        byDay={weekOf([null, 1, 2.4, 3, 3.6, null, 4.9])}
        topEmotions={[]}
      />,
    );

    expect(screen.getByText("😭")).toBeTruthy();
    expect(screen.getByText("🙁")).toBeTruthy();
    expect(screen.getByText("😐")).toBeTruthy();
    expect(screen.getByText("😊")).toBeTruthy();
    expect(screen.getByText("😁")).toBeTruthy();
  });

  it("renders a hollow neutral dot for each day without an entry", () => {
    renderWithProviders(
      <WeekHero
        delta={NO_DELTA}
        byDay={weekOf([null, 1, 2.4, 3, 3.6, null, 4.9])}
        topEmotions={[]}
      />,
    );

    expect(screen.getAllByTestId("week-strip-empty-dot")).toHaveLength(2);
  });

  it("labels every cell with the day plus the scale word, or a no-entry message", () => {
    renderWithProviders(
      <WeekHero
        delta={NO_DELTA}
        byDay={weekOf([null, 1, 2.4, 3, 3.6, null, 4.9])}
        topEmotions={[]}
      />,
    );

    // Scale words come from checkin.scaleLabels; day names vary with the run date,
    // so match on the score-word suffix rather than a hardcoded weekday.
    expect(screen.getByLabelText(/: Awful$/)).toBeTruthy();
    expect(screen.getByLabelText(/: Low$/)).toBeTruthy();
    expect(screen.getByLabelText(/: OK$/)).toBeTruthy();
    expect(screen.getByLabelText(/: Good$/)).toBeTruthy();
    expect(screen.getByLabelText(/: Great$/)).toBeTruthy();
    expect(screen.getAllByLabelText(/: no entry$/)).toHaveLength(2);
  });

  it("is a passive glance view: no pressable cells", () => {
    renderWithProviders(
      <WeekHero
        delta={NO_DELTA}
        byDay={weekOf([null, 1, 2.4, 3, 3.6, null, 4.9])}
        topEmotions={[]}
      />,
    );

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("emphasizes only today's cell", () => {
    renderWithProviders(
      <WeekHero delta={NO_DELTA} byDay={weekOf([3, 3, 3, 3, 3, 3, 4])} topEmotions={[]} />,
    );

    // Today is the last cell; its emphasized wrapper carries the today testID.
    expect(screen.getAllByTestId("week-strip-today")).toHaveLength(1);
  });

  it("keeps the average, delta, and felt-most sections intact around the strip", () => {
    renderWithProviders(
      <WeekHero
        delta={{ current: 3.4, previous: 3.0, delta: 0.4 }}
        byDay={weekOf([3, 3, 3, 3, 3, 3, 4])}
        topEmotions={[]}
      />,
    );

    expect(screen.getByText("3.4")).toBeTruthy();
    expect(screen.getByText("▲ 0.4 vs last week")).toBeTruthy();
    expect(screen.getByText("Mood by day")).toBeTruthy();
    expect(screen.getByText("No emotions tagged yet")).toBeTruthy();
  });
});

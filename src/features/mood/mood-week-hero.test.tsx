import { fireEvent, screen } from "@testing-library/react-native";

import { formatWeekLabel, WeekHero, WeekNavigator } from "@/src/features/mood/mood-week-hero";
import type { MoodLog } from "@/src/features/mood/types";
import { buildWeekDays, weekWindowForOffset } from "@/src/features/mood/week-window";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/mood/emotion-preferences-queries", () => ({
  useEmotionPreferences: () => ({ data: [] }),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

// A Wednesday: the displayed week has past days, today, and days still to come.
const WEDNESDAY = new Date(2026, 7, 5, 12, 0, 0, 0); // 2026-08-05
const WINDOW = weekWindowForOffset(0, WEDNESDAY);
const NO_DELTA = { current: null, previous: null, delta: null };

function log(partial: Partial<MoodLog> & { dayKey: string; moodScore: number }): MoodLog {
  return {
    id: `${partial.dayKey}-${partial.moodScore}`,
    userId: "user-1",
    emotions: [],
    notes: "",
    linkedStrategy: null,
    loggedAt: `${partial.dayKey}T09:00:00.000Z`,
    loggedOffsetMinutes: 0,
    createdAt: `${partial.dayKey}T09:00:00.000Z`,
    situation: "",
    thoughts: "",
    behaviours: "",
    bodilySensations: "",
    ...partial,
  };
}

/** Mon–Wed of the displayed week; Thu–Sun have not happened yet. */
const WEEK_LOGS = [
  log({ dayKey: "2026-08-03", moodScore: 1 }),
  log({ dayKey: "2026-08-05", moodScore: 5 }),
];

function renderHero(logs: MoodLog[] = WEEK_LOGS, window = WINDOW) {
  return renderWithProviders(
    <WeekHero
      window={window}
      days={buildWeekDays(logs, window, WEDNESDAY)}
      delta={NO_DELTA}
      topEmotions={[]}
      logs={logs}
    />,
  );
}

beforeEach(() => {
  mockPush.mockClear();
});

describe("WeekHero week strip", () => {
  it("renders a face per logged day, rounding the day average to the nearest score", () => {
    const logs = [
      log({ dayKey: "2026-08-03", moodScore: 1 }),
      log({ dayKey: "2026-08-04", moodScore: 3 }),
      log({ dayKey: "2026-08-05", moodScore: 5 }),
    ];
    renderHero(logs);

    expect(screen.getByText("😭")).toBeTruthy();
    expect(screen.getByText("😐")).toBeTruthy();
    expect(screen.getByText("😁")).toBeTruthy();
  });

  it("renders a hollow neutral dot for a past day without an entry", () => {
    renderHero();

    // Tuesday alone: Monday and Wednesday are logged, Thursday onward is future.
    expect(screen.getAllByTestId("week-strip-empty-dot")).toHaveLength(1);
  });

  /**
   * Calendar weeks introduce days trailing-7 never had. Four hollow dots for
   * Thu–Sun would show a user four "missed" days they have not lived yet, which
   * is the exact shape the no-shame rule forbids - so they render as nothing at
   * all: no dot, no label, nothing in the accessibility tree.
   */
  it("renders days that have not happened yet as nothing", () => {
    renderHero();

    expect(screen.getAllByTestId("week-strip-future")).toHaveLength(4);
    // Three cells have happened; only they are announced.
    expect(screen.getAllByLabelText(/^(Monday|Tuesday|Wednesday):/)).toHaveLength(3);
    expect(screen.queryAllByLabelText(/^(Thursday|Friday|Saturday|Sunday):/)).toHaveLength(0);
  });

  it("labels each elapsed cell with the day plus the scale word, or a no-entry message", () => {
    renderHero();

    expect(screen.getByLabelText(/: Awful$/)).toBeTruthy();
    expect(screen.getByLabelText(/: Great$/)).toBeTruthy();
    expect(screen.getAllByLabelText(/: no entry$/)).toHaveLength(1);
  });

  /**
   * INVERTED by #736. The strip used to be a passive glance view and this test
   * asserted `queryAllByRole("button")` was empty. The block is now the ONLY
   * recency view on the overview (#735 removed the inline history list), so a
   * day with entries has to open. Fails on the old behaviour, which rendered
   * every cell as a plain View.
   *
   * Two outcomes, not the design's three: an empty day is not interactive AT
   * ALL rather than a dead tap, because a press that silently does nothing
   * reads as a rebuke on precisely the days that must never carry one.
   */
  it("makes days with entries pressable and leaves empty days inert", () => {
    renderHero();

    // Monday and Wednesday are logged; Tuesday is empty; Thu-Sun are future.
    // The trailing "Show all history" link is a link, not a button.
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByLabelText(/^Tuesday: no entry$/).props.accessibilityRole).toBe("image");
  });

  it("emphasizes only today's cell", () => {
    renderHero();

    expect(screen.getAllByTestId("week-strip-today")).toHaveLength(1);
  });
});

describe("WeekHero day panel", () => {
  it("opens on a day with entries and lists that day's check-ins", () => {
    const logs = [
      log({ dayKey: "2026-08-03", moodScore: 1, notes: "monday note" }),
      log({
        dayKey: "2026-08-05",
        moodScore: 5,
        id: "wed-morning",
        notes: "wednesday note",
        loggedAt: "2026-08-05T09:00:00.000Z",
      }),
      log({
        dayKey: "2026-08-05",
        moodScore: 3,
        id: "wed-evening",
        notes: "later on",
        loggedAt: "2026-08-05T19:00:00.000Z",
      }),
    ];
    renderHero(logs);

    expect(screen.queryByTestId("week-day-panel")).toBeNull();
    // Two entries that day, 5 and 3, so the cell reads the rounded mean.
    fireEvent.press(screen.getByLabelText(/^Wednesday: Good$/));

    expect(screen.getByTestId("week-day-panel")).toBeTruthy();
    expect(screen.getByText("wednesday note")).toBeTruthy();
    expect(screen.getByText("later on")).toBeTruthy();
    // Only the tapped day - Monday's entry stays out of the panel.
    expect(screen.queryByText("monday note")).toBeNull();
  });

  // A single entry opens the panel too. The design navigated straight to the
  // detail screen at one entry, which made one affordance mean two things.
  it("opens for a single-entry day rather than navigating away", () => {
    renderHero();

    fireEvent.press(screen.getByLabelText(/^Monday: Awful$/));

    expect(screen.getByTestId("week-day-panel")).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("closes when the same day is tapped again", () => {
    renderHero();

    const monday = screen.getByLabelText(/^Monday: Awful$/);
    fireEvent.press(monday);
    expect(screen.getByTestId("week-day-panel")).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/^Monday: Awful$/));
    expect(screen.queryByTestId("week-day-panel")).toBeNull();
  });

  it("announces the open state on the cell", () => {
    renderHero();

    // `aria-expanded`, not `accessibilityState` - react-native-web drops the
    // latter, so the eslint gate forbids it and a test asserting on it would
    // pass while the web build announced nothing. Queried by prop because RN
    // normalizes `aria-*` away before it reaches the host node.
    expect(screen.UNSAFE_queryAllByProps({ "aria-expanded": true })).toHaveLength(0);
    fireEvent.press(screen.getByLabelText(/^Monday: Awful$/));
    expect(screen.UNSAFE_queryAllByProps({ "aria-expanded": true })).toHaveLength(1);
  });

  // Paging away has to close it: the day belongs to the week you just left, and
  // leaving the panel open would caption the new strip with the old week's rows.
  it("closes when the displayed week changes", () => {
    const { rerender } = renderHero();

    fireEvent.press(screen.getByLabelText(/^Monday: Awful$/));
    expect(screen.getByTestId("week-day-panel")).toBeTruthy();

    const previous = weekWindowForOffset(-1, WEDNESDAY);
    rerender(
      <WeekHero
        window={previous}
        days={buildWeekDays([], previous, WEDNESDAY)}
        delta={NO_DELTA}
        topEmotions={[]}
        logs={[]}
      />,
    );

    expect(screen.queryByTestId("week-day-panel")).toBeNull();
  });

  it("navigates to the entry from a panel row", () => {
    renderHero();

    fireEvent.press(screen.getByLabelText(/^Monday: Awful$/));
    fireEvent.press(screen.getByLabelText(/^View Awful check-in from /));

    expect(mockPush).toHaveBeenCalledWith("/tools/check-in/2026-08-03-1");
  });
});

describe("WeekHero summary", () => {
  it("keeps the average, delta, and felt-most sections around the strip", () => {
    renderWithProviders(
      <WeekHero
        window={WINDOW}
        days={buildWeekDays(WEEK_LOGS, WINDOW, WEDNESDAY)}
        delta={{ current: 3.4, previous: 3.0, delta: 0.4 }}
        topEmotions={[]}
        logs={WEEK_LOGS}
      />,
    );

    expect(screen.getByText("3.4")).toBeTruthy();
    expect(screen.getByText("▲ 0.4 vs last week")).toBeTruthy();
    expect(screen.getByText("Mood by day")).toBeTruthy();
    expect(screen.getByText("No emotions tagged yet")).toBeTruthy();
    // The number is the displayed calendar week's mean now, not a trailing 7 days.
    expect(screen.getByText("Week average")).toBeTruthy();
  });

  // INVERTED by #588. The rising delta was `text-act-ink` - ACT's green, on a
  // mood card, purely so that up and down read differently. The split is what
  // matters and it survives: falling still takes `destructive`, rising now takes
  // the neutral foreground.
  it("paints a rising delta with no module hue, keeping the up/down split", () => {
    renderWithProviders(
      <WeekHero
        window={WINDOW}
        days={buildWeekDays(WEEK_LOGS, WINDOW, WEDNESDAY)}
        delta={{ current: 3.4, previous: 3.0, delta: 0.4 }}
        topEmotions={[]}
        logs={WEEK_LOGS}
      />,
    );

    const tokens = String(screen.getByText("▲ 0.4 vs last week").props.className).split(/\s+/);
    expect(tokens).toContain("text-foreground");
    // Token-wise, not substring-wise: "text-act-ink" contains "text-act".
    expect(tokens).not.toContain("text-act-ink");
    expect(tokens).not.toContain("text-act");
  });

  it("leaves a falling delta on the destructive token, which already clears AA", () => {
    renderWithProviders(
      <WeekHero
        window={WINDOW}
        days={buildWeekDays(WEEK_LOGS, WINDOW, WEDNESDAY)}
        delta={{ current: 3.0, previous: 3.4, delta: -0.4 }}
        topEmotions={[]}
        logs={WEEK_LOGS}
      />,
    );

    // 5.10:1 on the same surface, so the up arm moving to ink is not a reason to
    // touch this one - the pair was asymmetric, only the green was below AA.
    const className = String(screen.getByText("▼ 0.4 vs last week").props.className);
    expect(className.split(/\s+/)).toContain("text-destructive");
  });

  it("keeps the all-history link inside the week block", () => {
    renderHero();

    fireEvent.press(screen.getByRole("link"));
    expect(mockPush).toHaveBeenCalledWith("/tools/check-in/history");
  });
});

describe("WeekNavigator", () => {
  it("disables forward navigation on the current week", () => {
    const onNext = jest.fn();
    renderWithProviders(
      <WeekNavigator canGoBack canGoForward={false} onPrevious={jest.fn()} onNext={onNext} />,
    );

    const next = screen.getByTestId("week-nav-next");
    expect(screen.UNSAFE_queryAllByProps({ "aria-disabled": true })).toHaveLength(1);
    fireEvent.press(next);
    expect(onNext).not.toHaveBeenCalled();
  });

  it("disables back navigation at the week of the first entry", () => {
    const onPrevious = jest.fn();
    renderWithProviders(
      <WeekNavigator canGoBack={false} canGoForward onPrevious={onPrevious} onNext={jest.fn()} />,
    );

    fireEvent.press(screen.getByTestId("week-nav-previous"));
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("pages when enabled", () => {
    const onPrevious = jest.fn();
    renderWithProviders(
      <WeekNavigator canGoBack canGoForward onPrevious={onPrevious} onNext={jest.fn()} />,
    );

    fireEvent.press(screen.getByTestId("week-nav-previous"));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });
});

describe("formatWeekLabel", () => {
  const t = ((key: string) => (key === "week.title" ? "This week" : key)) as never;

  it("names the current week rather than dating it", () => {
    expect(formatWeekLabel(WINDOW, t, "en")).toBe("This week");
  });

  // A span, not "2 weeks ago": counting backwards makes the reader do the
  // arithmetic, and the span is what the mood map underneath is labelled with.
  it("dates a past week with its span", () => {
    expect(formatWeekLabel(weekWindowForOffset(-1, WEDNESDAY), t, "en")).toBe("Jul 27 – Aug 2");
  });
});

import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { RightNowTier } from "@/src/features/home/right-now-tier";
import { useMoodSeedStore } from "@/src/stores/mood-seed-store";
import { currentDateKey, addDaysToKey } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({ router: { push: jest.fn() }, usePathname: () => "/" }));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: () => ({
    selectedDate: jest.requireActual("@/src/utils/date").currentDateKey(),
  }),
}));

jest.mock("@/src/features/mood/queries", () => ({ useMoodLogs: jest.fn() }));
jest.mock("@/src/features/sleep/queries", () => ({
  useSleepLogs: jest.fn(),
  useSleepStats: jest.fn(),
}));
jest.mock("@/src/features/habits/queries", () => ({
  useHabits: jest.fn(),
  useHabitLogs: jest.fn(),
}));

const q = <T,>(data: T) => ({ data });
const m = {
  mood: jest.requireMock("@/src/features/mood/queries").useMoodLogs as jest.Mock,
  sleepLogs: jest.requireMock("@/src/features/sleep/queries").useSleepLogs as jest.Mock,
  sleepStats: jest.requireMock("@/src/features/sleep/queries").useSleepStats as jest.Mock,
  habits: jest.requireMock("@/src/features/habits/queries").useHabits as jest.Mock,
  habitLogs: jest.requireMock("@/src/features/habits/queries").useHabitLogs as jest.Mock,
};

const ALL = ["mood-checkin", "sleep-latest", "habits-today"];
const today = currentDateKey();

/** Loaded, and every nudge eligible: no check-in, no sleep since yesterday, a habit open. */
function everythingEligible() {
  m.mood.mockReturnValue(q([]));
  m.sleepLogs.mockReturnValue(q([]));
  m.sleepStats.mockReturnValue(q({ sevenDayDurationMinutes: 432, sevenDayQuality: 3.2 }));
  m.habits.mockReturnValue(
    q([{ id: "h1", name: "Morning walk", archivedAt: null, cadence: "daily", customDays: [] }]),
  );
  m.habitLogs.mockReturnValue(q([]));
}

const render = (widgetIds = ALL) =>
  renderWithProviders(<RightNowTier userId="user-1" widgetIds={widgetIds} />);

beforeEach(() => {
  jest.clearAllMocks();
  useMoodSeedStore.setState({ score: null });
  everythingEligible();
});

describe("the copy bar (#952)", () => {
  // The bar: a nudge may state the record and open a door; it may not name what is owed,
  // count what was missed, or imply lateness. This is the ticket's safety gate, so it is
  // asserted over the WHOLE rendered tier rather than per string.
  it("never counts obligations or calls anything due", () => {
    render();

    const text = screen.UNSAFE_root.findAll((node) => typeof node.props?.children === "string")
      .map((node) => node.props.children as string)
      .join(" | ");

    // Canaries FIRST. Without them this whole assertion is vacuous: if a refactor wraps
    // a Text child, `findAll` returns fewer nodes and every `not.toMatch` below passes
    // against a string that no longer holds the copy it is meant to be policing.
    expect(text).toContain("Right now");
    expect(text).toContain("Today's habits");
    expect(text).toContain("Nothing captured since yesterday");

    expect(text).not.toMatch(/\bdue\b/i);
    expect(text).not.toMatch(/\bowed?\b/i);
    expect(text).not.toMatch(/\bmissed?\b/i);
    expect(text).not.toMatch(/\boverdue\b/i);
    expect(text).not.toMatch(/\blate\b/i);
    expect(text).not.toMatch(/\bshould\b/i);
    expect(text).not.toMatch(/\bstreak\b/i);
    // The drawn "Two habits due" counted obligations; a bare "N habits" would too.
    expect(text).not.toMatch(/\d+\s+habits?\b/i);
  });

  it("names the open habits instead of counting them", () => {
    m.habits.mockReturnValue(
      q([
        { id: "h1", name: "Morning walk", archivedAt: null, cadence: "daily", customDays: [] },
        { id: "h2", name: "Read", archivedAt: null, cadence: "daily", customDays: [] },
      ]),
    );

    render();

    expect(screen.getByTestId("right-now-habits")).toBeTruthy();
    expect(screen.getByText("Morning walk · Read")).toBeTruthy();
  });

  it("states the sleep record without asserting a night boundary", () => {
    render();

    const sleep = screen.getByTestId("right-now-sleep").props.accessibilityLabel as string;
    expect(sleep).toContain("Nothing captured since yesterday");
    // ADR-0002 never invented a night identity, so "last night" would assert a boundary
    // the schema refuses to draw - and a 23:00 entry makes it visibly wrong.
    expect(sleep).not.toMatch(/last night/i);
  });
});

describe("eligibility is derived, never stored", () => {
  it("renders a nudge only for a tool on the dashboard", () => {
    render(["mood-checkin"]);

    expect(screen.getByTestId("right-now-mood")).toBeTruthy();
    expect(screen.queryByTestId("right-now-sleep")).toBeNull();
    expect(screen.queryByTestId("right-now-habits")).toBeNull();
  });

  it("collapses the whole tier, heading included, once the day is satisfied", () => {
    m.mood.mockReturnValue(q([{ dayKey: today, moodScore: 3 }]));
    m.sleepLogs.mockReturnValue(q([{ entryDay: today }]));
    m.habitLogs.mockReturnValue(q([{ habitId: "h1", loggedOn: today }]));

    render();

    expect(screen.queryByTestId("right-now-tier")).toBeNull();
    expect(screen.queryByText("Right now")).toBeNull();
  });

  it("renders nothing at all for an empty dashboard", () => {
    // Zero rows means no eligible nudges, so the empty-home case needs no special case.
    render([]);

    expect(screen.queryByTestId("right-now-tier")).toBeNull();
  });

  it("claims nothing while the data is still loading", () => {
    m.mood.mockReturnValue({ data: undefined });
    m.sleepLogs.mockReturnValue({ data: undefined });
    m.sleepStats.mockReturnValue({ data: undefined });
    m.habits.mockReturnValue({ data: undefined });
    m.habitLogs.mockReturnValue({ data: undefined });

    render();

    expect(screen.queryByTestId("right-now-tier")).toBeNull();
  });
});

describe("the nudges themselves", () => {
  it("hides the mood card once today holds a check-in", () => {
    m.mood.mockReturnValue(q([{ dayKey: today, moodScore: 4 }]));

    render();

    expect(screen.queryByTestId("right-now-mood")).toBeNull();
    // The tier survives on the other two - collapse is all-three, not any-one.
    expect(screen.getByTestId("right-now-tier")).toBeTruthy();
  });

  it("hides the sleep nudge as soon as anything is captured since yesterday", () => {
    m.sleepLogs.mockReturnValue(q([{ entryDay: addDaysToKey(today, -1) }]));

    render();

    expect(screen.queryByTestId("right-now-sleep")).toBeNull();
  });

  it("keeps the sleep nudge when the newest entry is older than yesterday", () => {
    m.sleepLogs.mockReturnValue(q([{ entryDay: addDaysToKey(today, -2) }]));

    render();

    expect(screen.getByTestId("right-now-sleep")).toBeTruthy();
  });

  it("takes the sleep average from the server aggregate, in hours", () => {
    // 432 minutes is 7.2h. From `sleep_stats`, never the capped client list.
    render();

    expect(screen.getByTestId("right-now-sleep").props.accessibilityLabel).toContain("7.2h");
  });

  it("orders sleep before habits, always", () => {
    render();

    const order = ["right-now-mood", "right-now-sleep", "right-now-habits"].filter(
      (id) => screen.queryByTestId(id) !== null,
    );
    const rendered = screen.UNSAFE_root.findAll(
      (node) =>
        typeof node.props?.testID === "string" &&
        ["right-now-mood", "right-now-sleep", "right-now-habits"].includes(node.props.testID),
    ).map((node) => node.props.testID as string);

    expect(order).toHaveLength(3);
    // Deduped: react-test-renderer surfaces both the host and composite node for one
    // element, so the raw sweep double-counts.
    expect([...new Set(rendered)]).toEqual(order);
  });
});

describe("the mood tap", () => {
  it("seeds the score in memory and navigates with no score in the URL", () => {
    // ☠️ The whole point of #961's family: a route param puts a mood score in browser
    // history and in Sentry navigation breadcrumbs.
    render();

    // MoodScale's steps are radios labelled by their word, which is how the mood
    // editor's own suite presses them.
    fireEvent.press(screen.getByLabelText("Okay"));

    expect(useMoodSeedStore.getState().score).toBe(3);
    expect(router.push).toHaveBeenCalledWith("/tools/check-in/new");
    expect(router.push).not.toHaveBeenCalledWith(expect.stringContaining("score="));
  });

  it("cannot write a check-in at all, inline or otherwise", () => {
    // An accidental brush on a scrollable home must not record health data. The
    // enforcement is structural rather than behavioural: this file mocks the mood queries
    // module down to the single READ hook, so a tier that imported a save would fail at
    // module load rather than at assertion time. Asserting the mock's surface is the real
    // check - a `router.push` call count proves nothing about writes.
    expect(Object.keys(jest.requireMock("@/src/features/mood/queries"))).toEqual(["useMoodLogs"]);

    render();
    fireEvent.press(screen.getByLabelText("Awful"));

    // And the tap's only effect is a seed plus a navigation.
    expect(useMoodSeedStore.getState().score).toBe(1);
    expect(router.push).toHaveBeenCalledTimes(1);
  });
});

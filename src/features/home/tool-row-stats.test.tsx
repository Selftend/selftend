import { screen } from "@testing-library/react-native";

import { ToolTierRow } from "@/src/features/home/tool-row-stats";
import { addDaysToKey, currentDateKey } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: () => ({ selectedDate: "2026-05-28" }),
}));

const q = <T,>(data: T) => ({ data });
const loading = { data: undefined };

jest.mock("@/src/features/mood/queries", () => ({
  useMoodWeek: jest.fn(),
  useMoodLogCount: jest.fn(),
}));
jest.mock("@/src/features/journal/queries", () => ({
  useJournalEntryCount: jest.fn(),
  useJournalWordTotal: jest.fn(),
}));
jest.mock("@/src/features/gratitude/queries", () => ({
  useGratitudeEntryCount: jest.fn(),
  useGratitudeEntryCountSinceDayKey: jest.fn(),
}));
jest.mock("@/src/features/breathing/queries", () => ({
  useBreathingSessionCount: jest.fn(),
  useBreathingTotalMinutes: jest.fn(),
}));
jest.mock("@/src/features/grounding/queries", () => ({
  useGroundingSessionCount: jest.fn(),
  useGroundingSessions: jest.fn(),
}));
jest.mock("@/src/features/meditation/queries", () => ({
  useMeditationSessionCount: jest.fn(),
  useMeditationMedianMinutes: jest.fn(),
}));
jest.mock("@/src/features/sleep/queries", () => ({ useSleepStats: jest.fn() }));
jest.mock("@/src/features/habits/queries", () => ({
  useHabits: jest.fn(),
  useHabitLogs: jest.fn(),
}));
jest.mock("@/src/features/routines/use-routines-today", () => ({ useRoutinesToday: jest.fn() }));

jest.mock("@/src/features/cbt/queries", () => ({
  useThoughtRecords: jest.fn(),
  useThoughtRecordCount: jest.fn(),
}));
jest.mock("@/src/features/self-care/queries", () => ({ useSelfCareLogs: jest.fn() }));
jest.mock("@/src/features/worry/queries", () => ({ useWorryEntries: jest.fn() }));
jest.mock("@/src/features/beliefs/queries", () => ({ useCoreBeliefs: jest.fn() }));
jest.mock("@/src/features/activities/queries", () => ({ useActivities: jest.fn() }));
jest.mock("@/src/features/exposure/queries", () => ({ useRecentExposureSessions: jest.fn() }));
jest.mock("@/src/features/goals/queries", () => ({ useGoals: jest.fn() }));
jest.mock("@/src/features/act/queries/connection", () => ({ useConnectionLogs: jest.fn() }));
jest.mock("@/src/features/act/queries/observing-self", () => ({
  useObservingSelfSessions: jest.fn(),
}));
jest.mock("@/src/features/act/queries/choice-points", () => ({ useChoicePoints: jest.fn() }));
jest.mock("@/src/features/act/queries/defusion", () => ({ useDefusionLogs: jest.fn() }));
jest.mock("@/src/features/act/queries/expansion", () => ({ useExpansionLogs: jest.fn() }));
jest.mock("@/src/features/act/queries/committed-action", () => ({
  useCommittedActions: jest.fn(),
}));

const mocks = {
  moodLogs: jest.requireMock("@/src/features/mood/queries").useMoodWeek as jest.Mock,
  moodCount: jest.requireMock("@/src/features/mood/queries").useMoodLogCount as jest.Mock,
  journalEntries: jest.requireMock("@/src/features/journal/queries")
    .useJournalEntryCount as jest.Mock,
  journalWords: jest.requireMock("@/src/features/journal/queries").useJournalWordTotal as jest.Mock,
  gratitudeTotal: jest.requireMock("@/src/features/gratitude/queries")
    .useGratitudeEntryCount as jest.Mock,
  gratitudeWeek: jest.requireMock("@/src/features/gratitude/queries")
    .useGratitudeEntryCountSinceDayKey as jest.Mock,
  breathingCount: jest.requireMock("@/src/features/breathing/queries")
    .useBreathingSessionCount as jest.Mock,
  breathingMinutes: jest.requireMock("@/src/features/breathing/queries")
    .useBreathingTotalMinutes as jest.Mock,
  groundingCount: jest.requireMock("@/src/features/grounding/queries")
    .useGroundingSessionCount as jest.Mock,
  groundingList: jest.requireMock("@/src/features/grounding/queries")
    .useGroundingSessions as jest.Mock,
  sits: jest.requireMock("@/src/features/meditation/queries")
    .useMeditationSessionCount as jest.Mock,
  median: jest.requireMock("@/src/features/meditation/queries")
    .useMeditationMedianMinutes as jest.Mock,
  sleepStats: jest.requireMock("@/src/features/sleep/queries").useSleepStats as jest.Mock,
  habits: jest.requireMock("@/src/features/habits/queries").useHabits as jest.Mock,
  habitLogs: jest.requireMock("@/src/features/habits/queries").useHabitLogs as jest.Mock,
  routines: jest.requireMock("@/src/features/routines/use-routines-today")
    .useRoutinesToday as jest.Mock,
  records: jest.requireMock("@/src/features/cbt/queries").useThoughtRecords as jest.Mock,
  recordCount: jest.requireMock("@/src/features/cbt/queries").useThoughtRecordCount as jest.Mock,
  selfCare: jest.requireMock("@/src/features/self-care/queries").useSelfCareLogs as jest.Mock,
  worry: jest.requireMock("@/src/features/worry/queries").useWorryEntries as jest.Mock,
  beliefs: jest.requireMock("@/src/features/beliefs/queries").useCoreBeliefs as jest.Mock,
  activities: jest.requireMock("@/src/features/activities/queries").useActivities as jest.Mock,
  exposure: jest.requireMock("@/src/features/exposure/queries")
    .useRecentExposureSessions as jest.Mock,
  goals: jest.requireMock("@/src/features/goals/queries").useGoals as jest.Mock,
  connection: jest.requireMock("@/src/features/act/queries/connection")
    .useConnectionLogs as jest.Mock,
  observing: jest.requireMock("@/src/features/act/queries/observing-self")
    .useObservingSelfSessions as jest.Mock,
  choicePoints: jest.requireMock("@/src/features/act/queries/choice-points")
    .useChoicePoints as jest.Mock,
  defusion: jest.requireMock("@/src/features/act/queries/defusion").useDefusionLogs as jest.Mock,
  expansion: jest.requireMock("@/src/features/act/queries/expansion").useExpansionLogs as jest.Mock,
  committed: jest.requireMock("@/src/features/act/queries/committed-action")
    .useCommittedActions as jest.Mock,
};

/** Every hook loaded and empty, so each test only sets the ones it is about. */
function allLoadedEmpty() {
  mocks.moodLogs.mockReturnValue(q([]));
  mocks.moodCount.mockReturnValue(q(0));
  mocks.journalEntries.mockReturnValue(q(0));
  mocks.journalWords.mockReturnValue(q(0));
  mocks.gratitudeTotal.mockReturnValue(q(0));
  mocks.gratitudeWeek.mockReturnValue(q(0));
  mocks.breathingCount.mockReturnValue(q(0));
  mocks.breathingMinutes.mockReturnValue(q(0));
  mocks.groundingCount.mockReturnValue(q(0));
  mocks.groundingList.mockReturnValue(q([]));
  mocks.sits.mockReturnValue(q(0));
  mocks.median.mockReturnValue(q(null));
  mocks.sleepStats.mockReturnValue(q(null));
  mocks.habits.mockReturnValue(q([]));
  mocks.habitLogs.mockReturnValue(q([]));
  mocks.routines.mockReturnValue({
    isLoading: false,
    hasRoutines: false,
    doneSteps: 0,
    totalSteps: 0,
  });
  mocks.records.mockReturnValue(q([]));
  mocks.recordCount.mockReturnValue(q(0));
  mocks.selfCare.mockReturnValue(q([]));
  mocks.worry.mockReturnValue(q([]));
  mocks.beliefs.mockReturnValue(q([]));
  mocks.activities.mockReturnValue(q([]));
  mocks.exposure.mockReturnValue(q([]));
  mocks.goals.mockReturnValue(q([]));
  mocks.connection.mockReturnValue(q([]));
  mocks.observing.mockReturnValue(q([]));
  mocks.choicePoints.mockReturnValue(q([]));
  mocks.defusion.mockReturnValue(q([]));
  mocks.expansion.mockReturnValue(q([]));
  mocks.committed.mockReturnValue(q([]));
}

const renderRow = (id: string) => renderWithProviders(<ToolTierRow id={id} userId="user-1" />);

/**
 * The row's whole stat, including the ` · ` join. Read off the stat's own node rather
 * than split out of the accessible label: a tool NAME can contain ", " itself, so the
 * first separator in the label is not reliably the one between name and stat.
 */
function statOf(id: string): string | null {
  const node = screen.queryByTestId(`tool-row-stat-${id}`);
  return node === null ? null : (node.props.children as string);
}

beforeEach(() => {
  jest.clearAllMocks();
  allLoadedEmpty();
});

describe("the three states", () => {
  it("renders no stat at all while the data is still loading", () => {
    // Not a dash, not a skeleton, not "Nothing yet". `undefined` also covers a failed
    // fetch with no cache, where claiming emptiness would erase a real history.
    mocks.journalEntries.mockReturnValue(loading);
    mocks.journalWords.mockReturnValue(loading);

    renderRow("journal-week");

    expect(statOf("journal-week")).toBeNull();
  });

  it("waits for every clause before showing any of them", () => {
    // A row that renders half its stat and then reflows is worse than one that waits.
    mocks.journalEntries.mockReturnValue(q(24));
    mocks.journalWords.mockReturnValue(loading);

    renderRow("journal-week");

    expect(statOf("journal-week")).toBeNull();
  });

  it("renders the one shared empty string when loaded with no record", () => {
    renderRow("journal-week");

    expect(statOf("journal-week")).toBe("Nothing yet");
  });

  it("distinguishes an empty day from an empty record", () => {
    // A user with habits, none due today, has a full record and an empty day.
    mocks.habits.mockReturnValue(
      q([{ id: "h1", archivedAt: null, cadence: "custom", customDays: [] }]),
    );

    renderRow("habits-today");

    expect(statOf("habits-today")).toBe("Nothing scheduled today");
  });
});

describe("the stat grammar", () => {
  it("joins two clauses with the design's separator", () => {
    mocks.journalEntries.mockReturnValue(q(24));
    mocks.journalWords.mockReturnValue(q(698));

    renderRow("journal-week");

    expect(statOf("journal-week")).toBe("24 entries · 698 words");
  });

  it("drops a clause rather than rendering it empty", () => {
    mocks.sits.mockReturnValue(q(30));
    mocks.median.mockReturnValue(q(null));

    renderRow("meditation-pick");

    expect(statOf("meditation-pick")).toBe("30 sits");
  });

  it("names the window on a windowed number and not on a lifetime one", () => {
    mocks.journalEntries.mockReturnValue(q(24));
    mocks.journalWords.mockReturnValue(q(698));
    renderRow("journal-week");
    expect(statOf("journal-week")).not.toMatch(/week|average/i);

    mocks.sleepStats.mockReturnValue(q({ sevenDayDurationMinutes: 432, sevenDayQuality: 3.2 }));
    renderRow("sleep-latest");
    expect(statOf("sleep-latest")).toMatch(/7-day average/);
  });
});

describe("per-tool stats", () => {
  it("check-in quotes a calendar week and a trailing average, both labelled", () => {
    // The two windows differ ON PURPOSE (#697): `this week` is Mon-Sun, `7-day average`
    // is trailing. Both are labelled, so both are honest - harmonising them reverts #697.
    mocks.moodLogs.mockReturnValue(
      q([
        { dayKey: currentDateKey(), moodScore: 3 },
        { dayKey: addDaysToKey(currentDateKey(), -1), moodScore: 3 },
      ]),
    );
    mocks.moodCount.mockReturnValue(q(2));

    renderRow("mood-checkin");

    expect(statOf("mood-checkin")).toMatch(/this week/);
    expect(statOf("mood-checkin")).toMatch(/7-day average/);
  });

  it("sleep converts the server's minutes into hours and quotes quality out of five", () => {
    // `sleep_stats` returns MINUTES; 432 is 7.2h. The decimal is locale-aware via #962.
    mocks.sleepStats.mockReturnValue(q({ sevenDayDurationMinutes: 432, sevenDayQuality: 3.2 }));

    renderRow("sleep-latest");

    expect(statOf("sleep-latest")).toBe("7-day average 7.2h · quality 3.2/5");
  });

  it("habits counts habits due today, not CBT activities", () => {
    // The id maps to ActivitiesWidget today, which reads behavioural-activation data and
    // no habit data at all. 2026-05-28 is a Thursday (day 4).
    mocks.habits.mockReturnValue(
      q([
        { id: "h1", archivedAt: null, cadence: "daily", customDays: [] },
        { id: "h2", archivedAt: null, cadence: "daily", customDays: [] },
        { id: "h3", archivedAt: null, cadence: "custom", customDays: [0] },
        { id: "h4", archivedAt: "2026-01-01", cadence: "daily", customDays: [] },
      ]),
    );
    mocks.habitLogs.mockReturnValue(q([{ habitId: "h1", loggedOn: "2026-05-28" }]));

    renderRow("habits-today");

    // h1 and h2 are due; h3 is Sundays-only; h4 is archived. One of the two is ticked.
    expect(statOf("habits-today")).toBe("1 of 2 done today");
  });

  it("routines separates having no routines from having none due", () => {
    mocks.routines.mockReturnValue({
      isLoading: false,
      hasRoutines: true,
      doneSteps: 0,
      totalSteps: 0,
    });
    renderRow("routines-today");
    expect(statOf("routines-today")).toBe("Nothing scheduled today");

    mocks.routines.mockReturnValue({
      isLoading: false,
      hasRoutines: true,
      doneSteps: 2,
      totalSteps: 5,
    });
    renderRow("routines-today");
    expect(statOf("routines-today")).toBe("2 of 5 done today");
  });

  it("gratitude counts everything, then this week from the Monday key", () => {
    // The week clause is a "since Monday" count keyed on `mondayKeyOf(selectedDate)`,
    // which is the key the gratitude home screen passes - so the row shares its cache
    // entry rather than opening a second one on a different key.
    mocks.gratitudeTotal.mockReturnValue(q(29));
    mocks.gratitudeWeek.mockReturnValue(q(3));

    renderRow("gratitude-latest");

    expect(statOf("gratitude-latest")).toBe("29 entries · 3 this week");
    // 2026-05-28 is a Thursday; its Monday is the 25th.
    expect(mocks.gratitudeWeek).toHaveBeenCalledWith("user-1", "2026-05-25");
  });

  it("breathing quotes lifetime sessions and lifetime minutes, neither windowed", () => {
    mocks.breathingCount.mockReturnValue(q(14));
    mocks.breathingMinutes.mockReturnValue(q(82));

    renderRow("breathing-suggested");

    const stat = statOf("breathing-suggested");
    expect(stat).toBe("14 sessions · 82 minutes");
    // A lifetime number names no window - that is the other half of the rule that makes
    // `7-day average` mean something.
    expect(stat).not.toMatch(/week|average|today/i);
  });

  it("check-in stays honest for a user whose record is older than the window", () => {
    // Their last check-in was ten days ago: they have a record, so "Nothing yet" would
    // be false. `0 this week` is the true clause.
    mocks.moodLogs.mockReturnValue(q([]));
    mocks.moodCount.mockReturnValue(q(12));

    renderRow("mood-checkin");

    expect(statOf("mood-checkin")).toBe("0 this week");
  });

  it("grounding reads recency off the tool's own cached list", () => {
    mocks.groundingCount.mockReturnValue(q(14));
    mocks.groundingList.mockReturnValue(
      q([
        { completedAt: "2026-05-20T10:00:00.000Z", completedOffsetMinutes: 0 },
        { completedAt: "2026-05-27T19:40:00.000Z", completedOffsetMinutes: 0 },
      ]),
    );

    renderRow("grounding-log");

    const stat = statOf("grounding-log") ?? "";
    expect(stat).toMatch(/^14 sessions · Last /);
    // Never "N days ago": a column of those implies lateness, which home does not do.
    expect(stat).not.toMatch(/days? ago/i);
  });
});

describe("the module and shortcut rows (#976)", () => {
  it("renders recency through the compact formatter, never as days ago", () => {
    mocks.worry.mockReturnValue(q([{ createdAt: "2026-07-27T19:40:00.000Z" }]));

    renderRow("cbt-worry");

    const stat = statOf("cbt-worry") ?? "";
    expect(stat).toMatch(/^Last /);
    // A column of "23 days ago / 41 days ago" implies lateness. Home does not tally
    // days since you last opened a tool.
    expect(stat).not.toMatch(/days? ago/i);
  });

  it("says Nothing yet when a tool has no record at all", () => {
    renderRow("act-defusion");

    expect(statOf("act-defusion")).toBe("Nothing yet");
  });

  it("renders no stat while a recency list is still loading", () => {
    mocks.beliefs.mockReturnValue(loading);

    renderRow("cbt-beliefs");

    expect(statOf("cbt-beliefs")).toBeNull();
  });

  it("cbt-distortion-guide renders no stat in ANY state", () => {
    // The one documented exception. It is reference content and holds no record of
    // yours, so "Nothing yet" would be false - and its description is not a stat.
    renderRow("cbt-distortion-guide");

    expect(screen.getByTestId("tool-row-cbt-distortion-guide")).toBeTruthy();
    expect(statOf("cbt-distortion-guide")).toBeNull();
  });

  it("counts thought records exactly rather than measuring the capped list", () => {
    // The list is capped at 500 and ordered by `updated_at`; ADR-0001 forbids taking a
    // lifetime figure off it. The count comes from a head count instead, so a
    // short/stale list cannot shrink it.
    mocks.recordCount.mockReturnValue(q(24));
    mocks.records.mockReturnValue(
      q([{ createdAt: "2026-07-27T10:00:00.000Z", createdOffsetMinutes: null }]),
    );

    renderRow("cbt-open-record");

    expect(statOf("cbt-open-record")).toMatch(/^24 records · Last /);
  });

  it("takes the newest thought record by creation, not by last edit", () => {
    // `listThoughtRecords` orders by `updated_at`, so the first element is the most
    // recently EDITED record. Editing an old record must not make it "last written".
    mocks.recordCount.mockReturnValue(q(2));
    mocks.records.mockReturnValue(
      q([
        { createdAt: "2026-01-02T10:00:00.000Z", createdOffsetMinutes: null },
        { createdAt: "2026-07-27T10:00:00.000Z", createdOffsetMinutes: null },
      ]),
    );

    renderRow("cbt-open-record");

    const stat = statOf("cbt-open-record") ?? "";
    expect(stat).toContain("Jul");
    expect(stat).not.toContain("Jan");
  });

  it("takes the newest activity completion from a schedule-ordered list", () => {
    // `useActivities` orders by `scheduled_at` ASC, so neither end of the list is the
    // newest completion - and a scheduled activity may never have been completed.
    mocks.activities.mockReturnValue(
      q([
        { completedAt: "2026-07-27T10:00:00.000Z", completedOffsetMinutes: null },
        { completedAt: null, completedOffsetMinutes: null },
        { completedAt: "2026-01-02T10:00:00.000Z", completedOffsetMinutes: null },
      ]),
    );

    renderRow("cbt-activities");

    const stat = statOf("cbt-activities") ?? "";
    expect(stat).toContain("Jul");
    expect(stat).not.toContain("Jan");
  });

  it("treats a never-completed activity list as no record", () => {
    mocks.activities.mockReturnValue(q([{ completedAt: null, completedOffsetMinutes: null }]));

    renderRow("cbt-activities");

    expect(statOf("cbt-activities")).toBe("Nothing yet");
  });

  it("filters drop-anchor out of the shared connection log", () => {
    // Drop anchor is a SUBSET of connection, not its own table. A newer log of another
    // technique must not be reported as the last drop anchor.
    mocks.connection.mockReturnValue(
      q([
        { technique: "bodyScan", createdAt: "2026-07-27T10:00:00.000Z" },
        { technique: "dropAnchor", createdAt: "2026-01-02T10:00:00.000Z" },
      ]),
    );

    renderRow("act-drop-anchor");

    const stat = statOf("act-drop-anchor") ?? "";
    expect(stat).toContain("Jan");
    expect(stat).not.toContain("Jul");
  });

  it("says Nothing yet when connection logs exist but none are drop anchor", () => {
    mocks.connection.mockReturnValue(
      q([{ technique: "bodyScan", createdAt: "2026-07-27T10:00:00.000Z" }]),
    );

    renderRow("act-drop-anchor");

    expect(statOf("act-drop-anchor")).toBe("Nothing yet");
  });

  it("shares the connection cache entry the list screen mounts", () => {
    // The limit rides this hook's query key, so 30 is what shares with the ACT
    // connection list screen and the programme rather than opening a second fetch.
    renderRow("act-drop-anchor");

    expect(mocks.connection).toHaveBeenCalledWith("user-1", 30);
  });

  it("omits the limit where it is NOT part of the query key", () => {
    // `useObservingSelfSessions` and `useChoicePoints` key on the user alone, so passing
    // a limit cannot open a separate entry - it would only race whichever mounts first.
    renderRow("act-observing-self");
    expect(mocks.observing).toHaveBeenCalledWith("user-1");

    renderRow("act-choice-point");
    expect(mocks.choicePoints).toHaveBeenCalledWith("user-1");
  });

  it("counts only active goals, and calls them goals", () => {
    mocks.goals.mockReturnValue(
      q([
        { status: "active" },
        { status: "completed" },
        { status: "active" },
        { status: "paused" },
      ]),
    );

    renderRow("cbt-goals");

    expect(statOf("cbt-goals")).toBe("2 active goals");
  });

  it("counts committed actions from the status-filtered entry", () => {
    mocks.committed.mockReturnValue(q([{ status: "active" }, { status: "active" }]));

    renderRow("act-committed-actions");

    expect(statOf("act-committed-actions")).toBe("2 active");
    // The status is part of the query key, so asking for "active" is what makes the
    // count mean what the row says it means.
    expect(mocks.committed).toHaveBeenCalledWith("user-1", "active");
  });

  it("reads exposure SESSIONS, never hierarchies", () => {
    mocks.exposure.mockReturnValue(q([{ completedAt: "2026-07-27T10:00:00.000Z" }]));

    renderRow("cbt-exposure");

    expect(statOf("cbt-exposure")).toMatch(/^Last /);
    expect(mocks.exposure).toHaveBeenCalledWith("user-1", 250);
  });

  it("dates self-care from the instant, not from its day key", () => {
    // The list is sorted by `log_date`, a bare "YYYY-MM-DD". Parsed as an instant that
    // is UTC midnight, which renders as the previous day for any viewer west of UTC.
    mocks.selfCare.mockReturnValue(
      q([{ logDate: "2026-07-27", createdAt: "2026-07-27T15:00:00.000Z" }]),
    );

    renderRow("self-care");

    expect(statOf("self-care")).toMatch(/^Last /);
  });
});

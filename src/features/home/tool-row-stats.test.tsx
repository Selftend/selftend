import { screen } from "@testing-library/react-native";

import { Text } from "@/src/components/react-native-reusables/text";
import { TOOL_ITEMS, type ToolKey } from "@/src/features/favorites/items";
import { ToolStat, ToolTierRow } from "@/src/features/home/tool-row-stats";
import { addDaysToKey, currentDateKey } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({ router: { push: jest.fn() }, usePathname: () => "/" }));

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
  useLatestThoughtRecordAt: jest.fn(),
}));
jest.mock("@/src/features/self-care/queries", () => ({
  useSelfCareLogs: jest.fn(),
  useLatestSelfCareLogAt: jest.fn(),
}));
jest.mock("@/src/features/worry/queries", () => ({
  useWorryEntries: jest.fn(),
  useLatestWorryEntryAt: jest.fn(),
}));
jest.mock("@/src/features/beliefs/queries", () => ({
  useCoreBeliefs: jest.fn(),
  useLatestCoreBeliefAt: jest.fn(),
}));
jest.mock("@/src/features/activities/queries", () => ({
  useActivities: jest.fn(),
  useLatestCompletedActivityAt: jest.fn(),
}));
jest.mock("@/src/features/exposure/queries", () => ({
  useRecentExposureSessions: jest.fn(),
  useLatestExposureSessionAt: jest.fn(),
}));
jest.mock("@/src/features/goals/queries", () => ({
  useGoals: jest.fn(),
  useActiveGoalCount: jest.fn(),
}));
jest.mock("@/src/features/act/queries/connection", () => ({
  useConnectionLogs: jest.fn(),
  useLatestConnectionLogAt: jest.fn(),
}));
jest.mock("@/src/features/act/queries/observing-self", () => ({
  useObservingSelfSessions: jest.fn(),
  useLatestObservingSelfSessionAt: jest.fn(),
}));
jest.mock("@/src/features/act/queries/choice-points", () => ({
  useChoicePoints: jest.fn(),
  useLatestChoicePointAt: jest.fn(),
}));
jest.mock("@/src/features/act/queries/defusion", () => ({
  useDefusionLogs: jest.fn(),
  useLatestDefusionLogAt: jest.fn(),
}));
jest.mock("@/src/features/act/queries/expansion", () => ({
  useExpansionLogs: jest.fn(),
  useLatestExpansionLogAt: jest.fn(),
}));
jest.mock("@/src/features/act/queries/committed-action", () => ({
  useCommittedActions: jest.fn(),
  useCommittedActionCount: jest.fn(),
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
  recordCount: jest.requireMock("@/src/features/cbt/queries").useThoughtRecordCount as jest.Mock,
  lastRecord: jest.requireMock("@/src/features/cbt/queries").useLatestThoughtRecordAt as jest.Mock,
  lastSelfCare: jest.requireMock("@/src/features/self-care/queries")
    .useLatestSelfCareLogAt as jest.Mock,
  lastWorry: jest.requireMock("@/src/features/worry/queries").useLatestWorryEntryAt as jest.Mock,
  lastBelief: jest.requireMock("@/src/features/beliefs/queries").useLatestCoreBeliefAt as jest.Mock,
  lastActivity: jest.requireMock("@/src/features/activities/queries")
    .useLatestCompletedActivityAt as jest.Mock,
  lastExposure: jest.requireMock("@/src/features/exposure/queries")
    .useLatestExposureSessionAt as jest.Mock,
  activeGoals: jest.requireMock("@/src/features/goals/queries").useActiveGoalCount as jest.Mock,
  lastConnection: jest.requireMock("@/src/features/act/queries/connection")
    .useLatestConnectionLogAt as jest.Mock,
  lastObserving: jest.requireMock("@/src/features/act/queries/observing-self")
    .useLatestObservingSelfSessionAt as jest.Mock,
  lastChoicePoint: jest.requireMock("@/src/features/act/queries/choice-points")
    .useLatestChoicePointAt as jest.Mock,
  lastDefusion: jest.requireMock("@/src/features/act/queries/defusion")
    .useLatestDefusionLogAt as jest.Mock,
  lastExpansion: jest.requireMock("@/src/features/act/queries/expansion")
    .useLatestExpansionLogAt as jest.Mock,
  committedCount: jest.requireMock("@/src/features/act/queries/committed-action")
    .useCommittedActionCount as jest.Mock,
};

/**
 * The full-list hooks the tool rows used to mount (#976), kept mocked so one test can
 * prove home no longer touches any of them (#990). None of these is ever primed.
 */
const listHooks = {
  useThoughtRecords: jest.requireMock("@/src/features/cbt/queries").useThoughtRecords as jest.Mock,
  useSelfCareLogs: jest.requireMock("@/src/features/self-care/queries")
    .useSelfCareLogs as jest.Mock,
  useWorryEntries: jest.requireMock("@/src/features/worry/queries").useWorryEntries as jest.Mock,
  useCoreBeliefs: jest.requireMock("@/src/features/beliefs/queries").useCoreBeliefs as jest.Mock,
  useActivities: jest.requireMock("@/src/features/activities/queries").useActivities as jest.Mock,
  useRecentExposureSessions: jest.requireMock("@/src/features/exposure/queries")
    .useRecentExposureSessions as jest.Mock,
  useGoals: jest.requireMock("@/src/features/goals/queries").useGoals as jest.Mock,
  useConnectionLogs: jest.requireMock("@/src/features/act/queries/connection")
    .useConnectionLogs as jest.Mock,
  useObservingSelfSessions: jest.requireMock("@/src/features/act/queries/observing-self")
    .useObservingSelfSessions as jest.Mock,
  useChoicePoints: jest.requireMock("@/src/features/act/queries/choice-points")
    .useChoicePoints as jest.Mock,
  useDefusionLogs: jest.requireMock("@/src/features/act/queries/defusion")
    .useDefusionLogs as jest.Mock,
  useExpansionLogs: jest.requireMock("@/src/features/act/queries/expansion")
    .useExpansionLogs as jest.Mock,
  useCommittedActions: jest.requireMock("@/src/features/act/queries/committed-action")
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
  mocks.recordCount.mockReturnValue(q(0));
  // `null` is a loaded recency read with nothing behind it, distinct from `undefined`.
  mocks.lastRecord.mockReturnValue(q(null));
  mocks.lastSelfCare.mockReturnValue(q(null));
  mocks.lastWorry.mockReturnValue(q(null));
  mocks.lastBelief.mockReturnValue(q(null));
  mocks.lastActivity.mockReturnValue(q(null));
  mocks.lastExposure.mockReturnValue(q(null));
  mocks.activeGoals.mockReturnValue(q(0));
  mocks.lastConnection.mockReturnValue(q(null));
  mocks.lastObserving.mockReturnValue(q(null));
  mocks.lastChoicePoint.mockReturnValue(q(null));
  mocks.lastDefusion.mockReturnValue(q(null));
  mocks.lastExpansion.mockReturnValue(q(null));
  mocks.committedCount.mockReturnValue(q(0));
}

/** A loaded recency read. Most tables capture no offset, so it defaults to null. */
const at = (instant: string, offsetMinutes: number | null = null) =>
  q({ at: instant, offsetMinutes });

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

/**
 * #1955: the eight tool stats are ONE implementation read two ways - Home's row by
 * widget id, the favourites card by tool key. The card path is proven on the same
 * mocks as the row path, so the two cannot drift: there is nothing to drift.
 */
describe("ToolStat, the tool-keyed read the favourites card uses", () => {
  const renderStat = (toolKey: ToolKey) =>
    renderWithProviders(
      <ToolStat toolKey={toolKey} userId="user-1">
        {(stat) => (stat === null ? null : <Text testID="stat">{stat}</Text>)}
      </ToolStat>,
    );

  it("hands the card the same string the Home row renders", () => {
    mocks.breathingCount.mockReturnValue(q(14));
    mocks.breathingMinutes.mockReturnValue(q(82));

    renderStat("breathing");
    expect(screen.getByTestId("stat").props.children).toBe("14 sessions · 82 minutes");

    renderRow("breathing-suggested");
    expect(statOf("breathing-suggested")).toBe("14 sessions · 82 minutes");
  });

  it("hands the card null while a clause is still loading, so it draws nothing", () => {
    mocks.moodLogs.mockReturnValue(loading);
    mocks.moodCount.mockReturnValue(q(7));

    renderStat("mood");

    expect(screen.queryByTestId("stat")).toBeNull();
  });

  it("covers exactly the eight tools, and no module", () => {
    // A module has no stat line at all (spec §2.3); the type is the guard, and this
    // pins the runtime table to the same eight keys.
    for (const key of TOOL_ITEMS.map((item) => item.key)) {
      expect(() => renderStat(key)).not.toThrow();
    }
  });
});

describe("the module and shortcut rows (#976)", () => {
  it("renders recency through the compact formatter, never as days ago", () => {
    mocks.lastWorry.mockReturnValue(at("2026-07-27T19:40:00.000Z"));

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

  it("renders no stat while a recency read is still loading", () => {
    mocks.lastBelief.mockReturnValue(loading);

    renderRow("cbt-beliefs");

    expect(statOf("cbt-beliefs")).toBeNull();
  });

  it("renders the captured offset where the table has one", () => {
    // activity_logs and thought_records capture an offset; the ACT tables and self-care,
    // worry, beliefs and exposure do not, and fall back to the viewer's zone.
    mocks.lastActivity.mockReturnValue(at("2026-07-27T23:30:00.000Z", 720));

    renderRow("cbt-activities");

    // +12:00 puts that instant on the 28th where it was logged, not the 27th here.
    expect(statOf("cbt-activities")).toContain("28");
  });

  it("cbt-distortion-guide renders no stat in ANY state", () => {
    // The one documented exception. It is reference content and holds no record of
    // yours, so "Nothing yet" would be false - and its description is not a stat.
    renderRow("cbt-distortion-guide");

    expect(screen.getByTestId("tool-row-cbt-distortion-guide")).toBeTruthy();
    expect(statOf("cbt-distortion-guide")).toBeNull();
  });

  it("counts thought records exactly rather than measuring a list", () => {
    // ADR-0001 forbids taking a lifetime figure off a capped query. The count is a head
    // count, so nothing about the row's other clause can shrink it.
    mocks.recordCount.mockReturnValue(q(24));
    mocks.lastRecord.mockReturnValue(at("2026-07-27T10:00:00.000Z"));

    renderRow("cbt-open-record");

    expect(statOf("cbt-open-record")).toMatch(/^24 records · Last /);
  });

  it("still names the record count when the recency clause is empty", () => {
    // A count without a newest row cannot happen from one snapshot, but the clauses come
    // from two independent reads, so the row must not render "24 records · Last ".
    mocks.recordCount.mockReturnValue(q(24));
    mocks.lastRecord.mockReturnValue(q(null));

    renderRow("cbt-open-record");

    expect(statOf("cbt-open-record")).toBe("24 records");
  });

  it("waits for both clauses of cbt-open-record before rendering either", () => {
    mocks.recordCount.mockReturnValue(q(24));
    mocks.lastRecord.mockReturnValue(loading);

    renderRow("cbt-open-record");

    expect(statOf("cbt-open-record")).toBeNull();
  });

  it("asks for drop anchor specifically, not for the whole connection log", () => {
    // Drop anchor is a SUBSET of connection, not its own table. Filtering in the read is
    // what stops 30 newer logs of other techniques hiding it (#990); a client-side filter
    // over a fetched page could not.
    mocks.lastConnection.mockReturnValue(at("2026-07-27T10:00:00.000Z"));

    renderRow("act-drop-anchor");

    expect(mocks.lastConnection).toHaveBeenCalledWith("user-1", "dropAnchor");
    expect(statOf("act-drop-anchor")).toMatch(/^Last /);
  });

  it("says Nothing yet when the user has never dropped anchor", () => {
    renderRow("act-drop-anchor");

    expect(statOf("act-drop-anchor")).toBe("Nothing yet");
  });

  it("counts only active goals, and calls them goals", () => {
    mocks.activeGoals.mockReturnValue(q(2));

    renderRow("cbt-goals");

    expect(statOf("cbt-goals")).toBe("2 active goals");
    expect(mocks.activeGoals).toHaveBeenCalledWith("user-1");
  });

  it("counts committed actions from the status-filtered read", () => {
    mocks.committedCount.mockReturnValue(q(2));

    renderRow("act-committed-actions");

    expect(statOf("act-committed-actions")).toBe("2 active");
    // The status is what makes the count mean what the row says it means.
    expect(mocks.committedCount).toHaveBeenCalledWith("user-1", "active");
  });

  it("reads exposure SESSIONS, never hierarchies", () => {
    mocks.lastExposure.mockReturnValue(at("2026-07-27T10:00:00.000Z"));

    renderRow("cbt-exposure");

    expect(statOf("cbt-exposure")).toMatch(/^Last /);
  });

  it("dates self-care from the instant, not from its day key", () => {
    // The tool's list is sorted by `log_date`, a bare "YYYY-MM-DD". Parsed as an instant
    // that is UTC midnight, which renders as the previous day for any viewer west of UTC.
    mocks.lastSelfCare.mockReturnValue(at("2026-07-27T15:00:00.000Z"));

    renderRow("self-care");

    expect(statOf("self-care")).toMatch(/^Last /);
  });

  it("mounts no tool's full list to render a one-line stat (#990)", () => {
    // The regression this ticket exists to prevent: on a cold home load these rows once
    // cost fourteen list fetches, several `select("*")` at limit 500 over a decrypting
    // view, to read one timestamp each.
    for (const id of [
      "self-care",
      "cbt-open-record",
      "cbt-worry",
      "cbt-beliefs",
      "cbt-activities",
      "cbt-exposure",
      "cbt-goals",
      "act-drop-anchor",
      "act-observing-self",
      "act-choice-point",
      "act-defusion",
      "act-acceptance-prompt",
      "act-committed-actions",
    ]) {
      renderRow(id);
    }

    for (const [name, hook] of Object.entries(listHooks)) {
      expect([name, hook.mock.calls.length]).toEqual([name, 0]);
    }
  });
});

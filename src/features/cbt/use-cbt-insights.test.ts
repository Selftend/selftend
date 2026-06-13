import { renderHook } from "@testing-library/react-native";

import { useActivities } from "@/src/features/activities/queries";
import { useAngerLogs } from "@/src/features/anger/queries";
import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useCbtInsights } from "@/src/features/cbt/use-cbt-insights";
import { useAllExposureItems } from "@/src/features/exposure/queries";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { useMoodHistory } from "@/src/features/mood/queries";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSelfCareLogs } from "@/src/features/self-care/queries";
import { useSleepLogs } from "@/src/features/sleep/queries";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
jest.mock("@/src/features/activities/queries", () => ({
  useActivities: jest.fn(),
}));
jest.mock("@/src/features/anger/queries", () => ({
  useAngerLogs: jest.fn(),
}));
jest.mock("@/src/features/beliefs/queries", () => ({
  useCoreBeliefs: jest.fn(),
}));
jest.mock("@/src/features/cbt/queries", () => ({
  useThoughtRecords: jest.fn(),
}));
jest.mock("@/src/features/exposure/queries", () => ({
  useAllExposureItems: jest.fn(),
}));
jest.mock("@/src/features/gratitude/queries", () => ({
  useGratitudeEntries: jest.fn(),
}));
jest.mock("@/src/features/mood/queries", () => ({
  useMoodHistory: jest.fn(),
}));
jest.mock("@/src/features/recovery/queries", () => ({
  useRecoveryPlan: jest.fn(),
}));
jest.mock("@/src/features/self-care/queries", () => ({
  useSelfCareLogs: jest.fn(),
}));
jest.mock("@/src/features/sleep/queries", () => ({
  useSleepLogs: jest.fn(),
}));
jest.mock("@/src/stores/selected-date-store", () => ({
  toLocalDateKey: (iso: string) => iso.slice(0, 10),
}));

// ---------------------------------------------------------------------------
// Typed mock refs
// ---------------------------------------------------------------------------
const mockUseActivities = useActivities as jest.MockedFunction<typeof useActivities>;
const mockUseAngerLogs = useAngerLogs as jest.MockedFunction<typeof useAngerLogs>;
const mockUseCoreBeliefs = useCoreBeliefs as jest.MockedFunction<typeof useCoreBeliefs>;
const mockUseThoughtRecords = useThoughtRecords as jest.MockedFunction<typeof useThoughtRecords>;
const mockUseAllExposureItems = useAllExposureItems as jest.MockedFunction<
  typeof useAllExposureItems
>;
const mockUseGratitudeEntries = useGratitudeEntries as jest.MockedFunction<
  typeof useGratitudeEntries
>;
const mockUseMoodLogs = useMoodHistory as jest.MockedFunction<typeof useMoodHistory>;
const mockUseRecoveryPlan = useRecoveryPlan as jest.MockedFunction<typeof useRecoveryPlan>;
const mockUseSelfCareLogs = useSelfCareLogs as jest.MockedFunction<typeof useSelfCareLogs>;
const mockUseSleepLogs = useSleepLogs as jest.MockedFunction<typeof useSleepLogs>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Minimal empty mocks - return undefined data for everything
function setupEmptyMocks() {
  mockUseActivities.mockReturnValue({ data: undefined } as unknown as ReturnType<
    typeof useActivities
  >);
  mockUseAngerLogs.mockReturnValue({ data: undefined } as unknown as ReturnType<
    typeof useAngerLogs
  >);
  mockUseCoreBeliefs.mockReturnValue({ data: undefined } as unknown as ReturnType<
    typeof useCoreBeliefs
  >);
  mockUseThoughtRecords.mockReturnValue({ data: undefined } as unknown as ReturnType<
    typeof useThoughtRecords
  >);
  mockUseAllExposureItems.mockReturnValue({ data: undefined } as unknown as ReturnType<
    typeof useAllExposureItems
  >);
  mockUseGratitudeEntries.mockReturnValue({ data: undefined } as unknown as ReturnType<
    typeof useGratitudeEntries
  >);
  mockUseMoodLogs.mockReturnValue({ data: undefined } as unknown as ReturnType<
    typeof useMoodHistory
  >);
  mockUseRecoveryPlan.mockReturnValue({ data: undefined } as unknown as ReturnType<
    typeof useRecoveryPlan
  >);
  mockUseSelfCareLogs.mockReturnValue({ data: undefined } as unknown as ReturnType<
    typeof useSelfCareLogs
  >);
  mockUseSleepLogs.mockReturnValue({ data: undefined } as unknown as ReturnType<
    typeof useSleepLogs
  >);
}

function makeThoughtRecord(
  id: string,
  distortions: string[],
  hotThought: string,
  createdAt = "2026-05-01T00:00:00Z",
) {
  return {
    id,
    userId: "u1",
    situation: "s",
    nats: [{ text: hotThought, beliefRating: 80, isHotThought: true }],
    emotions: [],
    emotionIntensityBefore: null,
    distortions,
    evidenceFor: [],
    evidenceAgainst: [],
    balancedThought: "",
    emotionIntensityAfter: null,
    outcomeNotes: "",
    createdAt,
    updatedAt: createdAt,
    archivedAt: null,
  };
}

function makeSelfCareLog(logDate: string, exerciseDone: boolean, socialConnectionMade = false) {
  return {
    id: logDate,
    userId: "u1",
    logDate,
    exerciseDone,
    exerciseMinutes: null,
    exerciseType: "",
    mealsStructured: null,
    emotionalEating: false,
    socialConnectionMade,
    socialNotes: "",
    meaningfulActivity: "",
    createdAt: `${logDate}T00:00:00Z`,
    updatedAt: `${logDate}T00:00:00Z`,
  };
}

// ---------------------------------------------------------------------------
// Tests: topDistortions
// ---------------------------------------------------------------------------
describe("useCbtInsights - topDistortions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupEmptyMocks();
  });

  it("returns [] when thoughtRecords is undefined", () => {
    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.topDistortions).toEqual([]);
  });

  it("returns [] when fewer than 5 thought records", () => {
    mockUseThoughtRecords.mockReturnValue({
      data: [
        makeThoughtRecord("t1", ["d1"], "thought 1"),
        makeThoughtRecord("t2", ["d1"], "thought 2"),
        makeThoughtRecord("t3", ["d2"], "thought 3"),
        makeThoughtRecord("t4", [], "thought 4"),
      ],
    } as unknown as ReturnType<typeof useThoughtRecords>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.topDistortions).toEqual([]);
  });

  it("returns top 3 distortions ranked by count desc, tie-breaking by key asc", () => {
    // d1: 4, d2: 3, d3: 2, d4: 1 - top 3 should be d1, d2, d3
    const records = [
      makeThoughtRecord("t1", ["d1", "d2", "d3"], "thought 1"),
      makeThoughtRecord("t2", ["d1", "d2", "d3"], "thought 2"),
      makeThoughtRecord("t3", ["d1", "d2", "d4"], "thought 3"),
      makeThoughtRecord("t4", ["d1"], "thought 4"),
      makeThoughtRecord("t5", [], "thought 5"),
    ];
    mockUseThoughtRecords.mockReturnValue({
      data: records,
    } as unknown as ReturnType<typeof useThoughtRecords>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.topDistortions).toEqual([
      { key: "d1", count: 4 },
      { key: "d2", count: 3 },
      { key: "d3", count: 2 },
    ]);
  });

  it("breaks ties alphabetically by key", () => {
    // aaa and bbb both appear twice; aaa should come first
    const records = Array.from({ length: 5 }, (_, i) =>
      makeThoughtRecord(`t${i}`, i < 2 ? ["aaa"] : i < 4 ? ["bbb"] : [], `thought ${i}`),
    );
    mockUseThoughtRecords.mockReturnValue({
      data: records,
    } as unknown as ReturnType<typeof useThoughtRecords>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.topDistortions[0].key).toBe("aaa");
    expect(result.current.topDistortions[1].key).toBe("bbb");
  });
});

// ---------------------------------------------------------------------------
// Tests: exerciseMoodLift
// ---------------------------------------------------------------------------
describe("useCbtInsights - exerciseMoodLift", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupEmptyMocks();
  });

  it("returns null when selfCareLogs is undefined", () => {
    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.exerciseMoodLift).toBeNull();
  });

  it("returns null when fewer than 7 self care logs", () => {
    mockUseSelfCareLogs.mockReturnValue({
      data: Array.from({ length: 6 }, (_, i) => makeSelfCareLog(`2026-05-0${i + 1}`, true)),
    } as unknown as ReturnType<typeof useSelfCareLogs>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.exerciseMoodLift).toBeNull();
  });

  it("returns null when no exercise days have mood data", () => {
    const selfCareLogs = Array.from({ length: 7 }, (_, i) =>
      makeSelfCareLog(`2026-05-${String(i + 1).padStart(2, "0")}`, i % 2 === 0),
    );
    mockUseSelfCareLogs.mockReturnValue({ data: selfCareLogs } as unknown as ReturnType<
      typeof useSelfCareLogs
    >);
    // No mood logs
    mockUseMoodLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useMoodHistory>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.exerciseMoodLift).toBeNull();
  });

  it("computes averaged and rounded mood lift for exercise vs no exercise days", () => {
    const selfCareLogs = [
      makeSelfCareLog("2026-05-01", true),
      makeSelfCareLog("2026-05-02", true),
      makeSelfCareLog("2026-05-03", false),
      makeSelfCareLog("2026-05-04", false),
      makeSelfCareLog("2026-05-05", true),
      makeSelfCareLog("2026-05-06", false),
      makeSelfCareLog("2026-05-07", true),
    ];
    const moodLogs = [
      // exercise days (01, 02, 05, 07): mood 8, 7, 9, 6 → avg = 7.5
      { id: "m1", userId: "u1", loggedAt: "2026-05-01T08:00:00Z", moodScore: 8 },
      { id: "m2", userId: "u1", loggedAt: "2026-05-02T08:00:00Z", moodScore: 7 },
      { id: "m5", userId: "u1", loggedAt: "2026-05-05T08:00:00Z", moodScore: 9 },
      { id: "m7", userId: "u1", loggedAt: "2026-05-07T08:00:00Z", moodScore: 6 },
      // non-exercise days (03, 04, 06): mood 4, 5, 3 → avg = 4
      { id: "m3", userId: "u1", loggedAt: "2026-05-03T08:00:00Z", moodScore: 4 },
      { id: "m4", userId: "u1", loggedAt: "2026-05-04T08:00:00Z", moodScore: 5 },
      { id: "m6", userId: "u1", loggedAt: "2026-05-06T08:00:00Z", moodScore: 3 },
    ];

    mockUseSelfCareLogs.mockReturnValue({ data: selfCareLogs } as unknown as ReturnType<
      typeof useSelfCareLogs
    >);
    mockUseMoodLogs.mockReturnValue({ data: moodLogs } as unknown as ReturnType<
      typeof useMoodHistory
    >);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.exerciseMoodLift).toEqual({ withExercise: 7.5, withoutExercise: 4 });
  });
});

// ---------------------------------------------------------------------------
// Tests: activityMoodLiftByCategory
// ---------------------------------------------------------------------------
describe("useCbtInsights - activityMoodLiftByCategory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupEmptyMocks();
  });

  it("returns [] when fewer than 3 completed activities with mood data", () => {
    mockUseActivities.mockReturnValue({
      data: [
        {
          id: "a1",
          userId: "u1",
          activityName: "run",
          category: "pleasure",
          paceCategory: null,
          scheduledAt: null,
          completedAt: "2026-05-01T00:00:00Z",
          moodBefore: 5,
          moodAfter: 7,
          notes: "",
          createdAt: "2026-05-01T00:00:00Z",
          updatedAt: "2026-05-01T00:00:00Z",
        },
        {
          id: "a2",
          userId: "u1",
          activityName: "walk",
          category: "pleasure",
          paceCategory: null,
          scheduledAt: null,
          completedAt: null,
          moodBefore: null,
          moodAfter: null,
          notes: "",
          createdAt: "2026-05-02T00:00:00Z",
          updatedAt: "2026-05-02T00:00:00Z",
        },
      ],
    } as unknown as ReturnType<typeof useActivities>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.activityMoodLiftByCategory).toEqual([]);
  });

  it("averages mood lift by category and sorts desc by averageLift", () => {
    mockUseActivities.mockReturnValue({
      data: [
        // mastery category: lifts +3, +5 → avg 4
        {
          id: "a1",
          userId: "u1",
          activityName: "a1",
          category: "mastery",
          paceCategory: null,
          scheduledAt: null,
          completedAt: "2026-05-01T00:00:00Z",
          moodBefore: 4,
          moodAfter: 7,
          notes: "",
          createdAt: "2026-05-01T00:00:00Z",
          updatedAt: "2026-05-01T00:00:00Z",
        },
        {
          id: "a2",
          userId: "u1",
          activityName: "a2",
          category: "mastery",
          paceCategory: null,
          scheduledAt: null,
          completedAt: "2026-05-02T00:00:00Z",
          moodBefore: 3,
          moodAfter: 8,
          notes: "",
          createdAt: "2026-05-02T00:00:00Z",
          updatedAt: "2026-05-02T00:00:00Z",
        },
        // pleasure category: lift +1 → avg 1
        {
          id: "a3",
          userId: "u1",
          activityName: "a3",
          category: "pleasure",
          paceCategory: null,
          scheduledAt: null,
          completedAt: "2026-05-03T00:00:00Z",
          moodBefore: 5,
          moodAfter: 6,
          notes: "",
          createdAt: "2026-05-03T00:00:00Z",
          updatedAt: "2026-05-03T00:00:00Z",
        },
      ],
    } as unknown as ReturnType<typeof useActivities>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    const lifts = result.current.activityMoodLiftByCategory;
    expect(lifts[0]).toMatchObject({ category: "mastery", averageLift: 4, count: 2 });
    expect(lifts[1]).toMatchObject({ category: "pleasure", averageLift: 1, count: 1 });
  });
});

// ---------------------------------------------------------------------------
// Tests: recurringThoughtSuggestions
// ---------------------------------------------------------------------------
describe("useCbtInsights - recurringThoughtSuggestions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupEmptyMocks();
  });

  it("returns [] when thoughtRecords.length < 5", () => {
    mockUseThoughtRecords.mockReturnValue({
      data: Array.from({ length: 4 }, (_, i) => makeThoughtRecord(`t${i}`, [], "thought")),
    } as unknown as ReturnType<typeof useThoughtRecords>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.recurringThoughtSuggestions).toEqual([]);
  });

  it("surfaces thoughts appearing >= 2 times after normalization", () => {
    const records = [
      makeThoughtRecord("t1", [], "I am not good enough"),
      makeThoughtRecord("t2", [], "I am not good enough!"), // normalizes to same
      makeThoughtRecord("t3", [], "nobody likes me"),
      makeThoughtRecord("t4", [], "nobody likes me."), // normalizes to same
      makeThoughtRecord("t5", [], "unique thought here"), // unique
    ];
    mockUseThoughtRecords.mockReturnValue({
      data: records,
    } as unknown as ReturnType<typeof useThoughtRecords>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    const suggestions = result.current.recurringThoughtSuggestions;
    expect(suggestions).toHaveLength(2);
    expect(suggestions.every((s) => s.count >= 2)).toBe(true);
  });

  it("skips thoughts with normalized length < 8", () => {
    const records = [
      makeThoughtRecord("t1", [], "Hi"), // too short
      makeThoughtRecord("t2", [], "Hi"),
      makeThoughtRecord("t3", [], "I am worthless and alone"),
      makeThoughtRecord("t4", [], "I am worthless and alone"),
      makeThoughtRecord("t5", [], "something else entirely"),
    ];
    mockUseThoughtRecords.mockReturnValue({
      data: records,
    } as unknown as ReturnType<typeof useThoughtRecords>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    const suggestions = result.current.recurringThoughtSuggestions;
    // "Hi" (2 chars) should be filtered
    expect(suggestions.every((s) => s.thought.length >= 8)).toBe(true);
  });

  it("returns at most 2 suggestions", () => {
    // 3 recurring thoughts - only top 2 should surface
    const records = [
      makeThoughtRecord("t1", [], "I am not good enough"),
      makeThoughtRecord("t2", [], "I am not good enough"),
      makeThoughtRecord("t3", [], "nobody likes me at all"),
      makeThoughtRecord("t4", [], "nobody likes me at all"),
      makeThoughtRecord("t5", [], "everything always goes wrong"),
    ];
    // need 5 total thought records; add duplicates of the 3rd:
    records.push(makeThoughtRecord("t6", [], "everything always goes wrong"));

    mockUseThoughtRecords.mockReturnValue({
      data: records,
    } as unknown as ReturnType<typeof useThoughtRecords>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.recurringThoughtSuggestions.length).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Tests: beliefReviewSuggestions
// ---------------------------------------------------------------------------
describe("useCbtInsights - beliefReviewSuggestions", () => {
  beforeAll(() => jest.useFakeTimers({ now: new Date("2026-05-30T12:00:00.000Z") }));
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    jest.clearAllMocks();
    setupEmptyMocks();
  });

  const makeBelief = (
    id: string,
    nextReviewDate: string | null,
    alternativeBeliefStrength: number,
  ) => ({
    id,
    userId: "u1",
    beliefStatement: `belief ${id}`,
    triggeringSituations: [],
    evidenceFor: [],
    evidenceAgainst: [],
    alternativeBelief: "",
    originalBeliefStrength: 70,
    alternativeBeliefStrength,
    reinforcementPlan: "",
    nextReviewDate,
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  });

  it("returns [] when fewer than 3 beliefs", () => {
    mockUseCoreBeliefs.mockReturnValue({
      data: [makeBelief("b1", null, 20), makeBelief("b2", null, 10)],
    } as unknown as ReturnType<typeof useCoreBeliefs>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.beliefReviewSuggestions).toEqual([]);
  });

  it("includes beliefs with alternativeBeliefStrength <= 30", () => {
    mockUseCoreBeliefs.mockReturnValue({
      data: [
        makeBelief("b1", null, 20), // <= 30, include
        makeBelief("b2", null, 31), // > 30, only if due soon
        makeBelief("b3", null, 50), // > 30, not due
      ],
    } as unknown as ReturnType<typeof useCoreBeliefs>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    const ids = result.current.beliefReviewSuggestions.map((b) => b.id);
    expect(ids).toContain("b1");
    expect(ids).not.toContain("b3");
  });

  it("includes beliefs with nextReviewDate within 7 days from today", () => {
    // Clock is pinned to 2026-05-30T12:00:00.000Z via beforeAll
    // "soon": 2026-06-02 is 3 days ahead - within the 7-day window
    // "past": 2026-05-29 is already past - also within window (overdue)
    // "far":  2026-06-20 is 21 days ahead - outside the 7-day window
    const soon = "2026-06-02";
    const past = "2026-05-29";
    const far = "2026-06-20";

    mockUseCoreBeliefs.mockReturnValue({
      data: [
        makeBelief("b1", soon, 50), // due soon (within 7 days)
        makeBelief("b2", past, 50), // overdue (past due date, still within window)
        makeBelief("b3", far, 50), // not due soon
        makeBelief("b4", null, 50), // no review date and strength > 30
      ],
    } as unknown as ReturnType<typeof useCoreBeliefs>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    const ids = result.current.beliefReviewSuggestions.map((b) => b.id);
    expect(ids).toContain("b1");
    expect(ids).toContain("b2");
    expect(ids).not.toContain("b3");
    expect(ids).not.toContain("b4");
  });
});

// ---------------------------------------------------------------------------
// Tests: selfCareTrend
// ---------------------------------------------------------------------------
describe("useCbtInsights - selfCareTrend", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupEmptyMocks();
  });

  it("returns null when fewer than 5 self care logs", () => {
    mockUseSelfCareLogs.mockReturnValue({
      data: Array.from({ length: 4 }, (_, i) => makeSelfCareLog(`2026-05-0${i + 1}`, false)),
    } as unknown as ReturnType<typeof useSelfCareLogs>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.selfCareTrend).toBeNull();
  });

  it("computes exerciseDays, socialDays, totalDays from top 7 logs", () => {
    const logs = [
      makeSelfCareLog("2026-05-07", true, true),
      makeSelfCareLog("2026-05-06", false, false),
      makeSelfCareLog("2026-05-05", true, true),
      makeSelfCareLog("2026-05-04", false, false),
      makeSelfCareLog("2026-05-03", true, false),
      makeSelfCareLog("2026-05-02", false, false),
      makeSelfCareLog("2026-05-01", false, false),
      // 8th log - should not be counted (only top 7)
      makeSelfCareLog("2026-04-30", true, true),
    ];
    mockUseSelfCareLogs.mockReturnValue({ data: logs } as unknown as ReturnType<
      typeof useSelfCareLogs
    >);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    const trend = result.current.selfCareTrend!;
    expect(trend.totalDays).toBe(7);
    expect(trend.exerciseDays).toBe(3);
    expect(trend.socialDays).toBe(2);
  });

  it("counts gratitudeDays from gratitude entries within the 7-day window", () => {
    const logs = Array.from({ length: 7 }, (_, i) =>
      makeSelfCareLog(`2026-05-${String(i + 1).padStart(2, "0")}`, false),
    );
    mockUseSelfCareLogs.mockReturnValue({ data: logs } as unknown as ReturnType<
      typeof useSelfCareLogs
    >);

    // 2 gratitude entries in window, 1 out of window
    mockUseGratitudeEntries.mockReturnValue({
      data: [
        {
          id: "g1",
          userId: "u1",
          loggedAt: "2026-05-03T08:00:00Z",
          entry: "grateful 1",
          isFavorite: false,
          createdAt: "2026-05-03T00:00:00Z",
          updatedAt: "2026-05-03T00:00:00Z",
        },
        {
          id: "g2",
          userId: "u1",
          loggedAt: "2026-05-05T08:00:00Z",
          entry: "grateful 2",
          isFavorite: false,
          createdAt: "2026-05-05T00:00:00Z",
          updatedAt: "2026-05-05T00:00:00Z",
        },
        {
          id: "g3",
          userId: "u1",
          loggedAt: "2026-04-30T08:00:00Z",
          entry: "outside window",
          isFavorite: false,
          createdAt: "2026-04-30T00:00:00Z",
          updatedAt: "2026-04-30T00:00:00Z",
        },
      ],
    } as unknown as ReturnType<typeof useGratitudeEntries>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.selfCareTrend?.gratitudeDays).toBe(2);
  });

  it("averages sleep duration within the 7-day window (rounded to tenth)", () => {
    const logs = Array.from({ length: 7 }, (_, i) =>
      makeSelfCareLog(`2026-05-${String(i + 1).padStart(2, "0")}`, false),
    );
    mockUseSelfCareLogs.mockReturnValue({ data: logs } as unknown as ReturnType<
      typeof useSelfCareLogs
    >);

    // 2 sleep logs in window: 480 min (8h) and 420 min (7h) → avg 7.5h
    mockUseSleepLogs.mockReturnValue({
      data: [
        {
          id: "s1",
          userId: "u1",
          durationMinutes: 480,
          quality: 8,
          notes: "",
          loggedAt: "2026-05-02T07:00:00Z",
          createdAt: "2026-05-02T00:00:00Z",
        },
        {
          id: "s2",
          userId: "u1",
          durationMinutes: 420,
          quality: 7,
          notes: "",
          loggedAt: "2026-05-04T07:00:00Z",
          createdAt: "2026-05-04T00:00:00Z",
        },
      ],
    } as unknown as ReturnType<typeof useSleepLogs>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.selfCareTrend?.averageSleepHours).toBe(7.5);
  });
});

// ---------------------------------------------------------------------------
// Tests: angerPattern
// ---------------------------------------------------------------------------
describe("useCbtInsights - angerPattern", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupEmptyMocks();
  });

  const makeAngerLog = (id: string, arousalLevel: number, urge: string, timeOutTaken = false) => ({
    id,
    userId: "u1",
    triggerText: "trigger",
    interpretation: "interp",
    arousalLevel,
    urge,
    behaviorChosen: "",
    consequence: "",
    timeOutTaken,
    alternativeInterpretation: "",
    outcomeRating: null,
    notes: "",
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  });

  it("returns null when fewer than 3 anger logs", () => {
    mockUseAngerLogs.mockReturnValue({
      data: [makeAngerLog("a1", 7, "shout"), makeAngerLog("a2", 8, "shout")],
    } as unknown as ReturnType<typeof useAngerLogs>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.angerPattern).toBeNull();
  });

  it("averages arousal, counts timeouts, and identifies most common urge", () => {
    mockUseAngerLogs.mockReturnValue({
      data: [
        makeAngerLog("a1", 6, "shout", true),
        makeAngerLog("a2", 8, "shout", false),
        makeAngerLog("a3", 7, "leave", true),
      ],
    } as unknown as ReturnType<typeof useAngerLogs>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    const pattern = result.current.angerPattern!;
    expect(pattern.totalLogs).toBe(3);
    expect(pattern.averageArousal).toBe(7);
    expect(pattern.timeOutsTaken).toBe(2);
    expect(pattern.commonUrge).toBe("shout");
  });

  it("breaks ties in commonUrge alphabetically", () => {
    mockUseAngerLogs.mockReturnValue({
      data: [
        makeAngerLog("a1", 5, "aaa"),
        makeAngerLog("a2", 5, "bbb"),
        makeAngerLog("a3", 5, "ccc"),
      ],
    } as unknown as ReturnType<typeof useAngerLogs>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    // All urges appear once; aaa comes first alphabetically
    expect(result.current.angerPattern?.commonUrge).toBe("aaa");
  });
});

// ---------------------------------------------------------------------------
// Tests: exposureProgress
// ---------------------------------------------------------------------------
describe("useCbtInsights - exposureProgress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupEmptyMocks();
  });

  it("returns null when no exposure items", () => {
    mockUseAllExposureItems.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useAllExposureItems
    >);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.exposureProgress).toBeNull();
  });

  it("counts completed and total items", () => {
    mockUseAllExposureItems.mockReturnValue({
      data: [
        {
          id: "e1",
          userId: "u1",
          hierarchyId: "h1",
          description: "",
          sudsLevel: null,
          order: 0,
          completedAt: "2026-05-01T00:00:00Z",
          notes: "",
          createdAt: "2026-05-01T00:00:00Z",
          updatedAt: "2026-05-01T00:00:00Z",
        },
        {
          id: "e2",
          userId: "u1",
          hierarchyId: "h1",
          description: "",
          sudsLevel: null,
          order: 1,
          completedAt: null,
          notes: "",
          createdAt: "2026-05-01T00:00:00Z",
          updatedAt: "2026-05-01T00:00:00Z",
        },
        {
          id: "e3",
          userId: "u1",
          hierarchyId: "h1",
          description: "",
          sudsLevel: null,
          order: 2,
          completedAt: null,
          notes: "",
          createdAt: "2026-05-01T00:00:00Z",
          updatedAt: "2026-05-01T00:00:00Z",
        },
      ],
    } as unknown as ReturnType<typeof useAllExposureItems>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.exposureProgress).toEqual({ completed: 1, total: 3 });
  });
});

// ---------------------------------------------------------------------------
// Tests: slogan
// ---------------------------------------------------------------------------
describe("useCbtInsights - slogan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupEmptyMocks();
  });

  it("returns empty string when no recovery plan", () => {
    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.slogan).toBe("");
  });

  it("returns trimmed personalSlogan from recovery plan", () => {
    mockUseRecoveryPlan.mockReturnValue({
      data: { personalSlogan: "  Onwards and upwards!  ", updatedAt: "2026-05-01T00:00:00Z" },
    } as unknown as ReturnType<typeof useRecoveryPlan>);

    const { result } = renderHook(() => useCbtInsights("user-1"));
    expect(result.current.slogan).toBe("Onwards and upwards!");
  });
});

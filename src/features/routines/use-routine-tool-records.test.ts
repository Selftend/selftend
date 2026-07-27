import { renderHook } from "@testing-library/react-native";

import { stripWindowStartKey, useRoutineToolRecords } from "./use-routine-tool-records";
import {
  useAllActionSteps,
  useBullsEyeSnapshots,
  useChoicePoints,
  useCommittedActions,
  useConnectionLogs,
  useDefusionLogs,
  useExpansionLogs,
  useObservingSelfSessions,
  useUrgeSurfLogs,
} from "@/src/features/act/queries";
import { useRecentCompletedActivities } from "@/src/features/activities/queries";
import { useRecentExposureSessions } from "@/src/features/exposure/queries";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { useHabitLogs } from "@/src/features/habits/queries";
import { useJournalEntries } from "@/src/features/journal/queries";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useMoodHistory } from "@/src/features/mood/queries";
import { useSleepLogs } from "@/src/features/sleep/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { lastNDayKeys } from "@/src/utils/date";

jest.mock("@/src/features/mood/queries", () => ({ useMoodHistory: jest.fn() }));
jest.mock("@/src/features/journal/queries", () => ({ useJournalEntries: jest.fn() }));
jest.mock("@/src/features/gratitude/queries", () => ({ useGratitudeEntries: jest.fn() }));
jest.mock("@/src/features/sleep/queries", () => ({ useSleepLogs: jest.fn() }));
jest.mock("@/src/features/cbt/queries", () => ({ useThoughtRecords: jest.fn() }));
jest.mock("@/src/features/mindfulness/queries", () => ({ useMindfulnessSessions: jest.fn() }));
jest.mock("@/src/features/meditation/queries", () => ({ useMeditationSessions: jest.fn() }));
jest.mock("@/src/features/habits/queries", () => ({ useHabitLogs: jest.fn() }));
jest.mock("@/src/features/activities/queries", () => ({
  useRecentCompletedActivities: jest.fn(),
}));
jest.mock("@/src/features/exposure/queries", () => ({ useRecentExposureSessions: jest.fn() }));
jest.mock("@/src/features/act/queries", () => ({
  useDefusionLogs: jest.fn(),
  useExpansionLogs: jest.fn(),
  useUrgeSurfLogs: jest.fn(),
  useConnectionLogs: jest.fn(),
  useObservingSelfSessions: jest.fn(),
  useBullsEyeSnapshots: jest.fn(),
  useChoicePoints: jest.fn(),
  useCommittedActions: jest.fn(),
  useAllActionSteps: jest.fn(),
}));

const hookMocks = [
  useMoodHistory,
  useJournalEntries,
  useGratitudeEntries,
  useSleepLogs,
  useThoughtRecords,
  useMindfulnessSessions,
  useMeditationSessions,
  useHabitLogs,
  useRecentCompletedActivities,
  useRecentExposureSessions,
  useDefusionLogs,
  useExpansionLogs,
  useUrgeSurfLogs,
  useConnectionLogs,
  useObservingSelfSessions,
  useBullsEyeSnapshots,
  useChoicePoints,
  useCommittedActions,
  useAllActionSteps,
] as jest.Mock[];

describe("useRoutineToolRecords", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const mock of hookMocks) mock.mockReturnValue({ data: undefined });
  });

  it("enables only the queries the referenced tools need", () => {
    renderHook(() => useRoutineToolRecords("user-1", ["mood", "grounding"]));

    expect(useMoodHistory).toHaveBeenCalledWith("user-1");
    // Grounding shares the mindfulness store, so its query is live too.
    expect(useMindfulnessSessions).toHaveBeenCalledWith("user-1", 250);
    // Everything unreferenced stays disabled via the null-userId convention.
    expect(useJournalEntries).toHaveBeenCalledWith(null, 250);
    expect(useGratitudeEntries).toHaveBeenCalledWith(null, 250);
    expect(useSleepLogs).toHaveBeenCalledWith(null, 250);
    expect(useThoughtRecords).toHaveBeenCalledWith(null);
    expect(useMeditationSessions).toHaveBeenCalledWith(null, 250);
    expect(useHabitLogs).toHaveBeenCalledWith(null, { sinceDate: stripWindowStartKey() });
    expect(useRecentCompletedActivities).toHaveBeenCalledWith(null, 250);
    expect(useRecentExposureSessions).toHaveBeenCalledWith(null, 250);
    expect(useDefusionLogs).toHaveBeenCalledWith(null, 250);
    expect(useExpansionLogs).toHaveBeenCalledWith(null, 250);
    expect(useUrgeSurfLogs).toHaveBeenCalledWith(null, 250);
    expect(useConnectionLogs).toHaveBeenCalledWith(null, 250);
    expect(useObservingSelfSessions).toHaveBeenCalledWith(null);
    expect(useBullsEyeSnapshots).toHaveBeenCalledWith(null);
    expect(useChoicePoints).toHaveBeenCalledWith(null);
    expect(useCommittedActions).toHaveBeenCalledWith(null);
    expect(useAllActionSteps).toHaveBeenCalledWith(null);
  });

  it("enables the mindfulness query for breathing steps as well", () => {
    renderHook(() => useRoutineToolRecords("user-1", ["breathing"]));
    expect(useMindfulnessSessions).toHaveBeenCalledWith("user-1", 250);
  });

  it("enables the connection query for either connection or dropAnchor steps", () => {
    renderHook(() => useRoutineToolRecords("user-1", ["dropAnchor"]));
    // Drop anchor's log lives in the connection store (technique dropAnchor).
    expect(useConnectionLogs).toHaveBeenCalledWith("user-1", 250);

    jest.clearAllMocks();
    for (const mock of hookMocks) mock.mockReturnValue({ data: undefined });
    renderHook(() => useRoutineToolRecords("user-1", ["connection"]));
    expect(useConnectionLogs).toHaveBeenCalledWith("user-1", 250);
  });

  it("a committedAction step enables both the actions and the action-steps queries", () => {
    renderHook(() => useRoutineToolRecords("user-1", ["committedAction"]));
    expect(useCommittedActions).toHaveBeenCalledWith("user-1");
    expect(useAllActionSteps).toHaveBeenCalledWith("user-1");
  });

  it("fetches windows wide enough for the 7-day strip", () => {
    renderHook(() =>
      useRoutineToolRecords("user-1", [
        "mood",
        "journal",
        "gratitude",
        "sleep",
        "breathing",
        "meditation",
        "habits",
        "activities",
        "exposure",
        "defusion",
        "expansion",
        "urgeSurf",
        "connection",
      ]),
    );

    // Count-limited lists widen to 250 newest rows (>= 7 days even at heavy
    // use); habit logs mirror habits' own strip with a date window that
    // starts exactly 7 local days back (today inclusive).
    expect(useJournalEntries).toHaveBeenCalledWith("user-1", 250);
    expect(useGratitudeEntries).toHaveBeenCalledWith("user-1", 250);
    expect(useSleepLogs).toHaveBeenCalledWith("user-1", 250);
    expect(useMindfulnessSessions).toHaveBeenCalledWith("user-1", 250);
    expect(useMeditationSessions).toHaveBeenCalledWith("user-1", 250);
    expect(useHabitLogs).toHaveBeenCalledWith("user-1", { sinceDate: lastNDayKeys(7)[0] });
    // Activities derive from completion, so the window is completed_at-based
    // (the scheduled_at-ordered default list can miss a recent completion).
    expect(useRecentCompletedActivities).toHaveBeenCalledWith("user-1", 250);
    expect(useRecentExposureSessions).toHaveBeenCalledWith("user-1", 250);
    // These ACT hooks include the limit in their query key, so the wide
    // routines window can't collide with the 30-row list screens.
    expect(useDefusionLogs).toHaveBeenCalledWith("user-1", 250);
    expect(useExpansionLogs).toHaveBeenCalledWith("user-1", 250);
    expect(useUrgeSurfLogs).toHaveBeenCalledWith("user-1", 250);
    expect(useConnectionLogs).toHaveBeenCalledWith("user-1", 250);
    // Mood rides the canonical 200-row history window.
    expect(useMoodHistory).toHaveBeenCalledWith("user-1");
  });

  it("shares the default-limit cache entries for ACT hooks whose key excludes the limit", () => {
    renderHook(() => useRoutineToolRecords("user-1", ["observingSelf", "choicePoint"]));

    // Called WITHOUT a limit override: one cache entry shared with the ACT
    // program/list screens instead of racing them under the same key.
    expect(useObservingSelfSessions).toHaveBeenCalledWith("user-1");
    expect(useChoicePoints).toHaveBeenCalledWith("user-1");
  });

  it("maps each query's data onto the derive-engine record slices", () => {
    const moodLogs = [{ dayKey: "2026-07-15" }];
    const habitLogs = [{ loggedOn: "2026-07-15" }];
    const defusionLogs = [{ createdAt: "2026-07-15T09:00:00.000Z" }];
    const actionSteps = [{ createdAt: "2026-07-15T10:00:00.000Z", completedAt: null }];
    (useMoodHistory as jest.Mock).mockReturnValue({ data: moodLogs });
    (useHabitLogs as jest.Mock).mockReturnValue({ data: habitLogs });
    (useDefusionLogs as jest.Mock).mockReturnValue({ data: defusionLogs });
    (useAllActionSteps as jest.Mock).mockReturnValue({ data: actionSteps });

    const { result } = renderHook(() =>
      useRoutineToolRecords("user-1", ["mood", "habits", "defusion", "committedAction"]),
    );

    expect(result.current.moodLogs).toBe(moodLogs);
    expect(result.current.habitLogs).toBe(habitLogs);
    expect(result.current.defusionLogs).toBe(defusionLogs);
    expect(result.current.actionSteps).toBe(actionSteps);
    expect(result.current.journalEntries).toBeUndefined();
    expect(result.current.exposureSessions).toBeUndefined();
  });

  it("keeps every query disabled when signed out", () => {
    renderHook(() =>
      useRoutineToolRecords(null, ["mood", "breathing", "habits", "defusion", "committedAction"]),
    );
    for (const mock of hookMocks) {
      expect(mock.mock.calls[0][0]).toBeNull();
    }
  });
});

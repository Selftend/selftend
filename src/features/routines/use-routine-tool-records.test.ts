import { renderHook } from "@testing-library/react-native";

import { stripWindowStartKey, useRoutineToolRecords } from "./use-routine-tool-records";
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

const hookMocks = [
  useMoodHistory,
  useJournalEntries,
  useGratitudeEntries,
  useSleepLogs,
  useThoughtRecords,
  useMindfulnessSessions,
  useMeditationSessions,
  useHabitLogs,
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
  });

  it("enables the mindfulness query for breathing steps as well", () => {
    renderHook(() => useRoutineToolRecords("user-1", ["breathing"]));
    expect(useMindfulnessSessions).toHaveBeenCalledWith("user-1", 250);
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
    // Mood rides the canonical 200-row history window.
    expect(useMoodHistory).toHaveBeenCalledWith("user-1");
  });

  it("maps each query's data onto the derive-engine record slices", () => {
    const moodLogs = [{ loggedAt: "2026-07-15T08:00:00.000Z" }];
    const habitLogs = [{ loggedOn: "2026-07-15" }];
    (useMoodHistory as jest.Mock).mockReturnValue({ data: moodLogs });
    (useHabitLogs as jest.Mock).mockReturnValue({ data: habitLogs });

    const { result } = renderHook(() => useRoutineToolRecords("user-1", ["mood", "habits"]));

    expect(result.current.moodLogs).toBe(moodLogs);
    expect(result.current.habitLogs).toBe(habitLogs);
    expect(result.current.journalEntries).toBeUndefined();
  });

  it("keeps every query disabled when signed out", () => {
    renderHook(() => useRoutineToolRecords(null, ["mood", "breathing", "habits"]));
    for (const mock of hookMocks) {
      expect(mock.mock.calls[0][0]).toBeNull();
    }
  });
});

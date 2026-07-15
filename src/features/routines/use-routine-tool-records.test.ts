import { renderHook } from "@testing-library/react-native";

import { useRoutineToolRecords } from "./use-routine-tool-records";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { useHabitLogs } from "@/src/features/habits/queries";
import { useJournalEntries } from "@/src/features/journal/queries";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useSleepLogs } from "@/src/features/sleep/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";

jest.mock("@/src/features/mood/queries", () => ({ useMoodLogs: jest.fn() }));
jest.mock("@/src/features/journal/queries", () => ({ useJournalEntries: jest.fn() }));
jest.mock("@/src/features/gratitude/queries", () => ({ useGratitudeEntries: jest.fn() }));
jest.mock("@/src/features/sleep/queries", () => ({ useSleepLogs: jest.fn() }));
jest.mock("@/src/features/cbt/queries", () => ({ useThoughtRecords: jest.fn() }));
jest.mock("@/src/features/mindfulness/queries", () => ({ useMindfulnessSessions: jest.fn() }));
jest.mock("@/src/features/meditation/queries", () => ({ useMeditationSessions: jest.fn() }));
jest.mock("@/src/features/habits/queries", () => ({ useHabitLogs: jest.fn() }));

const hookMocks = [
  useMoodLogs,
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

    expect(useMoodLogs).toHaveBeenCalledWith("user-1");
    // Grounding shares the mindfulness store, so its query is live too.
    expect(useMindfulnessSessions).toHaveBeenCalledWith("user-1");
    // Everything unreferenced stays disabled via the null-userId convention.
    expect(useJournalEntries).toHaveBeenCalledWith(null);
    expect(useGratitudeEntries).toHaveBeenCalledWith(null);
    expect(useSleepLogs).toHaveBeenCalledWith(null);
    expect(useThoughtRecords).toHaveBeenCalledWith(null);
    expect(useMeditationSessions).toHaveBeenCalledWith(null);
    expect(useHabitLogs).toHaveBeenCalledWith(null);
  });

  it("enables the mindfulness query for breathing steps as well", () => {
    renderHook(() => useRoutineToolRecords("user-1", ["breathing"]));
    expect(useMindfulnessSessions).toHaveBeenCalledWith("user-1");
  });

  it("maps each query's data onto the derive-engine record slices", () => {
    const moodLogs = [{ loggedAt: "2026-07-15T08:00:00.000Z" }];
    const habitLogs = [{ loggedOn: "2026-07-15" }];
    (useMoodLogs as jest.Mock).mockReturnValue({ data: moodLogs });
    (useHabitLogs as jest.Mock).mockReturnValue({ data: habitLogs });

    const { result } = renderHook(() => useRoutineToolRecords("user-1", ["mood", "habits"]));

    expect(result.current.moodLogs).toBe(moodLogs);
    expect(result.current.habitLogs).toBe(habitLogs);
    expect(result.current.journalEntries).toBeUndefined();
  });

  it("keeps every query disabled when signed out", () => {
    renderHook(() => useRoutineToolRecords(null, ["mood", "breathing", "habits"]));
    for (const mock of hookMocks) {
      expect(mock).toHaveBeenCalledWith(null);
    }
  });
});

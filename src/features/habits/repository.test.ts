import {
  getHabit,
  listHabitLogs,
  saveHabit,
  toggleHabitLog,
} from "@/src/features/habits/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

const baseInput = {
  name: "Read",
  kind: "build" as const,
  identity: "I'm a reader",
  cuePlan: "I will read at 8pm.",
  stackAfter: "After dinner",
  cravingPairing: "Only podcast while folding laundry",
  twoMinuteVersion: "Read one page",
  rewardNote: "Tick the box",
  cadence: "daily" as const,
  customDays: [],
  color: "primary" as const,
};

const insertedHabitRow = {
  id: "h-1",
  user_id: "user-1",
  name: "Read",
  kind: "build" as const,
  identity: "I'm a reader",
  cue_plan: "I will read at 8pm.",
  stack_after: "After dinner",
  craving_pairing: "Only podcast while folding laundry",
  two_minute_version: "Read one page",
  reward_note: "Tick the box",
  cadence: "daily" as const,
  custom_days: [],
  color: "primary" as const,
  archived_at: null,
  created_at: "2026-05-17T08:00:00.000Z",
  updated_at: "2026-05-17T08:00:00.000Z",
};

describe("habits repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null from getHabit for a malformed id without calling supabase", async () => {
    // The habit detail screen feeds the route id here; a malformed id would 400 on
    // PostgREST's uuid cast (console error), so it must short-circuit to not-found.
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getHabit("user-1", "does-not-exist")).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("returns no logs from listHabitLogs for a malformed habitId without calling supabase", async () => {
    // The habit detail screen also queries logs by the same route id (the second of
    // the doomed requests QA saw); it must short-circuit to the zero-rows result too.
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      listHabitLogs("user-1", { habitId: "does-not-exist", sinceDate: "2026-04-01" }),
    ).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("inserts a new habit, trims strings, and maps the row back to camelCase", async () => {
    const single = jest.fn().mockResolvedValue({ data: insertedHabitRow, error: null });
    const selectAfter = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select: selectAfter }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await saveHabit("user-1", {
      ...baseInput,
      name: "  Read  ",
      identity: "  I'm a reader  ",
    });

    expect(from).toHaveBeenCalledWith("habits");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        name: "Read",
        identity: "I'm a reader",
        cadence: "daily",
        custom_days: [],
      }),
    );
    expect(result).toMatchObject({
      id: "h-1",
      userId: "user-1",
      name: "Read",
      cadence: "daily",
      color: "primary",
    });
  });

  it("normalises custom_days when cadence is custom and keeps them empty otherwise", async () => {
    const single = jest.fn().mockResolvedValue({ data: insertedHabitRow, error: null });
    const selectAfter = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select: selectAfter }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveHabit("user-1", { ...baseInput, cadence: "custom", customDays: [5, 1, 1, 3] });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        cadence: "custom",
        custom_days: [1, 3, 5],
      }),
    );
  });

  it("deletes an existing tick when toggling the same date a second time", async () => {
    const existing = {
      id: "log-1",
      user_id: "user-1",
      habit_id: "h-1",
      logged_on: "2026-05-17",
      note: "",
      created_at: "2026-05-17T08:00:00.000Z",
      updated_at: "2026-05-17T08:00:00.000Z",
    };

    const maybeSingle = jest.fn().mockResolvedValue({ data: existing, error: null });
    const eqLoggedOn = jest.fn(() => ({ maybeSingle }));
    const eqHabit = jest.fn(() => ({ eq: eqLoggedOn }));
    const eqUser = jest.fn(() => ({ eq: eqHabit }));
    const select = jest.fn(() => ({ eq: eqUser }));

    const eqDeleteId = jest.fn().mockResolvedValue({ error: null });
    const eqDeleteUser = jest.fn(() => ({ eq: eqDeleteId }));
    const del = jest.fn(() => ({ eq: eqDeleteUser }));

    const from = jest.fn(() => ({ select, delete: del }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(toggleHabitLog("user-1", "h-1", "2026-05-17")).resolves.toEqual({
      log: null,
      ticked: false,
    });
    expect(eqDeleteUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqDeleteId).toHaveBeenCalledWith("id", "log-1");
  });

  it("inserts a new tick when toggling a date with no existing log", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqLoggedOn = jest.fn(() => ({ maybeSingle }));
    const eqHabit = jest.fn(() => ({ eq: eqLoggedOn }));
    const eqUser = jest.fn(() => ({ eq: eqHabit }));
    const select = jest.fn(() => ({ eq: eqUser }));

    const inserted = {
      id: "log-1",
      user_id: "user-1",
      habit_id: "h-1",
      logged_on: "2026-05-17",
      note: "",
      created_at: "2026-05-17T08:00:00.000Z",
      updated_at: "2026-05-17T08:00:00.000Z",
    };
    const single = jest.fn().mockResolvedValue({ data: inserted, error: null });
    const selectAfterInsert = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select: selectAfterInsert }));

    const from = jest.fn(() => ({ select, insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(toggleHabitLog("user-1", "h-1", "2026-05-17")).resolves.toMatchObject({
      ticked: true,
      log: { id: "log-1", habitId: "h-1", loggedOn: "2026-05-17" },
    });
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      habit_id: "h-1",
      logged_on: "2026-05-17",
      note: "",
    });
  });
});

import {
  archiveHabit,
  deleteHabit,
  getHabit,
  listHabits,
  listHabitLogs,
  restoreHabit,
  saveHabit,
  toggleHabitLog,
  upsertHabitLogNote,
} from "@/src/features/habits/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

const VALID_ID = "11111111-1111-4111-8111-111111111111";

function buildClient(builders: Record<string, unknown>) {
  return { from: jest.fn((t: string) => builders[t]) } as unknown as ReturnType<
    typeof requireSupabase
  >;
}

const habitLogRow = {
  id: "log-1",
  user_id: "user-1",
  habit_id: "h-1",
  logged_on: "2026-05-17",
  note: "done",
  created_at: "2026-05-17T08:00:00.000Z",
  updated_at: "2026-05-17T08:00:00.000Z",
};

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

  it("listHabits filters out archived rows by default and maps them", async () => {
    const is = jest.fn().mockResolvedValue({ data: [insertedHabitRow], error: null });
    const order = jest.fn(() => ({ is }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { select } }));

    const result = await listHabits("user-1");

    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(is).toHaveBeenCalledWith("archived_at", null);
    expect(result).toEqual([expect.objectContaining({ id: "h-1", userId: "user-1" })]);
  });

  it("listHabits includes archived rows without the archived_at filter", async () => {
    const order = jest.fn().mockResolvedValue({ data: [insertedHabitRow], error: null });
    const is = jest.fn();
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { select } }));

    const result = await listHabits("user-1", true);

    expect(is).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("listHabits throws when the query errors", async () => {
    const is = jest.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
    const order = jest.fn(() => ({ is }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { select } }));

    await expect(listHabits("user-1")).rejects.toMatchObject({ code: "42501" });
  });

  it("getHabit maps a found row for a valid uuid", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: insertedHabitRow, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { select } }));

    const result = await getHabit("user-1", VALID_ID);

    expect(eqId).toHaveBeenCalledWith("id", VALID_ID);
    expect(result).toMatchObject({ id: "h-1", userId: "user-1" });
  });

  it("getHabit defaults custom_days to an empty array when the row has null", async () => {
    const maybeSingle = jest
      .fn()
      .mockResolvedValue({ data: { ...insertedHabitRow, custom_days: null }, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { select } }));

    const result = await getHabit("user-1", VALID_ID);

    expect(result).toMatchObject({ id: "h-1", customDays: [] });
  });

  it("getHabit returns null when no row is found", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { select } }));

    await expect(getHabit("user-1", VALID_ID)).resolves.toBeNull();
  });

  it("getHabit throws when the lookup errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { select } }));

    await expect(getHabit("user-1", VALID_ID)).rejects.toMatchObject({ code: "42501" });
  });

  it("saveHabit updates the existing habit when a habitId is passed", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: insertedHabitRow, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const insert = jest.fn();
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { update, insert } }));

    const result = await saveHabit("user-1", baseInput, "h-1");

    expect(insert).not.toHaveBeenCalled();
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "h-1");
    const payload = (update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({ name: "Read", cadence: "daily" });
    expect(payload).not.toHaveProperty("user_id");
    expect(result).toMatchObject({ id: "h-1" });
  });

  it("saveHabit throws Habit not found when the update returns no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { update } }));

    await expect(saveHabit("user-1", baseInput, "h-1")).rejects.toThrow("Habit not found");
  });

  it("saveHabit throws when the write errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ maybeSingle }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { insert } }));

    await expect(saveHabit("user-1", baseInput)).rejects.toMatchObject({ code: "23505" });
  });

  it("archiveHabit stamps archived_at and maps the row", async () => {
    const single = jest.fn().mockResolvedValue({ data: insertedHabitRow, error: null });
    const select = jest.fn(() => ({ single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { update } }));

    const result = await archiveHabit("user-1", "h-1");

    const payload = (update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(typeof payload.archived_at).toBe("string");
    expect(eqId).toHaveBeenCalledWith("id", "h-1");
    expect(result).toMatchObject({ id: "h-1" });
  });

  it("archiveHabit throws when the update errors", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
    const select = jest.fn(() => ({ single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { update } }));

    await expect(archiveHabit("user-1", "h-1")).rejects.toMatchObject({ code: "42501" });
  });

  it("restoreHabit clears archived_at and maps the row", async () => {
    const single = jest.fn().mockResolvedValue({ data: insertedHabitRow, error: null });
    const select = jest.fn(() => ({ single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { update } }));

    const result = await restoreHabit("user-1", "h-1");

    expect(update).toHaveBeenCalledWith({ archived_at: null });
    expect(result).toMatchObject({ id: "h-1" });
  });

  it("restoreHabit throws when the update errors", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
    const select = jest.fn(() => ({ single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { update } }));

    await expect(restoreHabit("user-1", "h-1")).rejects.toMatchObject({ code: "42501" });
  });

  it("deleteHabit issues a scoped delete", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { delete: del } }));

    await expect(deleteHabit("user-1", "h-1")).resolves.toBeUndefined();
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "h-1");
  });

  it("deleteHabit throws when the delete errors", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: { code: "42501" } });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habits: { delete: del } }));

    await expect(deleteHabit("user-1", "h-1")).rejects.toMatchObject({ code: "42501" });
  });

  it("listHabitLogs lists all logs when no options are passed", async () => {
    const orderId = jest.fn().mockResolvedValue({ data: [habitLogRow], error: null });
    const orderDay = jest.fn(() => ({ order: orderId }));
    const eqUser = jest.fn(() => ({ order: orderDay }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habit_logs: { select } }));

    const result = await listHabitLogs("user-1");

    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(orderDay).toHaveBeenCalledWith("logged_on", { ascending: false });
    expect(result).toEqual([expect.objectContaining({ id: "log-1", note: "done" })]);
  });

  it("listHabitLogs breaks ties on id, so a page boundary cannot duplicate or skip a row", async () => {
    // `logged_on` is a `date` with one row per habit per day, so every habit
    // ticked on the same day ties on it. Postgres gives no stable order among
    // ties across separate statements, so a paged read ordered on it alone can
    // hand the same row back twice - or lose it - when a tied group straddles
    // a page boundary.
    const orderId = jest.fn().mockResolvedValue({ data: [habitLogRow], error: null });
    const orderDay = jest.fn(() => ({ order: orderId }));
    const eqUser = jest.fn(() => ({ order: orderDay }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habit_logs: { select } }));

    await listHabitLogs("user-1");

    expect(orderId).toHaveBeenCalledWith("id", { ascending: false });
  });

  it("listHabitLogs applies habitId, sinceDate and limit filters together", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [habitLogRow], error: null });
    const gte = jest.fn(() => ({ limit }));
    const eqHabit = jest.fn(() => ({ gte }));
    const orderId = jest.fn(() => ({ eq: eqHabit }));
    const orderDay = jest.fn(() => ({ order: orderId }));
    const eqUser = jest.fn(() => ({ order: orderDay }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habit_logs: { select } }));

    const result = await listHabitLogs("user-1", {
      habitId: VALID_ID,
      sinceDate: "2026-04-01",
      limit: 10,
    });

    expect(eqHabit).toHaveBeenCalledWith("habit_id", VALID_ID);
    expect(gte).toHaveBeenCalledWith("logged_on", "2026-04-01");
    expect(limit).toHaveBeenCalledWith(10);
    expect(result).toHaveLength(1);
  });

  it("listHabitLogs closes the range on untilDate, so one day can be asked for", async () => {
    // ⚠️ Rows come back newest-first, so `{ sinceDate: day, limit: n }` returns
    // the n NEWEST days at or after `day` - which omits `day` itself once it has
    // n newer ticks. The note editor hydrated from exactly that query, so its
    // field opened blank and saving overwrote a note that was already there.
    const lte = jest.fn().mockResolvedValue({ data: [habitLogRow], error: null });
    const gte = jest.fn(() => ({ lte }));
    const eqHabit = jest.fn(() => ({ gte }));
    const orderId = jest.fn(() => ({ eq: eqHabit }));
    const orderDay = jest.fn(() => ({ order: orderId }));
    const eqUser = jest.fn(() => ({ order: orderDay }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habit_logs: { select } }));

    const result = await listHabitLogs("user-1", {
      habitId: VALID_ID,
      sinceDate: "2026-04-01",
      untilDate: "2026-04-01",
    });

    expect(gte).toHaveBeenCalledWith("logged_on", "2026-04-01");
    expect(lte).toHaveBeenCalledWith("logged_on", "2026-04-01");
    expect(result).toHaveLength(1);
  });

  it("listHabitLogs pages with an inclusive range when an offset is given", async () => {
    const range = jest.fn().mockResolvedValue({ data: [habitLogRow], error: null });
    const orderId = jest.fn(() => ({ range }));
    const orderDay = jest.fn(() => ({ order: orderId }));
    const eqUser = jest.fn(() => ({ order: orderDay }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habit_logs: { select } }));

    await listHabitLogs("user-1", { limit: 50, offset: 50 });

    // Both bounds inclusive, hence 50..99 rather than 50..100.
    expect(range).toHaveBeenCalledWith(50, 99);
  });

  it("listHabitLogs throws when the query errors", async () => {
    const orderId = jest.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
    const orderDay = jest.fn(() => ({ order: orderId }));
    const eqUser = jest.fn(() => ({ order: orderDay }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habit_logs: { select } }));

    await expect(listHabitLogs("user-1")).rejects.toMatchObject({ code: "42501" });
  });

  it("toggleHabitLog throws when the lookup errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
    const eqLoggedOn = jest.fn(() => ({ maybeSingle }));
    const eqHabit = jest.fn(() => ({ eq: eqLoggedOn }));
    const eqUser = jest.fn(() => ({ eq: eqHabit }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ habit_logs: { select } }));

    await expect(toggleHabitLog("user-1", "h-1", "2026-05-17")).rejects.toMatchObject({
      code: "42501",
    });
  });

  it("toggleHabitLog throws when deleting the existing tick errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: habitLogRow, error: null });
    const eqLoggedOn = jest.fn(() => ({ maybeSingle }));
    const eqHabit = jest.fn(() => ({ eq: eqLoggedOn }));
    const eqUser = jest.fn(() => ({ eq: eqHabit }));
    const select = jest.fn(() => ({ eq: eqUser }));

    const eqDeleteId = jest.fn().mockResolvedValue({ error: { code: "42501" } });
    const eqDeleteUser = jest.fn(() => ({ eq: eqDeleteId }));
    const del = jest.fn(() => ({ eq: eqDeleteUser }));

    mockRequireSupabase.mockReturnValue(buildClient({ habit_logs: { select, delete: del } }));

    await expect(toggleHabitLog("user-1", "h-1", "2026-05-17")).rejects.toMatchObject({
      code: "42501",
    });
  });

  it("toggleHabitLog throws when inserting the new tick errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqLoggedOn = jest.fn(() => ({ maybeSingle }));
    const eqHabit = jest.fn(() => ({ eq: eqLoggedOn }));
    const eqUser = jest.fn(() => ({ eq: eqHabit }));
    const select = jest.fn(() => ({ eq: eqUser }));

    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const selectAfterInsert = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select: selectAfterInsert }));

    mockRequireSupabase.mockReturnValue(buildClient({ habit_logs: { select, insert } }));

    await expect(toggleHabitLog("user-1", "h-1", "2026-05-17")).rejects.toMatchObject({
      code: "23505",
    });
  });

  it("upsertHabitLogNote sanitises and trims the note then maps the row", async () => {
    const single = jest.fn().mockResolvedValue({ data: habitLogRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ habit_logs: { insert } }));

    const result = await upsertHabitLogNote("user-1", "h-1", "2026-05-17", "  keep going  ");

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "user-1",
      habit_id: "h-1",
      logged_on: "2026-05-17",
      note: "keep going",
    });
    expect(result).toMatchObject({ id: "log-1", note: "done" });
  });

  it("upsertHabitLogNote throws when the insert errors", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ habit_logs: { insert } }));

    await expect(upsertHabitLogNote("user-1", "h-1", "2026-05-17", "note")).rejects.toMatchObject({
      code: "23505",
    });
  });
});

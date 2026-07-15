import {
  addStep,
  createRoutine,
  deleteRoutine,
  getRoutine,
  listRoutinesWithSteps,
  removeStep,
  reorderSteps,
  updateRoutine,
} from "@/src/features/routines/repository";
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

const routineRow = {
  id: "r-1",
  user_id: "user-1",
  name: "Morning",
  reminder_enabled: false,
  reminder_hour: null,
  reminder_minute: null,
  reminder_timezone: null,
  created_at: "2026-07-15T08:00:00.000Z",
  updated_at: "2026-07-15T08:00:00.000Z",
};

const otherRoutineRow = { ...routineRow, id: "r-2", name: "Evening" };

const stepRow = {
  id: "s-1",
  routine_id: "r-1",
  user_id: "user-1",
  tool_id: "mood" as const,
  position: 0,
  created_at: "2026-07-15T08:00:00.000Z",
  updated_at: "2026-07-15T08:00:00.000Z",
};

const secondStepRow = { ...stepRow, id: "s-2", tool_id: "journal" as const, position: 1 };

describe("routines repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("listRoutinesWithSteps composes routines with their position-ordered steps", async () => {
    const routinesOrder = jest
      .fn()
      .mockResolvedValue({ data: [routineRow, otherRoutineRow], error: null });
    const routinesEq = jest.fn(() => ({ order: routinesOrder }));
    const routinesSelect = jest.fn(() => ({ eq: routinesEq }));

    const stepsOrder = jest.fn().mockResolvedValue({ data: [stepRow, secondStepRow], error: null });
    const stepsEq = jest.fn(() => ({ order: stepsOrder }));
    const stepsSelect = jest.fn(() => ({ eq: stepsEq }));

    const client = buildClient({
      routines: { select: routinesSelect },
      routine_steps: { select: stepsSelect },
    });
    mockRequireSupabase.mockReturnValue(client);

    const result = await listRoutinesWithSteps("user-1");

    expect((client.from as jest.Mock).mock.calls.map((c) => c[0])).toEqual([
      "routines",
      "routine_steps",
    ]);
    expect(routinesEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(routinesOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(stepsEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(stepsOrder).toHaveBeenCalledWith("position", { ascending: true });

    expect(result).toEqual([
      expect.objectContaining({
        id: "r-1",
        userId: "user-1",
        name: "Morning",
        reminderEnabled: false,
        steps: [
          expect.objectContaining({ id: "s-1", routineId: "r-1", toolId: "mood", position: 0 }),
          expect.objectContaining({ id: "s-2", routineId: "r-1", toolId: "journal", position: 1 }),
        ],
      }),
      // A routine with no rows in routine_steps still lists, with empty steps.
      expect.objectContaining({ id: "r-2", steps: [] }),
    ]);
  });

  it("listRoutinesWithSteps returns [] without querying steps when there are no routines", async () => {
    const routinesOrder = jest.fn().mockResolvedValue({ data: [], error: null });
    const routinesEq = jest.fn(() => ({ order: routinesOrder }));
    const routinesSelect = jest.fn(() => ({ eq: routinesEq }));
    const stepsSelect = jest.fn();
    const client = buildClient({
      routines: { select: routinesSelect },
      routine_steps: { select: stepsSelect },
    });
    mockRequireSupabase.mockReturnValue(client);

    await expect(listRoutinesWithSteps("user-1")).resolves.toEqual([]);
    expect(stepsSelect).not.toHaveBeenCalled();
  });

  it("listRoutinesWithSteps throws when the routines query errors", async () => {
    const routinesOrder = jest.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
    const routinesEq = jest.fn(() => ({ order: routinesOrder }));
    const routinesSelect = jest.fn(() => ({ eq: routinesEq }));
    mockRequireSupabase.mockReturnValue(buildClient({ routines: { select: routinesSelect } }));

    await expect(listRoutinesWithSteps("user-1")).rejects.toMatchObject({ code: "42501" });
  });

  it("listRoutinesWithSteps throws when the steps query errors", async () => {
    const routinesOrder = jest.fn().mockResolvedValue({ data: [routineRow], error: null });
    const routinesEq = jest.fn(() => ({ order: routinesOrder }));
    const routinesSelect = jest.fn(() => ({ eq: routinesEq }));

    const stepsOrder = jest.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
    const stepsEq = jest.fn(() => ({ order: stepsOrder }));
    const stepsSelect = jest.fn(() => ({ eq: stepsEq }));

    mockRequireSupabase.mockReturnValue(
      buildClient({
        routines: { select: routinesSelect },
        routine_steps: { select: stepsSelect },
      }),
    );

    await expect(listRoutinesWithSteps("user-1")).rejects.toMatchObject({ code: "42501" });
  });

  it("returns null from getRoutine for a malformed id without calling supabase", async () => {
    // The routine detail screen will feed the route id here; a malformed id would
    // 400 on PostgREST's uuid cast (console error), so it short-circuits to not-found.
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getRoutine("user-1", "does-not-exist")).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("getRoutine maps a found row with its steps ordered by position", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: routineRow, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const routinesSelect = jest.fn(() => ({ eq: eqUser }));

    const eqRoutine = jest.fn().mockResolvedValue({ data: [stepRow, secondStepRow], error: null });
    const stepsOrder = jest.fn(() => ({ eq: eqRoutine }));
    const stepsEqUser = jest.fn(() => ({ order: stepsOrder }));
    const stepsSelect = jest.fn(() => ({ eq: stepsEqUser }));

    mockRequireSupabase.mockReturnValue(
      buildClient({
        routines: { select: routinesSelect },
        routine_steps: { select: stepsSelect },
      }),
    );

    const result = await getRoutine("user-1", VALID_ID);

    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", VALID_ID);
    expect(stepsOrder).toHaveBeenCalledWith("position", { ascending: true });
    expect(eqRoutine).toHaveBeenCalledWith("routine_id", VALID_ID);
    expect(result).toMatchObject({
      id: "r-1",
      userId: "user-1",
      name: "Morning",
      steps: [
        expect.objectContaining({ toolId: "mood", position: 0 }),
        expect.objectContaining({ toolId: "journal", position: 1 }),
      ],
    });
  });

  it("getRoutine returns null when no row is found and does not fetch steps", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const routinesSelect = jest.fn(() => ({ eq: eqUser }));
    const stepsSelect = jest.fn();
    mockRequireSupabase.mockReturnValue(
      buildClient({
        routines: { select: routinesSelect },
        routine_steps: { select: stepsSelect },
      }),
    );

    await expect(getRoutine("user-1", VALID_ID)).resolves.toBeNull();
    expect(stepsSelect).not.toHaveBeenCalled();
  });

  it("getRoutine throws when the lookup errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const routinesSelect = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ routines: { select: routinesSelect } }));

    await expect(getRoutine("user-1", VALID_ID)).rejects.toMatchObject({ code: "42501" });
  });

  it("createRoutine inserts via the view with a trimmed name and maps the row back", async () => {
    const single = jest.fn().mockResolvedValue({ data: routineRow, error: null });
    const selectAfter = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select: selectAfter }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await createRoutine("user-1", { name: "  Morning  " });

    expect(from).toHaveBeenCalledWith("routines");
    // Omitted reminder fields stay out of the payload so the DB defaults apply.
    expect(insert).toHaveBeenCalledWith({ user_id: "user-1", name: "Morning" });
    expect(result).toMatchObject({
      id: "r-1",
      userId: "user-1",
      name: "Morning",
      reminderEnabled: false,
      reminderHour: null,
    });
  });

  it("createRoutine passes reminder fields through in snake_case when provided", async () => {
    const single = jest.fn().mockResolvedValue({ data: routineRow, error: null });
    const selectAfter = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select: selectAfter }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await createRoutine("user-1", {
      name: "Morning",
      reminderEnabled: true,
      reminderHour: 7,
      reminderMinute: 30,
      reminderTimezone: "Europe/Sofia",
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      name: "Morning",
      reminder_enabled: true,
      reminder_hour: 7,
      reminder_minute: 30,
      reminder_timezone: "Europe/Sofia",
    });
  });

  it("createRoutine throws when the insert errors", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23514" } });
    const selectAfter = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select: selectAfter }));
    mockRequireSupabase.mockReturnValue(buildClient({ routines: { insert } }));

    await expect(createRoutine("user-1", { name: "Morning" })).rejects.toMatchObject({
      code: "23514",
    });
  });

  it("updateRoutine sends only the supplied fields for a rename", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: routineRow, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ routines: { update } }));

    const result = await updateRoutine("user-1", "r-1", { name: "  Renamed  " });

    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "r-1");
    const payload = (update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toEqual({ name: "Renamed" });
    expect(payload).not.toHaveProperty("user_id");
    expect(result).toMatchObject({ id: "r-1" });
  });

  it("updateRoutine sends a reminder-only patch without touching the name", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: routineRow, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ routines: { update } }));

    await updateRoutine("user-1", "r-1", {
      reminderEnabled: true,
      reminderHour: 21,
      reminderMinute: 0,
      reminderTimezone: "Europe/Sofia",
    });

    const payload = (update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toEqual({
      reminder_enabled: true,
      reminder_hour: 21,
      reminder_minute: 0,
      reminder_timezone: "Europe/Sofia",
    });
    expect(payload).not.toHaveProperty("name");
  });

  it("updateRoutine throws Routine not found when the update returns no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ routines: { update } }));

    await expect(updateRoutine("user-1", "r-1", { name: "Renamed" })).rejects.toThrow(
      "Routine not found",
    );
  });

  it("updateRoutine throws when the write errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "23514" } });
    const select = jest.fn(() => ({ maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ routines: { update } }));

    await expect(updateRoutine("user-1", "r-1", { name: "x" })).rejects.toMatchObject({
      code: "23514",
    });
  });

  it("deleteRoutine issues a scoped delete against the view", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ routines: { delete: del } }));

    await expect(deleteRoutine("user-1", "r-1")).resolves.toBeUndefined();
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "r-1");
  });

  it("deleteRoutine throws when the delete errors", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: { code: "42501" } });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ routines: { delete: del } }));

    await expect(deleteRoutine("user-1", "r-1")).rejects.toMatchObject({ code: "42501" });
  });

  it("addStep inserts a fully scoped step row and maps it back", async () => {
    const single = jest.fn().mockResolvedValue({ data: stepRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await addStep("user-1", "r-1", "mood", 0);

    expect(from).toHaveBeenCalledWith("routine_steps");
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      routine_id: "r-1",
      tool_id: "mood",
      position: 0,
    });
    expect(result).toEqual({
      id: "s-1",
      routineId: "r-1",
      userId: "user-1",
      toolId: "mood",
      position: 0,
      createdAt: "2026-07-15T08:00:00.000Z",
      updatedAt: "2026-07-15T08:00:00.000Z",
    });
  });

  it("addStep throws when the insert errors", async () => {
    // The RLS with-check makes "routine doesn't exist" and "routine is someone
    // else's" the same 42501; both must surface to the caller.
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ routine_steps: { insert } }));

    await expect(addStep("user-1", "r-1", "mood", 0)).rejects.toMatchObject({ code: "42501" });
  });

  it("removeStep issues a scoped delete", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ routine_steps: { delete: del } }));

    await expect(removeStep("user-1", "s-1")).resolves.toBeUndefined();
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "s-1");
  });

  it("removeStep throws when the delete errors", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: { code: "42501" } });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ routine_steps: { delete: del } }));

    await expect(removeStep("user-1", "s-1")).rejects.toMatchObject({ code: "42501" });
  });

  it("reorderSteps writes each step's index as its position, fully scoped", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqRoutine = jest.fn(() => ({ eq: eqId }));
    const eqUser = jest.fn(() => ({ eq: eqRoutine }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ routine_steps: { update } }));

    await reorderSteps("user-1", "r-1", ["s-2", "s-1"]);

    expect(update.mock.calls.map((c) => (c as unknown as [unknown])[0])).toEqual([
      { position: 0 },
      { position: 1 },
    ]);
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqRoutine).toHaveBeenCalledWith("routine_id", "r-1");
    expect(eqId.mock.calls).toEqual([
      ["id", "s-2"],
      ["id", "s-1"],
    ]);
  });

  it("reorderSteps is a no-op for an empty id list", async () => {
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(reorderSteps("user-1", "r-1", [])).resolves.toBeUndefined();
    expect(from).not.toHaveBeenCalled();
  });

  it("reorderSteps throws when a position update errors", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: { code: "42501" } });
    const eqRoutine = jest.fn(() => ({ eq: eqId }));
    const eqUser = jest.fn(() => ({ eq: eqRoutine }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ routine_steps: { update } }));

    await expect(reorderSteps("user-1", "r-1", ["s-1"])).rejects.toMatchObject({ code: "42501" });
  });
});

import {
  completeMilestone,
  countActiveGoals,
  deleteMilestonesForGoal,
  getGoal,
  listGoals,
  listMilestones,
  saveGoal,
  saveMilestones,
  uncompleteMilestone,
  updateGoalStatus,
} from "@/src/features/goals/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

const goalRow = {
  id: "g-1",
  user_id: "user-1",
  title: "Run 5k",
  description: "Couch to 5k",
  life_domain: "health",
  goal_type: "outcome",
  target_date: "2026-09-01",
  status: "active",
  created_at: "2026-05-15T08:00:00.000Z",
  updated_at: "2026-05-15T08:00:00.000Z",
};

const milestoneRow = {
  id: "m-1",
  goal_id: "g-1",
  user_id: "user-1",
  description: "Run 1k",
  target_date: "2026-06-01",
  completed_at: null,
  created_at: "2026-05-15T08:00:00.000Z",
  updated_at: "2026-05-15T08:00:00.000Z",
};

describe("goals repository - goals", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists goals newest-first", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [goalRow], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listGoals("user-1");
    expect(from).toHaveBeenCalledWith("goals");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("returns null when getGoal finds nothing", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    // Well-formed uuid that matches no row, so the query itself runs (a malformed
    // id short-circuits to null before supabase).
    await expect(getGoal("user-1", "11111111-1111-4111-8111-111111111111")).resolves.toBeNull();
    expect(maybeSingle).toHaveBeenCalled();
  });

  it("trims title and description on insert", async () => {
    const single = jest.fn().mockResolvedValue({ data: goalRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveGoal("user-1", {
      title: "  Run 5k  ",
      description: "  Couch to 5k  ",
      lifeDomain: "health",
      goalType: "outcome",
      targetDate: "2026-09-01",
      valueKey: null,
    });
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Run 5k",
      description: "Couch to 5k",
      life_domain: "health",
      goal_type: "outcome",
      target_date: "2026-09-01",
      value_key: null,
    });
  });

  // #1287: the value key is one nullable pointer at every layer. A goal written before
  // the user has clarified any values - which the programme's first week asks for, goals
  // before values - has no key at all, and must read back that way rather than as "".
  it("maps the value key, and null when the goal is anchored to nothing", async () => {
    const anchored = { ...goalRow, value_key: "honest" };
    const limit = jest.fn().mockResolvedValue({ data: [anchored, goalRow], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const goals = await listGoals("user-1");
    expect(goals[0].valueKey).toBe("honest");
    expect(goals[1].valueKey).toBeNull();
  });

  it("sends the chosen value key on insert", async () => {
    const single = jest.fn().mockResolvedValue({ data: goalRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveGoal("user-1", {
      title: "Run 5k",
      description: "Couch to 5k",
      lifeDomain: "health",
      goalType: "outcome",
      targetDate: null,
      valueKey: "honest",
    });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ value_key: "honest" }));
  });

  it("updates an existing goal scoped to user and id", async () => {
    const single = jest.fn().mockResolvedValue({ data: goalRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveGoal(
      "user-1",
      {
        title: "Run 5k",
        description: "",
        lifeDomain: "health",
        goalType: "outcome",
        targetDate: null,
        valueKey: null,
      },
      "g-1",
    );
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "g-1");
    const calls = update.mock.calls as unknown as [{ target_date: string | null }][];
    expect(calls[0][0].target_date).toBeNull();
  });

  it("updateGoalStatus updates just status", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await updateGoalStatus("user-1", "g-1", "completed");
    expect(update).toHaveBeenCalledWith({ status: "completed" });
  });
});

describe("goals repository - milestones", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists milestones for a goal ordered by created_at asc", async () => {
    const goalId = "33333333-3333-4333-8333-333333333333";
    const order = jest.fn().mockResolvedValue({ data: [milestoneRow], error: null });
    const eqG = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ eq: eqG }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listMilestones("user-1", goalId);
    expect(eqG).toHaveBeenCalledWith("goal_id", goalId);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  it("returns no milestones for a malformed goal id without calling supabase", async () => {
    // The goal detail route feeds goalId straight from the URL; a malformed id would
    // 400 on PostgREST's uuid cast, so it must short-circuit to the zero-rows result.
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listMilestones("user-1", "does-not-exist")).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("trims and bulk-inserts milestones", async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveMilestones("user-1", "g-1", [
      { description: "  Run 1k  ", targetDate: "2026-06-01" },
      { description: "Run 3k", targetDate: null },
    ]);
    expect(insert).toHaveBeenCalledWith([
      {
        goal_id: "g-1",
        user_id: "user-1",
        description: "Run 1k",
        target_date: "2026-06-01",
      },
      { goal_id: "g-1", user_id: "user-1", description: "Run 3k", target_date: null },
    ]);
  });

  it("deletes all milestones for a goal scoped to user", async () => {
    const eqG = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqG }));
    const del = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ delete: del }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await deleteMilestonesForGoal("user-1", "g-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqG).toHaveBeenCalledWith("goal_id", "g-1");
  });

  it("completeMilestone sets completed_at; uncomplete clears it", async () => {
    const eqIdC = jest.fn().mockResolvedValue({ error: null });
    const eqUserC = jest.fn(() => ({ eq: eqIdC }));
    const updateC = jest.fn(() => ({ eq: eqUserC }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ update: updateC })),
    } as unknown as ReturnType<typeof requireSupabase>);
    await completeMilestone("user-1", "m-1");
    const completeCalls = updateC.mock.calls as unknown as [{ completed_at: string }][];
    expect(typeof completeCalls[0][0].completed_at).toBe("string");

    const eqIdU = jest.fn().mockResolvedValue({ error: null });
    const eqUserU = jest.fn(() => ({ eq: eqIdU }));
    const updateU = jest.fn(() => ({ eq: eqUserU }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ update: updateU })),
    } as unknown as ReturnType<typeof requireSupabase>);
    await uncompleteMilestone("user-1", "m-1");
    expect(updateU).toHaveBeenCalledWith({ completed_at: null });
  });
});

describe("goals repository - error and guard paths", () => {
  beforeEach(() => jest.clearAllMocks());

  it("listGoals maps rows and throws on a query error", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [goalRow], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ select })),
    } as unknown as ReturnType<typeof requireSupabase>);

    const rows = await listGoals("user-1");
    expect(rows).toEqual([
      {
        id: "g-1",
        userId: "user-1",
        title: "Run 5k",
        description: "Couch to 5k",
        lifeDomain: "health",
        goalType: "outcome",
        targetDate: "2026-09-01",
        status: "active",
        valueKey: null,
        createdAt: "2026-05-15T08:00:00.000Z",
        updatedAt: "2026-05-15T08:00:00.000Z",
      },
    ]);

    const errLimit = jest.fn().mockResolvedValue({ data: null, error: { code: "42P01" } });
    const errOrder = jest.fn(() => ({ limit: errLimit }));
    const errEq = jest.fn(() => ({ order: errOrder }));
    const errSelect = jest.fn(() => ({ eq: errEq }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ select: errSelect })),
    } as unknown as ReturnType<typeof requireSupabase>);
    await expect(listGoals("user-1")).rejects.toMatchObject({ code: "42P01" });
  });

  it("getGoal returns null for a malformed uuid without querying", async () => {
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getGoal("user-1", "not-a-uuid")).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("getGoal maps a found row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: goalRow, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ select })),
    } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getGoal("user-1", "11111111-1111-4111-8111-111111111111")).resolves.toMatchObject({
      id: "g-1",
      title: "Run 5k",
      lifeDomain: "health",
    });
  });

  it("getGoal throws when the query errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST301" } });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ select })),
    } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getGoal("user-1", "11111111-1111-4111-8111-111111111111")).rejects.toMatchObject({
      code: "PGRST301",
    });
  });

  it("saveGoal throws 'Goal not found' when an update matches no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ update })),
    } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveGoal(
        "user-1",
        {
          title: "Run 5k",
          description: "",
          lifeDomain: "health",
          goalType: "outcome",
          targetDate: null,
          valueKey: null,
        },
        "missing-goal",
      ),
    ).rejects.toThrow("Goal not found");
  });

  it("saveGoal throws on an insert error", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ maybeSingle }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ insert })),
    } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveGoal("user-1", {
        title: "Run 5k",
        description: "Couch to 5k",
        lifeDomain: "health",
        goalType: "outcome",
        targetDate: "2026-09-01",
        valueKey: null,
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("updateGoalStatus throws on a query error", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: { code: "42501" } });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ update })),
    } as unknown as ReturnType<typeof requireSupabase>);

    await expect(updateGoalStatus("user-1", "g-1", "completed")).rejects.toMatchObject({
      code: "42501",
    });
  });

  it("listMilestones maps rows and throws on a query error", async () => {
    const goalId = "33333333-3333-4333-8333-333333333333";
    const order = jest.fn().mockResolvedValue({ data: [milestoneRow], error: null });
    const eqG = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ eq: eqG }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ select })),
    } as unknown as ReturnType<typeof requireSupabase>);

    const rows = await listMilestones("user-1", goalId);
    expect(rows).toEqual([
      {
        id: "m-1",
        goalId: "g-1",
        userId: "user-1",
        description: "Run 1k",
        targetDate: "2026-06-01",
        completedAt: null,
        createdAt: "2026-05-15T08:00:00.000Z",
        updatedAt: "2026-05-15T08:00:00.000Z",
      },
    ]);

    const errOrder = jest.fn().mockResolvedValue({ data: null, error: { code: "42P01" } });
    const errEqG = jest.fn(() => ({ order: errOrder }));
    const errEqUser = jest.fn(() => ({ eq: errEqG }));
    const errSelect = jest.fn(() => ({ eq: errEqUser }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ select: errSelect })),
    } as unknown as ReturnType<typeof requireSupabase>);
    await expect(listMilestones("user-1", goalId)).rejects.toMatchObject({ code: "42P01" });
  });

  it("saveMilestones throws on an insert error", async () => {
    const insert = jest.fn().mockResolvedValue({ error: { code: "23503" } });
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ insert })),
    } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveMilestones("user-1", "g-1", [{ description: "Run 1k", targetDate: null }]),
    ).rejects.toMatchObject({ code: "23503" });
  });

  it("deleteMilestonesForGoal throws on a query error", async () => {
    const eqG = jest.fn().mockResolvedValue({ error: { code: "42501" } });
    const eqUser = jest.fn(() => ({ eq: eqG }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ delete: del })),
    } as unknown as ReturnType<typeof requireSupabase>);

    await expect(deleteMilestonesForGoal("user-1", "g-1")).rejects.toMatchObject({
      code: "42501",
    });
  });

  it("completeMilestone throws on a query error", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: { code: "42501" } });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ update })),
    } as unknown as ReturnType<typeof requireSupabase>);

    await expect(completeMilestone("user-1", "m-1")).rejects.toMatchObject({ code: "42501" });
  });

  it("uncompleteMilestone throws on a query error", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: { code: "42501" } });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ update })),
    } as unknown as ReturnType<typeof requireSupabase>);

    await expect(uncompleteMilestone("user-1", "m-1")).rejects.toMatchObject({ code: "42501" });
  });
});

describe("countActiveGoals", () => {
  // A head count, not `listGoals().filter(...)`: ADR-0001 forbids deriving a lifetime
  // figure from a capped list, and the count decrypts nothing (#990).
  it("counts active goals with an exact head request", async () => {
    const eqStatus = jest.fn().mockResolvedValue({ count: 3, error: null });
    const eqUser = jest.fn(() => ({ eq: eqStatus }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countActiveGoals("user-1")).resolves.toBe(3);

    expect(from).toHaveBeenCalledWith("goals");
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqStatus).toHaveBeenCalledWith("status", "active");
  });

  it("treats a null count as zero", async () => {
    const eqStatus = jest.fn().mockResolvedValue({ count: null, error: null });
    const eqUser = jest.fn(() => ({ eq: eqStatus }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countActiveGoals("user-1")).resolves.toBe(0);
  });

  it("throws rather than reporting zero when the read fails", async () => {
    const eqStatus = jest.fn().mockResolvedValue({ count: null, error: { message: "boom" } });
    const eqUser = jest.fn(() => ({ eq: eqStatus }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countActiveGoals("user-1")).rejects.toEqual({ message: "boom" });
  });
});

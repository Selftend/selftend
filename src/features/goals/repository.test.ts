import {
  completeMilestone,
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
    const order = jest.fn().mockResolvedValue({ data: [goalRow], error: null });
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

    await expect(getGoal("user-1", "missing")).resolves.toBeNull();
  });

  it("trims title and description on insert", async () => {
    const single = jest.fn().mockResolvedValue({ data: goalRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveGoal("user-1", {
      title: "  Run 5k  ",
      description: "  Couch to 5k  ",
      lifeDomain: "health",
      goalType: "outcome",
      targetDate: "2026-09-01",
    });
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Run 5k",
      description: "Couch to 5k",
      life_domain: "health",
      goal_type: "outcome",
      target_date: "2026-09-01",
    });
  });

  it("updates an existing goal scoped to user and id", async () => {
    const single = jest.fn().mockResolvedValue({ data: goalRow, error: null });
    const select = jest.fn(() => ({ single }));
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
    const order = jest.fn().mockResolvedValue({ data: [milestoneRow], error: null });
    const eqG = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ eq: eqG }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listMilestones("user-1", "g-1");
    expect(eqG).toHaveBeenCalledWith("goal_id", "g-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
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

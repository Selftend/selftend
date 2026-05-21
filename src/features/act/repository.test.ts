import {
  deleteCommittedAction,
  getACTProgramState,
  listDefusionLogs,
  saveActionStep,
  saveCommittedAction,
  saveDefusionLog,
  toggleActionStep,
  updateCommittedAction,
  upsertACTProgramState,
  upsertValueEntry,
} from "@/src/features/act/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

function buildClient(builders: Record<string, unknown>) {
  return { from: jest.fn((table: string) => builders[table]) } as unknown as ReturnType<
    typeof requireSupabase
  >;
}

describe("act repository - getACTProgramState", () => {
  it("returns null when no row exists for the user", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_program_state: { select } }));

    expect(await getACTProgramState("u1")).toBeNull();
  });

  it("swallows missing-schema errors and returns null", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST205", message: "act_program_state not found" },
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_program_state: { select } }));

    expect(await getACTProgramState("u1")).toBeNull();
  });

  it("maps a returned row to a typed program state", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        user_id: "u1",
        active_principles: ["defusion", "values"],
        primary_concerns: ["anxiety"],
        myths_acknowledged: true,
        onboarding_completed_at: "2026-05-10T07:00:00.000Z",
        last_check_in_at: "2026-05-16T07:00:00.000Z",
        preferred_check_in_time: "19:00",
        created_at: "2026-05-10T07:00:00.000Z",
        updated_at: "2026-05-16T07:00:00.000Z",
      },
      error: null,
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_program_state: { select } }));

    const result = await getACTProgramState("u1");

    expect(result).toEqual({
      userId: "u1",
      activePrinciples: ["defusion", "values"],
      primaryConcerns: ["anxiety"],
      mythsAcknowledged: true,
      onboardingCompletedAt: "2026-05-10T07:00:00.000Z",
      lastCheckInAt: "2026-05-16T07:00:00.000Z",
      preferredCheckInTime: "19:00",
      createdAt: "2026-05-10T07:00:00.000Z",
      updatedAt: "2026-05-16T07:00:00.000Z",
    });
  });
});

describe("act repository - upsertACTProgramState", () => {
  it("only writes columns for fields present in the patch", async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        user_id: "u1",
        active_principles: ["defusion"],
        primary_concerns: [],
        myths_acknowledged: false,
        onboarding_completed_at: null,
        last_check_in_at: null,
        preferred_check_in_time: null,
        created_at: "2026-05-17T00:00:00.000Z",
        updated_at: "2026-05-17T00:00:00.000Z",
      },
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_program_state: { upsert } }));

    await upsertACTProgramState("u1", { activePrinciples: ["defusion"] });

    expect(upsert).toHaveBeenCalledTimes(1);
    const calls = upsert.mock.calls as unknown as [
      Record<string, unknown>,
      { onConflict: string },
    ][];
    const [payload, options] = calls[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      active_principles: ["defusion"],
    });
    expect(payload).not.toHaveProperty("primary_concerns");
    expect(payload).not.toHaveProperty("myths_acknowledged");
    expect(payload.updated_at).toEqual(expect.any(String));
    expect(options).toEqual({ onConflict: "user_id" });
  });
});

describe("act repository - saveDefusionLog", () => {
  it("trims text fields and writes nulls for omitted optional ratings", async () => {
    const row = {
      id: "log-1",
      user_id: "u1",
      fused_thought: "I am going to fail",
      thought_category: "selfJudgment",
      fusion_level_before: 80,
      technique_used: "havingTheThoughtThat",
      defused_version: "",
      fusion_level_after: null,
      notes: "",
      created_at: "2026-05-17T08:00:00.000Z",
      updated_at: "2026-05-17T08:00:00.000Z",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_defusion_logs: { insert } }));

    const result = await saveDefusionLog("u1", {
      fusedThought: "  I am going to fail  ",
      thoughtCategory: "selfJudgment",
      fusionLevelBefore: 80,
      techniqueUsed: "havingTheThoughtThat",
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "u1",
      fused_thought: "I am going to fail",
      thought_category: "selfJudgment",
      fusion_level_before: 80,
      technique_used: "havingTheThoughtThat",
      defused_version: "",
      fusion_level_after: null,
      notes: "",
    });
    expect(result.fusedThought).toBe("I am going to fail");
    expect(result.fusionLevelAfter).toBeNull();
  });
});

describe("act repository - listDefusionLogs", () => {
  it("returns an empty list when the table is missing", async () => {
    const limit = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: "relation act_defusion_logs missing" } });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_defusion_logs: { select } }));

    expect(await listDefusionLogs("u1")).toEqual([]);
  });
});

describe("act repository - value entries and committed actions", () => {
  it("upsertValueEntry trims text fields and uses (user_id, life_domain) as the conflict key", async () => {
    const row = {
      id: "v1",
      user_id: "u1",
      life_domain: "work",
      value_statement: "Being a present, patient leader",
      importance_rating: 9,
      current_alignment_rating: 6,
      current_actions_note: "weekly 1:1s",
      desired_actions_note: "daily check-ins",
      barriers: "calendar overload",
      created_at: "2026-05-17T08:00:00.000Z",
      updated_at: "2026-05-17T08:00:00.000Z",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_value_entries: { upsert } }));

    const result = await upsertValueEntry("u1", {
      lifeDomain: "work",
      valueStatement: "  Being a present, patient leader  ",
      importanceRating: 9,
      currentAlignmentRating: 6,
      currentActionsNote: "  weekly 1:1s  ",
      desiredActionsNote: "  daily check-ins ",
      barriers: " calendar overload ",
    });

    expect(upsert).toHaveBeenCalledTimes(1);
    const calls = upsert.mock.calls as unknown as [
      Record<string, unknown>,
      { onConflict: string },
    ][];
    const [payload, options] = calls[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      life_domain: "work",
      value_statement: "Being a present, patient leader",
      current_actions_note: "weekly 1:1s",
      desired_actions_note: "daily check-ins",
      barriers: "calendar overload",
      importance_rating: 9,
      current_alignment_rating: 6,
    });
    expect(options).toEqual({ onConflict: "user_id,life_domain" });
    expect(result.valueStatement).toBe("Being a present, patient leader");
  });

  it("saveCommittedAction defaults status to active and trims text", async () => {
    const row = {
      id: "a1",
      user_id: "u1",
      life_domain: "personalGrowth",
      title: "Walk three times this week",
      description: "",
      status: "active",
      target_date: null,
      obstacles: "",
      created_at: "2026-05-17T08:00:00.000Z",
      updated_at: "2026-05-17T08:00:00.000Z",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { insert } }));

    const result = await saveCommittedAction("u1", {
      lifeDomain: "personalGrowth",
      title: "  Walk three times this week  ",
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "u1",
      life_domain: "personalGrowth",
      title: "Walk three times this week",
      description: "",
      status: "active",
      target_date: null,
      obstacles: "",
    });
    expect(result.status).toBe("active");
  });

  it("updateCommittedAction only patches provided fields", async () => {
    const row = {
      id: "a1",
      user_id: "u1",
      life_domain: "work",
      title: "Existing",
      description: "",
      status: "completed",
      target_date: null,
      obstacles: "",
      created_at: "2026-05-17T08:00:00.000Z",
      updated_at: "2026-05-17T09:00:00.000Z",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { update } }));

    await updateCommittedAction("u1", "a1", { status: "completed" });

    expect(update).toHaveBeenCalledTimes(1);
    const calls = update.mock.calls as unknown as [Record<string, unknown>][];
    const [payload] = calls[0];
    expect(payload).toMatchObject({ status: "completed" });
    expect(payload).not.toHaveProperty("title");
    expect(payload).not.toHaveProperty("description");
    expect(payload.updated_at).toEqual(expect.any(String));
  });

  it("deleteCommittedAction scopes the delete by user and id", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { delete: del } }));

    await deleteCommittedAction("u1", "a1");

    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqId).toHaveBeenCalledWith("id", "a1");
  });
});

describe("act repository - action steps", () => {
  it("saveActionStep trims the description before insert", async () => {
    const row = {
      id: "s1",
      user_id: "u1",
      action_id: "a1",
      description: "Lay out shoes the night before",
      is_completed: false,
      completed_at: null,
      created_at: "2026-05-17T08:00:00.000Z",
      updated_at: "2026-05-17T08:00:00.000Z",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_action_steps: { insert } }));

    const result = await saveActionStep("u1", {
      actionId: "a1",
      description: "  Lay out shoes the night before  ",
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "u1",
      action_id: "a1",
      description: "Lay out shoes the night before",
    });
    expect(result.description).toBe("Lay out shoes the night before");
    expect(result.isCompleted).toBe(false);
  });

  it("toggleActionStep writes completed_at when marking done and null when reopening", async () => {
    const singleDone = jest.fn().mockResolvedValue({
      data: {
        id: "s1",
        user_id: "u1",
        action_id: "a1",
        description: "x",
        is_completed: true,
        completed_at: "2026-05-17T08:00:00.000Z",
        created_at: "2026-05-17T08:00:00.000Z",
        updated_at: "2026-05-17T08:00:00.000Z",
      },
      error: null,
    });
    const selectDone = jest.fn(() => ({ single: singleDone }));
    const eqIdDone = jest.fn(() => ({ select: selectDone }));
    const eqUserDone = jest.fn(() => ({ eq: eqIdDone }));
    const updateDone = jest.fn(() => ({ eq: eqUserDone }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_action_steps: { update: updateDone } }));
    await toggleActionStep("u1", "s1", true);
    const doneCalls = updateDone.mock.calls as unknown as [Record<string, unknown>][];
    expect(doneCalls[0][0]).toMatchObject({ is_completed: true });
    expect(doneCalls[0][0].completed_at).toEqual(expect.any(String));

    const singleOpen = jest.fn().mockResolvedValue({
      data: {
        id: "s1",
        user_id: "u1",
        action_id: "a1",
        description: "x",
        is_completed: false,
        completed_at: null,
        created_at: "2026-05-17T08:00:00.000Z",
        updated_at: "2026-05-17T08:00:00.000Z",
      },
      error: null,
    });
    const selectOpen = jest.fn(() => ({ single: singleOpen }));
    const eqIdOpen = jest.fn(() => ({ select: selectOpen }));
    const eqUserOpen = jest.fn(() => ({ eq: eqIdOpen }));
    const updateOpen = jest.fn(() => ({ eq: eqUserOpen }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_action_steps: { update: updateOpen } }));
    await toggleActionStep("u1", "s1", false);
    const openCalls = updateOpen.mock.calls as unknown as [Record<string, unknown>][];
    expect(openCalls[0][0]).toMatchObject({
      is_completed: false,
      completed_at: null,
    });
  });
});

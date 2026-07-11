import {
  deleteChallengePlan,
  getRecoveryPlan,
  listChallengePlans,
  saveChallengePlan,
  upsertRecoveryPlan,
} from "@/src/features/recovery/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

describe("recovery repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps a recovery plan row into the app type", async () => {
    const row = {
      created_at: "2026-05-01T10:00:00.000Z",
      id: "plan-1",
      maintenance_commitments: ["Weekly review"],
      personal_slogan: "Notice, choose, begin again.",
      recovery_keys: ["Walk first"],
      strategy_integration_notes: {
        thoughts: "Thought records slow me down.",
        unknown: 42,
      },
      updated_at: "2026-05-02T10:00:00.000Z",
      user_id: "user-1",
    };
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getRecoveryPlan("user-1")).resolves.toEqual({
      createdAt: "2026-05-01T10:00:00.000Z",
      id: "plan-1",
      maintenanceCommitments: ["Weekly review"],
      personalSlogan: "Notice, choose, begin again.",
      recoveryKeys: ["Walk first"],
      strategyIntegrationNotes: {
        thoughts: "Thought records slow me down.",
      },
      updatedAt: "2026-05-02T10:00:00.000Z",
      userId: "user-1",
    });
    expect(from).toHaveBeenCalledWith("recovery_plans");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("sanitizes recovery plan lists and notes before insert", async () => {
    const row = {
      created_at: "2026-05-01T10:00:00.000Z",
      id: "plan-1",
      maintenance_commitments: ["Weekly review"],
      personal_slogan: "Keep going",
      recovery_keys: ["Walk first"],
      strategy_integration_notes: { thoughts: "Use the record" },
      updated_at: "2026-05-02T10:00:00.000Z",
      user_id: "user-1",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    // recovery_plans is a decrypting VIEW: the client .insert()s and the INSTEAD OF
    // trigger resolves the per-user merge (a view can't be an ON CONFLICT target).
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await upsertRecoveryPlan("user-1", {
      maintenanceCommitments: [" Weekly review ", ""],
      personalSlogan: " Keep going ",
      recoveryKeys: [" Walk first ", " "],
      strategyIntegrationNotes: {
        activities: " ",
        thoughts: " Use the record ",
      },
    });

    expect(insert).toHaveBeenCalledWith({
      maintenance_commitments: ["Weekly review"],
      personal_slogan: "Keep going",
      recovery_keys: ["Walk first"],
      strategy_integration_notes: {
        thoughts: "Use the record",
      },
      user_id: "user-1",
    });
  });

  it("maps challenge plans in newest-first order", async () => {
    const rows = [
      {
        coping_steps: ["Text a friend"],
        created_at: "2026-05-04T10:00:00.000Z",
        id: "challenge-1",
        recovery_plan_id: "plan-1",
        challenge_description: "Hard week",
        updated_at: "2026-05-04T10:00:00.000Z",
        user_id: "user-1",
      },
    ];
    const limit = jest.fn().mockResolvedValue({ data: rows, error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listChallengePlans("user-1")).resolves.toEqual([
      {
        challengeDescription: "Hard week",
        copingSteps: ["Text a friend"],
        createdAt: "2026-05-04T10:00:00.000Z",
        id: "challenge-1",
        recoveryPlanId: "plan-1",
        updatedAt: "2026-05-04T10:00:00.000Z",
        userId: "user-1",
      },
    ]);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("updates and deletes only current-user challenge plans", async () => {
    const updatedRow = {
      challenge_description: "Hard week",
      coping_steps: ["Text a friend"],
      created_at: "2026-05-04T10:00:00.000Z",
      id: "challenge-1",
      recovery_plan_id: "plan-1",
      updated_at: "2026-05-04T10:00:00.000Z",
      user_id: "user-1",
    };
    const updateSingle = jest.fn().mockResolvedValue({ data: updatedRow, error: null });
    const updateSelect = jest.fn(() => ({ single: updateSingle, maybeSingle: updateSingle }));
    const updateEqId = jest.fn(() => ({ select: updateSelect }));
    const updateEqUser = jest.fn(() => ({ eq: updateEqId }));
    const update = jest.fn(() => ({ eq: updateEqUser }));
    const deleteEqId = jest.fn().mockResolvedValue({ error: null });
    const deleteEqUser = jest.fn(() => ({ eq: deleteEqId }));
    const deleteFn = jest.fn(() => ({ eq: deleteEqUser }));
    const from = jest.fn(() => ({ delete: deleteFn, update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveChallengePlan(
      "user-1",
      "plan-1",
      {
        challengeDescription: " Hard week ",
        copingSteps: [" Text a friend ", ""],
      },
      "challenge-1",
    );
    await deleteChallengePlan("user-1", "challenge-1");

    expect(update).toHaveBeenCalledWith({
      challenge_description: "Hard week",
      coping_steps: ["Text a friend"],
      recovery_plan_id: "plan-1",
      user_id: "user-1",
    });
    expect(updateEqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(updateEqId).toHaveBeenCalledWith("id", "challenge-1");
    expect(deleteEqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(deleteEqId).toHaveBeenCalledWith("id", "challenge-1");
  });

  it("getRecoveryPlan returns null when no row exists and coerces null list/notes columns", async () => {
    const row = {
      created_at: "2026-05-01T10:00:00.000Z",
      id: "plan-1",
      maintenance_commitments: null,
      personal_slogan: "Keep going",
      recovery_keys: null,
      strategy_integration_notes: null,
      updated_at: "2026-05-02T10:00:00.000Z",
      user_id: "user-1",
    };
    const nullMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const nullEq = jest.fn(() => ({ maybeSingle: nullMaybeSingle }));
    const nullSelect = jest.fn(() => ({ eq: nullEq }));
    const nullFrom = jest.fn(() => ({ select: nullSelect }));
    mockRequireSupabase.mockReturnValue({
      from: nullFrom,
    } as unknown as ReturnType<typeof requireSupabase>);
    await expect(getRecoveryPlan("user-1")).resolves.toBeNull();

    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    await expect(getRecoveryPlan("user-1")).resolves.toEqual({
      createdAt: "2026-05-01T10:00:00.000Z",
      id: "plan-1",
      maintenanceCommitments: [],
      personalSlogan: "Keep going",
      recoveryKeys: [],
      strategyIntegrationNotes: {},
      updatedAt: "2026-05-02T10:00:00.000Z",
      userId: "user-1",
    });
  });

  it("getRecoveryPlan rethrows a query error", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "42P01" } });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    await expect(getRecoveryPlan("user-1")).rejects.toMatchObject({ code: "42P01" });
  });

  it("upsertRecoveryPlan rethrows a query error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    await expect(
      upsertRecoveryPlan("user-1", {
        maintenanceCommitments: [],
        personalSlogan: "Keep going",
        recoveryKeys: [],
        strategyIntegrationNotes: {},
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("listChallengePlans rethrows a query error", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { code: "42P01" } });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    await expect(listChallengePlans("user-1")).rejects.toMatchObject({ code: "42P01" });
  });

  it("saveChallengePlan inserts a new plan when no id is given and coerces null coping_steps", async () => {
    const insertedRow = {
      challenge_description: "Hard week",
      coping_steps: null,
      created_at: "2026-05-04T10:00:00.000Z",
      id: "challenge-9",
      recovery_plan_id: "plan-1",
      updated_at: "2026-05-04T10:00:00.000Z",
      user_id: "user-1",
    };
    const maybeSingle = jest.fn().mockResolvedValue({ data: insertedRow, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveChallengePlan("user-1", "plan-1", {
        challengeDescription: " Hard week ",
        copingSteps: [" ", ""],
      }),
    ).resolves.toEqual({
      challengeDescription: "Hard week",
      copingSteps: [],
      createdAt: "2026-05-04T10:00:00.000Z",
      id: "challenge-9",
      recoveryPlanId: "plan-1",
      updatedAt: "2026-05-04T10:00:00.000Z",
      userId: "user-1",
    });
    expect(insert).toHaveBeenCalledWith({
      challenge_description: "Hard week",
      coping_steps: [],
      recovery_plan_id: "plan-1",
      user_id: "user-1",
    });
  });

  it("saveChallengePlan throws not-found when the update target is missing", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveChallengePlan(
        "user-1",
        "plan-1",
        { challengeDescription: "Hard week", copingSteps: [] },
        "challenge-1",
      ),
    ).rejects.toThrow("Challenge plan not found");
  });

  it("saveChallengePlan rethrows a query error", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ maybeSingle }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveChallengePlan("user-1", "plan-1", {
        challengeDescription: "Hard week",
        copingSteps: [],
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("deleteChallengePlan rethrows a query error", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: { code: "42P01" } });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const deleteFn = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ delete: deleteFn }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    await expect(deleteChallengePlan("user-1", "challenge-1")).rejects.toMatchObject({
      code: "42P01",
    });
  });
});

import {
  deleteCoreBelief,
  getCoreBelief,
  listCoreBeliefs,
  saveCoreBelief,
  updateBeliefStrength,
} from "@/src/features/beliefs/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

const sampleRow = {
  id: "b-1",
  user_id: "user-1",
  belief_statement: "I am not enough",
  triggering_situations: ["criticism"],
  evidence_for: ["got feedback"],
  evidence_against: ["was praised"],
  alternative_belief: "I am learning",
  original_belief_strength: 80,
  alternative_belief_strength: 30,
  reinforcement_plan: "review weekly",
  next_review_date: "2026-05-25",
  created_at: "2026-05-15T08:00:00.000Z",
  updated_at: "2026-05-15T08:00:00.000Z",
};

describe("beliefs repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists beliefs newest-first and coerces null arrays to empty arrays", async () => {
    const rowWithNulls = {
      ...sampleRow,
      triggering_situations: null,
      evidence_for: null,
      evidence_against: null,
    };
    const limit = jest.fn().mockResolvedValue({ data: [rowWithNulls], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await listCoreBeliefs("user-1");
    expect(result[0].triggeringSituations).toEqual([]);
    expect(result[0].evidenceFor).toEqual([]);
    expect(result[0].evidenceAgainst).toEqual([]);
    expect(from).toHaveBeenCalledWith("core_beliefs");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("returns null when getCoreBelief finds no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getCoreBelief("user-1", "missing")).resolves.toBeNull();
  });

  it("trims text fields and inserts a new belief", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveCoreBelief("user-1", {
      beliefStatement: "  I am not enough  ",
      triggeringSituations: ["criticism"],
      evidenceFor: ["got feedback"],
      evidenceAgainst: ["was praised"],
      alternativeBelief: "  I am learning  ",
      originalBeliefStrength: 80,
      alternativeBeliefStrength: 30,
      reinforcementPlan: "  review weekly  ",
      nextReviewDate: "2026-05-25",
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      belief_statement: "I am not enough",
      triggering_situations: ["criticism"],
      evidence_for: ["got feedback"],
      evidence_against: ["was praised"],
      alternative_belief: "I am learning",
      original_belief_strength: 80,
      alternative_belief_strength: 30,
      reinforcement_plan: "review weekly",
      next_review_date: "2026-05-25",
    });
  });

  it("updates an existing belief scoped to user and id", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveCoreBelief(
      "user-1",
      {
        beliefStatement: "x",
        triggeringSituations: [],
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeBelief: "y",
        originalBeliefStrength: 50,
        alternativeBeliefStrength: 50,
        reinforcementPlan: "",
        nextReviewDate: null,
      },
      "b-1",
    );

    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "b-1");
    const calls = update.mock.calls as unknown as [{ next_review_date: string | null }][];
    expect(calls[0][0].next_review_date).toBeNull();
  });

  it("deletes a belief scoped to the user and id", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ delete: del }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(deleteCoreBelief("user-1", "belief-1")).resolves.toBeUndefined();
    expect(from).toHaveBeenCalledWith("core_beliefs");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "belief-1");
  });

  it("updateBeliefStrength updates only strength fields", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await updateBeliefStrength("user-1", "b-1", 60, 40);

    expect(update).toHaveBeenCalledWith({
      original_belief_strength: 60,
      alternative_belief_strength: 40,
    });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "b-1");
  });
});

import {
  listWorryEntries,
  saveWorryEntry,
  toggleWorryResolved,
} from "@/src/features/worry/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

const sampleRow = {
  id: "w-1",
  user_id: "user-1",
  worry_statement: "I'll miss the deadline",
  worry_category: "real_problem",
  probability_estimate: 30,
  evidence_for: ["lots to do"],
  evidence_against: ["plan exists"],
  coping_statement: "I can ask for help",
  action_steps: ["ping team"],
  resolved: false,
  created_at: "2026-05-15T08:00:00.000Z",
  updated_at: "2026-05-15T08:00:00.000Z",
};

describe("worry repository", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists entries newest-first and coerces null arrays to empty arrays", async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ ...sampleRow, evidence_for: null, evidence_against: null, action_steps: null }],
      error: null,
    });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await listWorryEntries("user-1");
    expect(result[0].evidenceFor).toEqual([]);
    expect(result[0].evidenceAgainst).toEqual([]);
    expect(result[0].actionSteps).toEqual([]);
    expect(from).toHaveBeenCalledWith("worry_entries");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("trims statements and inserts a worry entry", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveWorryEntry("user-1", {
      worryStatement: "  I'll miss the deadline  ",
      worryCategory: "real_problem",
      probabilityEstimate: 30,
      evidenceFor: ["lots to do"],
      evidenceAgainst: ["plan exists"],
      copingStatement: "  I can ask for help  ",
      actionSteps: ["ping team"],
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        worry_statement: "I'll miss the deadline",
        worry_category: "real_problem",
        probability_estimate: 30,
        evidence_for: ["lots to do"],
        evidence_against: ["plan exists"],
        coping_statement: "I can ask for help",
        action_steps: ["ping team"],
      }),
    );
  });

  it("includes created_at when createdAt is provided", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveWorryEntry("user-1", {
      worryStatement: "x",
      worryCategory: "hypothetical",
      probabilityEstimate: null,
      evidenceFor: [],
      evidenceAgainst: [],
      copingStatement: "",
      actionSteps: [],
      createdAt: "2026-05-20T10:00:00.000Z",
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ created_at: "2026-05-20T10:00:00.000Z" }),
    );
  });

  it("coerces missing probability to null", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveWorryEntry("user-1", {
      worryStatement: "x",
      worryCategory: "hypothetical",
      probabilityEstimate: null,
      evidenceFor: [],
      evidenceAgainst: [],
      copingStatement: "",
      actionSteps: [],
    });
    const calls = insert.mock.calls as unknown as [{ probability_estimate: number | null }][];
    expect(calls[0][0].probability_estimate).toBeNull();
  });

  it("toggleWorryResolved updates just the resolved flag", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await toggleWorryResolved("user-1", "w-1", true);
    expect(update).toHaveBeenCalledWith({ resolved: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "w-1");
  });
});

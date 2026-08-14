import {
  deleteWorryEntry,
  getLatestWorryEntryAt,
  getWorryEntry,
  listWorryEntries,
  saveWorryEntry,
  toggleWorryResolved,
} from "@/src/features/worry/repository";
import { fetchLatestActivity } from "@/src/lib/latest-activity";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

jest.mock("@/src/lib/latest-activity", () => ({ fetchLatestActivity: jest.fn() }));

const mockFetchLatestActivity = jest.mocked(fetchLatestActivity);

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
    const limit = jest.fn().mockResolvedValue({
      data: [{ ...sampleRow, evidence_for: null, evidence_against: null, action_steps: null }],
      error: null,
    });
    const order = jest.fn(() => ({ limit }));
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
    const select = jest.fn(() => ({ single, maybeSingle: single }));
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
    const select = jest.fn(() => ({ single, maybeSingle: single }));
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
    const select = jest.fn(() => ({ single, maybeSingle: single }));
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

  it("getWorryEntry returns null when no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    // Well-formed uuid that matches no row, so the query itself runs (a malformed
    // id short-circuits to null before supabase).
    await expect(
      getWorryEntry("user-1", "11111111-1111-4111-8111-111111111111"),
    ).resolves.toBeNull();
    expect(maybeSingle).toHaveBeenCalled();
  });

  it("updates an existing worry when entryId is provided", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveWorryEntry(
      "user-1",
      {
        worryStatement: "w",
        worryCategory: "hypothetical",
        probabilityEstimate: 40,
        evidenceFor: [],
        evidenceAgainst: [],
        copingStatement: "",
        actionSteps: [],
      },
      "wor-1",
    );
    expect(update).toHaveBeenCalledTimes(1);
    expect(eqId).toHaveBeenCalledWith("id", "wor-1");
    const payload = (update as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("created_at");
  });

  it("deletes a worry scoped to user and id", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ delete: del }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    await expect(deleteWorryEntry("user-1", "wor-1")).resolves.toBeUndefined();
    expect(from).toHaveBeenCalledWith("worry_entries");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "wor-1");
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

describe("getLatestWorryEntryAt", () => {
  it("reads one row's created_at instead of the 500-row list (#990)", async () => {
    mockFetchLatestActivity.mockResolvedValue({
      at: "2026-07-27T08:00:00.000Z",
      offsetMinutes: null,
    });

    await expect(getLatestWorryEntryAt("user-1")).resolves.toEqual({
      at: "2026-07-27T08:00:00.000Z",
      offsetMinutes: null,
    });
    expect(mockFetchLatestActivity).toHaveBeenCalledWith({
      table: "worry_entries",
      userId: "user-1",
      column: "created_at",
    });
  });
});

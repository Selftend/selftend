import {
  deleteAngerLog,
  getAngerLog,
  listAngerLogs,
  saveAngerLog,
} from "@/src/features/anger/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

const sampleRow = {
  id: "ang-1",
  user_id: "user-1",
  trigger_text: "Car cut me off",
  interpretation: "They did it on purpose",
  arousal_level: 8,
  urge: "Honk",
  behavior_chosen: "Took a breath",
  consequence: "Calmed down",
  time_out_taken: true,
  alternative_interpretation: "Maybe distracted",
  outcome_rating: 6,
  notes: "felt better after",
  created_at: "2026-05-15T08:00:00.000Z",
  updated_at: "2026-05-15T08:00:00.000Z",
};

const sampleMapped = {
  id: "ang-1",
  userId: "user-1",
  triggerText: "Car cut me off",
  interpretation: "They did it on purpose",
  arousalLevel: 8,
  urge: "Honk",
  behaviorChosen: "Took a breath",
  consequence: "Calmed down",
  timeOutTaken: true,
  alternativeInterpretation: "Maybe distracted",
  outcomeRating: 6,
  notes: "felt better after",
  createdAt: "2026-05-15T08:00:00.000Z",
  updatedAt: "2026-05-15T08:00:00.000Z",
};

describe("anger repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists logs newest-first", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [sampleRow], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listAngerLogs("user-1")).resolves.toEqual([sampleMapped]);
    expect(from).toHaveBeenCalledWith("anger_logs");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("returns null when getAngerLog finds no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getAngerLog("user-1", "missing")).resolves.toBeNull();
  });

  it("trims free-text fields and inserts a new log", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveAngerLog("user-1", {
      triggerText: "  Car cut me off  ",
      interpretation: "  on purpose  ",
      arousalLevel: 8,
      urge: "  Honk  ",
      behaviorChosen: "  Took a breath  ",
      consequence: "  Calmed down  ",
      timeOutTaken: true,
      alternativeInterpretation: "  distracted  ",
      outcomeRating: 6,
      notes: "  better after  ",
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        trigger_text: "Car cut me off",
        interpretation: "on purpose",
        arousal_level: 8,
        urge: "Honk",
        behavior_chosen: "Took a breath",
        consequence: "Calmed down",
        time_out_taken: true,
        alternative_interpretation: "distracted",
        outcome_rating: 6,
        notes: "better after",
      }),
    );
  });

  it("includes created_at when createdAt is provided", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveAngerLog("user-1", {
      triggerText: "x",
      interpretation: "",
      arousalLevel: 1,
      urge: "",
      behaviorChosen: "",
      consequence: "",
      timeOutTaken: false,
      alternativeInterpretation: "",
      outcomeRating: null,
      notes: "",
      createdAt: "2026-05-20T10:00:00.000Z",
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ created_at: "2026-05-20T10:00:00.000Z" }),
    );
  });

  it("updates an existing log when logId is provided (no created_at moved)", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveAngerLog(
      "user-1",
      {
        triggerText: "t",
        interpretation: "",
        arousalLevel: 3,
        urge: "",
        behaviorChosen: "",
        consequence: "",
        timeOutTaken: false,
        alternativeInterpretation: "",
        outcomeRating: null,
        notes: "",
      },
      "ang-1",
    );

    expect(update).toHaveBeenCalledTimes(1);
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "ang-1");
    const payload = (update as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("created_at");
  });

  it("deletes a log scoped to user and id", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ delete: del }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(deleteAngerLog("user-1", "ang-1")).resolves.toBeUndefined();
    expect(from).toHaveBeenCalledWith("anger_logs");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "ang-1");
  });

  it("coerces null outcomeRating", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveAngerLog("user-1", {
      triggerText: "x",
      interpretation: "",
      arousalLevel: 1,
      urge: "",
      behaviorChosen: "",
      consequence: "",
      timeOutTaken: false,
      alternativeInterpretation: "",
      outcomeRating: null,
      notes: "",
    });

    const calls = insert.mock.calls as unknown as [{ outcome_rating: number | null }][];
    expect(calls[0][0].outcome_rating).toBeNull();
  });
});

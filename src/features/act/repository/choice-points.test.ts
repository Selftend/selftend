import {
  listChoicePoints,
  getChoicePoint,
  saveChoicePoint,
  deleteChoicePoint,
} from "@/src/features/act/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));
const mockRequireSupabase = jest.mocked(requireSupabase);

function buildClient(builders: Record<string, unknown>) {
  return { from: jest.fn((t: string) => builders[t]) } as unknown as ReturnType<
    typeof requireSupabase
  >;
}

const ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "u1",
  hooks: ["stress"],
  away_moves: ["scroll phone"],
  toward_moves: ["go for a walk"],
  notes: "n",
  created_at: "2026-05-10T07:00:00.000Z",
  updated_at: "2026-05-10T07:00:00.000Z",
};

describe("choice-points repository", () => {
  it("listChoicePoints maps rows with the default limit", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [ROW], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_choice_points: { select } }));

    const result = await listChoicePoints("u1");
    expect(result[0]).toMatchObject({ id: ROW.id, hooks: ROW.hooks });
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(30);
  });

  it("listChoicePoints degrades to [] on a missing-schema error", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_choice_points: { select } }));

    expect(await listChoicePoints("u1")).toEqual([]);
  });

  it("getChoicePoint returns null for an invalid uuid without querying", async () => {
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    expect(await getChoicePoint("u1", "not-a-uuid")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("getChoicePoint maps array columns to [] when the row has them null", async () => {
    const nullArraysRow = { ...ROW, hooks: null, away_moves: null, toward_moves: null };
    const maybeSingle = jest.fn().mockResolvedValue({ data: nullArraysRow, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_choice_points: { select } }));

    const result = await getChoicePoint("u1", ROW.id);
    expect(result).toMatchObject({ id: ROW.id, hooks: [], awayMoves: [], towardMoves: [] });
  });

  it("saveChoicePoint defaults omitted array columns to []", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_choice_points: { insert } }));

    await saveChoicePoint("u1", { notes: "  feeling stuck  " });

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      hooks: [],
      away_moves: [],
      toward_moves: [],
      notes: "feeling stuck",
    });
    expect(payload).not.toHaveProperty("created_at");
  });

  it("saveChoicePoint passes provided arrays through and includes createdAt when given", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_choice_points: { insert } }));

    await saveChoicePoint("u1", {
      hooks: ["stress"],
      awayMoves: ["scroll phone"],
      towardMoves: ["go for a walk"],
      notes: "n",
      createdAt: "2026-05-09T00:00:00.000Z",
    });

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      hooks: ["stress"],
      away_moves: ["scroll phone"],
      toward_moves: ["go for a walk"],
      created_at: "2026-05-09T00:00:00.000Z",
    });
  });

  it("saveChoicePoint throws a real error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_choice_points: { insert } }));

    await expect(saveChoicePoint("u1", { notes: "x" })).rejects.toMatchObject({ code: "23505" });
  });

  it("deleteChoicePoint issues a scoped delete", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_choice_points: { delete: del } }));

    await deleteChoicePoint("u1", ROW.id);
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqId).toHaveBeenCalledWith("id", ROW.id);
  });
});

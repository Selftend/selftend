import {
  deleteExpansionLog,
  getExpansionLog,
  getLatestExpansionLogAt,
  listExpansionLogs,
  saveExpansionLog,
} from "@/src/features/act/repository";
import { fetchLatestActivity } from "@/src/lib/latest-activity";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));
jest.mock("@/src/lib/latest-activity", () => ({ fetchLatestActivity: jest.fn() }));

const mockFetchLatestActivity = jest.mocked(fetchLatestActivity);
const mockRequireSupabase = jest.mocked(requireSupabase);

function buildClient(builders: Record<string, unknown>) {
  return { from: jest.fn((t: string) => builders[t]) } as unknown as ReturnType<
    typeof requireSupabase
  >;
}

const ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "u1",
  emotion: "anxiety",
  body_sensation: "tight chest",
  intensity_before: 8,
  struggle_switch_on: true,
  discomfort_type: "clean",
  technique_used: "fourStepExpansion",
  intensity_after: 4,
  notes: "n",
  created_at: "2026-05-10T07:00:00.000Z",
  updated_at: "2026-05-10T07:00:00.000Z",
};

describe("expansion repository", () => {
  it("listExpansionLogs maps rows", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [ROW], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_expansion_logs: { select } }));

    const result = await listExpansionLogs("u1", 30);
    expect(result[0]).toMatchObject({ id: ROW.id, emotion: "anxiety" });
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(limit).toHaveBeenCalledWith(30);
  });

  it("listExpansionLogs degrades to [] on a missing-schema error", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_expansion_logs: { select } }));

    expect(await listExpansionLogs("u1")).toEqual([]);
  });

  it("getExpansionLog returns null for an invalid uuid without querying", async () => {
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    expect(await getExpansionLog("u1", "not-a-uuid")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("getExpansionLog maps a found row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_expansion_logs: { select } }));

    expect(await getExpansionLog("u1", ROW.id)).toMatchObject({ id: ROW.id });
  });

  it("getExpansionLog degrades to null on a missing-schema error", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_expansion_logs: { select } }));

    expect(await getExpansionLog("u1", ROW.id)).toBeNull();
  });

  it("saveExpansionLog trims sanitized text and maps the inserted row", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_expansion_logs: { insert } }));

    await saveExpansionLog("u1", {
      emotion: "  anxiety  ",
      bodySensation: "  tight chest  ",
      techniqueUsed: "fourStepExpansion",
      notes: "  n  ",
    } as never);

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      emotion: "anxiety",
      body_sensation: "tight chest",
      notes: "n",
    });
  });

  it("saveExpansionLog throws a real error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_expansion_logs: { insert } }));

    await expect(
      saveExpansionLog("u1", { emotion: "x", techniqueUsed: "fourStepExpansion" } as never),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("deleteExpansionLog issues a scoped delete", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_expansion_logs: { delete: del } }));

    await deleteExpansionLog("u1", ROW.id);
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqId).toHaveBeenCalledWith("id", ROW.id);
  });
});

describe("getLatestExpansionLogAt", () => {
  it("reads one row instead of the 30-row list (#990)", async () => {
    mockFetchLatestActivity.mockResolvedValue(null);

    await getLatestExpansionLogAt("u1");

    expect(mockFetchLatestActivity).toHaveBeenCalledWith({
      table: "act_expansion_logs",
      userId: "u1",
      column: "created_at",
    });
  });
});

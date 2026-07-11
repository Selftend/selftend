import {
  listDefusionLogs,
  getDefusionLog,
  saveDefusionLog,
  deleteDefusionLog,
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
  fused_thought: "I always fail",
  thought_category: "self",
  fusion_level_before: 8,
  technique_used: "leaves-on-a-stream",
  defused_version: "I'm having the thought that I always fail",
  fusion_level_after: 4,
  notes: "n",
  created_at: "2026-05-10T07:00:00.000Z",
  updated_at: "2026-05-10T07:00:00.000Z",
};

describe("defusion repository", () => {
  it("listDefusionLogs maps rows", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [ROW], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_defusion_logs: { select } }));

    const result = await listDefusionLogs("u1", 30);
    expect(result[0]).toMatchObject({ id: ROW.id, fusedThought: "I always fail" });
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(limit).toHaveBeenCalledWith(30);
  });

  it("listDefusionLogs degrades to [] on a missing-schema error", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_defusion_logs: { select } }));

    expect(await listDefusionLogs("u1")).toEqual([]);
  });

  it("getDefusionLog returns null for an invalid uuid without querying", async () => {
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    expect(await getDefusionLog("u1", "not-a-uuid")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("getDefusionLog maps a found row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_defusion_logs: { select } }));

    expect(await getDefusionLog("u1", ROW.id)).toMatchObject({ id: ROW.id });
  });

  it("saveDefusionLog trims sanitized text and maps the inserted row", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_defusion_logs: { insert } }));

    await saveDefusionLog("u1", {
      fusedThought: "  I always fail  ",
      thoughtCategory: "self",
      techniqueUsed: "leaves-on-a-stream",
      defusedVersion: "  reframed  ",
    } as never);

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      fused_thought: "I always fail",
      defused_version: "reframed",
    });
  });

  it("saveDefusionLog throws a real error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_defusion_logs: { insert } }));

    await expect(
      saveDefusionLog("u1", {
        fusedThought: "x",
        thoughtCategory: "self",
        techniqueUsed: "t",
      } as never),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("deleteDefusionLog issues a scoped delete", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_defusion_logs: { delete: del } }));

    await deleteDefusionLog("u1", ROW.id);
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqId).toHaveBeenCalledWith("id", ROW.id);
  });
});

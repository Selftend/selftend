import { listUrgeSurfLogs, saveUrgeSurfLog } from "@/src/features/act/repository";
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
  urge_description: "urge to check phone",
  trigger: "boredom",
  peak_intensity: 7,
  surfing_notes: "n",
  urge_acted_on: false,
  completed_at: "2026-05-10T07:00:00.000Z",
  created_at: "2026-05-10T07:00:00.000Z",
  updated_at: "2026-05-10T07:00:00.000Z",
};

describe("urge-surf repository", () => {
  it("listUrgeSurfLogs maps rows", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [ROW], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_urge_surf_logs: { select } }));

    const result = await listUrgeSurfLogs("u1", 30);
    expect(result[0]).toMatchObject({ id: ROW.id, urgeDescription: "urge to check phone" });
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(limit).toHaveBeenCalledWith(30);
  });

  it("listUrgeSurfLogs degrades to [] on a missing-schema error", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_urge_surf_logs: { select } }));

    expect(await listUrgeSurfLogs("u1")).toEqual([]);
  });

  it("saveUrgeSurfLog trims sanitized text, maps the inserted row, and defaults urgeActedOn/completedAt", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_urge_surf_logs: { insert } }));

    await saveUrgeSurfLog("u1", {
      urgeDescription: "  urge to check phone  ",
      trigger: "  boredom  ",
      surfingNotes: "  n  ",
    } as never);

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      urge_description: "urge to check phone",
      trigger: "boredom",
      surfing_notes: "n",
      urge_acted_on: false,
    });
    expect(payload.completed_at).toEqual(expect.any(String));
  });

  it("saveUrgeSurfLog preserves explicit urgeActedOn and completedAt when provided", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_urge_surf_logs: { insert } }));

    await saveUrgeSurfLog("u1", {
      urgeDescription: "urge",
      urgeActedOn: true,
      completedAt: "2026-05-01T00:00:00.000Z",
    } as never);

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      urge_acted_on: true,
      completed_at: "2026-05-01T00:00:00.000Z",
    });
  });

  it("saveUrgeSurfLog throws a real error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_urge_surf_logs: { insert } }));

    await expect(saveUrgeSurfLog("u1", { urgeDescription: "x" } as never)).rejects.toMatchObject({
      code: "23505",
    });
  });
});

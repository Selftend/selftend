import {
  deleteObservingSelfSession,
  getLatestObservingSelfSessionAt,
  getObservingSelfSession,
  listObservingSelfSessions,
  saveObservingSelfSession,
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
  technique_used: "tenDeepBreaths",
  what_was_observed: "thoughts racing",
  duration_minutes: 10,
  mood_after: 6,
  notes: "n",
  created_at: "2026-05-10T07:00:00.000Z",
  updated_at: "2026-05-10T07:00:00.000Z",
};

describe("observing-self repository", () => {
  it("listObservingSelfSessions maps rows", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [ROW], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_observing_self_sessions: { select } }));

    const result = await listObservingSelfSessions("u1", 30);
    expect(result[0]).toMatchObject({ id: ROW.id, techniqueUsed: "tenDeepBreaths" });
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(limit).toHaveBeenCalledWith(30);
  });

  it("listObservingSelfSessions degrades to [] on a missing-schema error", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_observing_self_sessions: { select } }));

    expect(await listObservingSelfSessions("u1")).toEqual([]);
  });

  it("getObservingSelfSession returns null for an invalid uuid without querying", async () => {
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    expect(await getObservingSelfSession("u1", "not-a-uuid")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("getObservingSelfSession maps a found row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_observing_self_sessions: { select } }));

    expect(await getObservingSelfSession("u1", ROW.id)).toMatchObject({ id: ROW.id });
  });

  it("getObservingSelfSession degrades to null on a missing-schema error", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_observing_self_sessions: { select } }));

    expect(await getObservingSelfSession("u1", ROW.id)).toBeNull();
  });

  it("saveObservingSelfSession trims sanitized text and maps the inserted row", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_observing_self_sessions: { insert } }));

    await saveObservingSelfSession("u1", {
      techniqueUsed: "tenDeepBreaths",
      whatWasObserved: "  thoughts racing  ",
      notes: "  n  ",
    } as never);

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      technique_used: "tenDeepBreaths",
      what_was_observed: "thoughts racing",
      notes: "n",
    });
  });

  it("saveObservingSelfSession throws a real error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_observing_self_sessions: { insert } }));

    await expect(
      saveObservingSelfSession("u1", { techniqueUsed: "tenDeepBreaths" } as never),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("deleteObservingSelfSession issues a scoped delete", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(
      buildClient({ act_observing_self_sessions: { delete: del } }),
    );

    await deleteObservingSelfSession("u1", ROW.id);
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqId).toHaveBeenCalledWith("id", ROW.id);
  });
});

describe("getLatestObservingSelfSessionAt", () => {
  it("reads one row instead of the 30-row list (#990)", async () => {
    mockFetchLatestActivity.mockResolvedValue(null);

    await getLatestObservingSelfSessionAt("u1");

    expect(mockFetchLatestActivity).toHaveBeenCalledWith({
      table: "act_observing_self_sessions",
      userId: "u1",
      column: "created_at",
    });
  });
});

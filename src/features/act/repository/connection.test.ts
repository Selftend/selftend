import {
  deleteConnectionLog,
  getConnectionLog,
  getLatestConnectionLogAt,
  listConnectionLogs,
  saveConnectionLog,
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
  technique: "fiveSenses",
  activity_context: "washing dishes",
  notices_from_senses: "warm water, soap smell",
  duration_minutes: 5,
  mood_after: 7,
  notes: "n",
  created_at: "2026-05-10T07:00:00.000Z",
  updated_at: "2026-05-10T07:00:00.000Z",
};

describe("connection repository", () => {
  it("listConnectionLogs maps rows", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [ROW], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_connection_logs: { select } }));

    const result = await listConnectionLogs("u1", 30);
    expect(result[0]).toMatchObject({ id: ROW.id, technique: "fiveSenses" });
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(limit).toHaveBeenCalledWith(30);
  });

  it("listConnectionLogs degrades to [] on a missing-schema error", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_connection_logs: { select } }));

    expect(await listConnectionLogs("u1")).toEqual([]);
  });

  it("getConnectionLog returns null for an invalid uuid without querying", async () => {
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    expect(await getConnectionLog("u1", "not-a-uuid")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("getConnectionLog maps a found row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_connection_logs: { select } }));

    expect(await getConnectionLog("u1", ROW.id)).toMatchObject({ id: ROW.id });
  });

  it("getConnectionLog degrades to null on a missing-schema error", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_connection_logs: { select } }));

    expect(await getConnectionLog("u1", ROW.id)).toBeNull();
  });

  it("saveConnectionLog writes technique unsanitized and trims sanitized text fields", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_connection_logs: { insert } }));

    await saveConnectionLog("u1", {
      technique: "  fiveSenses  ",
      activityContext: "  washing dishes  ",
      noticesFromSenses: "  warm water  ",
      notes: "  n  ",
    } as never);

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      technique: "  fiveSenses  ",
      activity_context: "washing dishes",
      notices_from_senses: "warm water",
      notes: "n",
    });
  });

  it("saveConnectionLog throws a real error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_connection_logs: { insert } }));

    await expect(
      saveConnectionLog("u1", { technique: "fiveSenses" } as never),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("deleteConnectionLog issues a scoped delete", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_connection_logs: { delete: del } }));

    await deleteConnectionLog("u1", ROW.id);
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqId).toHaveBeenCalledWith("id", ROW.id);
  });
});

describe("getLatestConnectionLogAt", () => {
  // Filtering in the read, not over a fetched page: 30 newer logs of other techniques
  // used to hide the last drop anchor entirely (#990). `technique` is plaintext on the
  // base table, so the filter keeps the LIMIT below the decrypt.
  it("filters by technique in the query", async () => {
    mockFetchLatestActivity.mockResolvedValue({
      at: "2026-07-27T08:00:00.000Z",
      offsetMinutes: null,
    });

    await expect(getLatestConnectionLogAt("u1", "dropAnchor")).resolves.toEqual({
      at: "2026-07-27T08:00:00.000Z",
      offsetMinutes: null,
    });
    expect(mockFetchLatestActivity).toHaveBeenCalledWith({
      table: "act_connection_logs",
      userId: "u1",
      column: "created_at",
      match: { technique: "dropAnchor" },
    });
  });

  it("reads every technique when none is given", async () => {
    mockFetchLatestActivity.mockResolvedValue(null);

    await getLatestConnectionLogAt("u1");

    expect(mockFetchLatestActivity).toHaveBeenCalledWith(expect.objectContaining({ match: {} }));
  });

  it("degrades to no record when ACT is not migrated yet", async () => {
    mockFetchLatestActivity.mockRejectedValue({ code: "PGRST205", message: "schema cache" });

    await expect(getLatestConnectionLogAt("u1", "dropAnchor")).resolves.toBeNull();
  });

  it("rethrows a real error rather than reporting no record", async () => {
    mockFetchLatestActivity.mockRejectedValue({ code: "23505", message: "duplicate" });

    await expect(getLatestConnectionLogAt("u1")).rejects.toEqual({
      code: "23505",
      message: "duplicate",
    });
  });
});

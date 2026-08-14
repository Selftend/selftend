import {
  countCommittedActions,
  deleteCommittedAction,
  getCommittedAction,
  listCommittedActions,
  saveCommittedAction,
  updateCommittedAction,
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
  life_domain: "work",
  title: "Walk three times this week",
  description: "keep it light",
  status: "active",
  target_date: null,
  obstacles: "weather",
  created_at: "2026-05-10T07:00:00.000Z",
  updated_at: "2026-05-10T07:00:00.000Z",
};

describe("committed-action repository", () => {
  it("listCommittedActions applies the status filter when provided", async () => {
    const eqStatus = jest.fn().mockResolvedValue({ data: [ROW], error: null });
    const order = jest.fn(() =>
      Object.assign(Promise.resolve({ data: [ROW], error: null }), { eq: eqStatus }),
    );
    const eqUser = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { select } }));

    const result = await listCommittedActions("u1", "active");
    expect(result[0]).toMatchObject({ id: ROW.id, status: "active" });
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(eqStatus).toHaveBeenCalledWith("status", "active");
  });

  it("listCommittedActions omits the status filter when not provided", async () => {
    const eqStatus = jest.fn();
    const order = jest.fn(() =>
      Object.assign(Promise.resolve({ data: [ROW], error: null }), { eq: eqStatus }),
    );
    const eqUser = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { select } }));

    const result = await listCommittedActions("u1");
    expect(result[0]).toMatchObject({ id: ROW.id });
    expect(eqStatus).not.toHaveBeenCalled();
  });

  it("listCommittedActions degrades to [] on a missing-schema error", async () => {
    const order = jest.fn(() =>
      Object.assign(Promise.resolve({ data: null, error: { code: "PGRST205" } }), {
        eq: jest.fn(),
      }),
    );
    const eqUser = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { select } }));

    expect(await listCommittedActions("u1")).toEqual([]);
  });

  it("getCommittedAction returns null for an invalid uuid without querying", async () => {
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    expect(await getCommittedAction("u1", "not-a-uuid")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("getCommittedAction maps a found row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { select } }));

    expect(await getCommittedAction("u1", ROW.id)).toMatchObject({ id: ROW.id, title: ROW.title });
  });

  it("saveCommittedAction defaults status to active, target_date to null, and trims sanitized text", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { insert } }));

    await saveCommittedAction("u1", {
      lifeDomain: "work",
      title: "  Walk three times this week  ",
      description: "  keep it light  ",
      obstacles: "  weather  ",
    });

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      life_domain: "work",
      title: "Walk three times this week",
      description: "keep it light",
      status: "active",
      target_date: null,
      obstacles: "weather",
    });
  });

  it("saveCommittedAction throws a real error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { insert } }));

    await expect(
      saveCommittedAction("u1", { lifeDomain: "work", title: "x" }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("updateCommittedAction writes only provided fields, sanitized/trimmed", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { update } }));

    await updateCommittedAction("u1", ROW.id, {
      title: "  New title  ",
      status: "completed",
      targetDate: "2026-08-01",
      obstacles: "  ice  ",
    });

    const payload = (update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      title: "New title",
      status: "completed",
      target_date: "2026-08-01",
      obstacles: "ice",
    });
    expect(payload).not.toHaveProperty("description");
    expect(payload.updated_at).toEqual(expect.any(String));
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqId).toHaveBeenCalledWith("id", ROW.id);
  });

  it("updateCommittedAction sanitizes and trims a provided description", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { update } }));

    await updateCommittedAction("u1", ROW.id, { description: "  keep it light  " });

    const payload = (update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({ description: "keep it light" });
  });

  it("updateCommittedAction throws a real error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { update } }));

    await expect(
      updateCommittedAction("u1", ROW.id, { status: "completed" }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("deleteCommittedAction scopes the delete by user and id", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { delete: del } }));

    await deleteCommittedAction("u1", ROW.id);
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqId).toHaveBeenCalledWith("id", ROW.id);
  });
});

describe("countCommittedActions", () => {
  // The list read has no LIMIT at all, so counting it client-side was the one row whose
  // cost grew without bound with the user's history (#990).
  it("counts with an exact head request and the status filter", async () => {
    const eqStatus = jest.fn().mockResolvedValue({ count: 2, error: null });
    const eqUser = jest.fn(() => ({ eq: eqStatus }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { select } }));

    await expect(countCommittedActions("u1", "active")).resolves.toBe(2);

    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqStatus).toHaveBeenCalledWith("status", "active");
  });

  it("counts every status when none is given", async () => {
    const eqUser = jest.fn().mockResolvedValue({ count: 7, error: null });
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { select } }));

    await expect(countCommittedActions("u1")).resolves.toBe(7);
  });

  it("reads as nothing recorded when ACT is not migrated yet", async () => {
    const eqUser = jest
      .fn()
      .mockResolvedValue({ count: null, error: { code: "PGRST205", message: "schema cache" } });
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { select } }));

    await expect(countCommittedActions("u1")).resolves.toBe(0);
  });

  it("throws a real error rather than reporting zero", async () => {
    const eqUser = jest.fn().mockResolvedValue({ count: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_committed_actions: { select } }));

    await expect(countCommittedActions("u1")).rejects.toEqual({ code: "23505" });
  });
});

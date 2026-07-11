import {
  listActionSteps,
  listAllActionSteps,
  saveActionStep,
  toggleActionStep,
  deleteActionStep,
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
  action_id: "22222222-2222-4222-8222-222222222222",
  description: "Walk the dog",
  is_completed: false,
  completed_at: null,
  created_at: "2026-05-10T07:00:00.000Z",
  updated_at: "2026-05-10T07:00:00.000Z",
};

describe("action-steps repository", () => {
  it("listActionSteps returns [] for an invalid actionId without querying", async () => {
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    expect(await listActionSteps("u1", "not-a-uuid")).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("listActionSteps maps rows scoped to user and action", async () => {
    const order = jest.fn().mockResolvedValue({ data: [ROW], error: null });
    const eqAction = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ eq: eqAction }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_action_steps: { select } }));

    const result = await listActionSteps("u1", ROW.action_id);
    expect(result[0]).toMatchObject({ id: ROW.id, description: "Walk the dog" });
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqAction).toHaveBeenCalledWith("action_id", ROW.action_id);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  it("listActionSteps degrades to [] on a missing-schema error", async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const eqAction = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ eq: eqAction }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_action_steps: { select } }));

    expect(await listActionSteps("u1", ROW.action_id)).toEqual([]);
  });

  it("listAllActionSteps maps rows across all actions", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [ROW], error: null });
    const order = jest.fn(() => ({ limit }));
    const eqUser = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_action_steps: { select } }));

    const result = await listAllActionSteps("u1");
    expect(result[0]).toMatchObject({ id: ROW.id });
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(order).toHaveBeenCalledWith("completed_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(500);
  });

  it("listAllActionSteps degrades to [] on a missing-schema error", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const order = jest.fn(() => ({ limit }));
    const eqUser = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_action_steps: { select } }));

    expect(await listAllActionSteps("u1")).toEqual([]);
  });

  it("saveActionStep trims sanitized text and maps the inserted row", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_action_steps: { insert } }));

    await saveActionStep("u1", { actionId: ROW.action_id, description: "  Walk the dog  " });

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      action_id: ROW.action_id,
      description: "Walk the dog",
    });
  });

  it("toggleActionStep sets completed_at when completed is true", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_action_steps: { update } }));

    await toggleActionStep("u1", ROW.id, true, "2026-05-11T00:00:00.000Z");

    const payload = (update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      is_completed: true,
      completed_at: "2026-05-11T00:00:00.000Z",
    });
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqId).toHaveBeenCalledWith("id", ROW.id);
  });

  it("toggleActionStep nulls completed_at when completed is false", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_action_steps: { update } }));

    await toggleActionStep("u1", ROW.id, false);

    const payload = (update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({ is_completed: false, completed_at: null });
  });

  it("deleteActionStep issues a scoped delete", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_action_steps: { delete: del } }));

    await deleteActionStep("u1", ROW.id);
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqId).toHaveBeenCalledWith("id", ROW.id);
  });
});

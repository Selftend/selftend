import {
  deletePlanItem,
  listAllPlanItems,
  listPlanItems,
  savePlanItem,
} from "@/src/features/plan/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

const planRow = {
  id: "p-1",
  user_id: "user-1",
  title: "Mood check-in",
  description: null,
  tool_id: "mood",
  module_id: null,
  route: "/tools/mood-tracker/new",
  frequency: "daily",
  reminder_enabled: false,
  item_order: 0,
  active: true,
  created_at: "2026-05-15T08:00:00.000Z",
  updated_at: "2026-05-15T08:00:00.000Z",
};

describe("plan repository", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists active items ordered by item_order ascending", async () => {
    const order = jest.fn().mockResolvedValue({ data: [planRow], error: null });
    const eqActive = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ eq: eqActive }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listPlanItems("user-1");
    expect(from).toHaveBeenCalledWith("plan_items");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqActive).toHaveBeenCalledWith("active", true);
    expect(order).toHaveBeenCalledWith("item_order", { ascending: true });
  });

  it("listAllPlanItems does not filter by active", async () => {
    const order = jest.fn().mockResolvedValue({ data: [planRow], error: null });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listAllPlanItems("user-1");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("item_order", { ascending: true });
  });

  it("maps null description/module_id to undefined", async () => {
    const order = jest.fn().mockResolvedValue({ data: [planRow], error: null });
    const eqActive = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ eq: eqActive }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await listPlanItems("user-1");
    expect(result[0].description).toBeUndefined();
    expect(result[0].moduleId).toBeUndefined();
  });

  it("inserts a new plan item when no id is given", async () => {
    const single = jest.fn().mockResolvedValue({ data: planRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await savePlanItem("user-1", {
      title: "Mood check-in",
      toolId: "mood",
      route: "/tools/mood-tracker/new",
      frequency: "daily",
      reminderEnabled: false,
      order: 0,
      active: true,
    });

    const calls = insert.mock.calls as unknown as [Record<string, unknown>][];
    const payload = calls[0][0];
    expect(payload).toMatchObject({
      user_id: "user-1",
      title: "Mood check-in",
      tool_id: "mood",
      route: "/tools/mood-tracker/new",
      frequency: "daily",
      reminder_enabled: false,
      item_order: 0,
      active: true,
      description: null,
      module_id: null,
    });
    expect(typeof payload.updated_at).toBe("string");
  });

  it("updates an existing plan item scoped to id and user", async () => {
    const single = jest.fn().mockResolvedValue({ data: planRow, error: null });
    const select = jest.fn(() => ({ single }));
    const eqUser = jest.fn(() => ({ select }));
    const eqId = jest.fn(() => ({ eq: eqUser }));
    const update = jest.fn(() => ({ eq: eqId }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await savePlanItem(
      "user-1",
      {
        title: "Mood",
        toolId: "mood",
        route: "/x",
        frequency: "daily",
        reminderEnabled: true,
        order: 2,
        active: true,
      },
      "p-1",
    );
    expect(eqId).toHaveBeenCalledWith("id", "p-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("deletes a plan item scoped to id and user", async () => {
    const eqUser = jest.fn().mockResolvedValue({ error: null });
    const eqId = jest.fn(() => ({ eq: eqUser }));
    const del = jest.fn(() => ({ eq: eqId }));
    const from = jest.fn(() => ({ delete: del }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await deletePlanItem("user-1", "p-1");
    expect(eqId).toHaveBeenCalledWith("id", "p-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
  });
});

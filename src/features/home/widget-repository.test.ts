import {
  addWidgetPreference,
  deleteWidgetPreference,
  getWidgetsSeeded,
  listWidgetPreferences,
  markWidgetsSeeded,
  restoreWidgetPreference,
  setWidgetOrder,
} from "@/src/features/home/widget-repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
  isMissingColumnError: (e: { code?: string } | null) =>
    e?.code === "42703" || e?.code === "PGRST204",
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

function buildClient(builders: Record<string, unknown>, rpc?: jest.Mock) {
  return {
    from: jest.fn((t: string) => builders[t]),
    rpc: rpc ?? jest.fn().mockResolvedValue({ error: null }),
  } as unknown as ReturnType<typeof requireSupabase>;
}

// The two write paths are RPCs, so the client surface they need is `rpc`, not `from`.
function mockRpc(result: { error: unknown } = { error: null }) {
  const rpc = jest.fn().mockResolvedValue(result);
  mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);
  return rpc;
}

function mockMaybeSingle(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
  return { from, select, eq, maybeSingle };
}

// `listWidgetPreferences` chains more than one `.order()` (#986), so the mocked builder
// has to be chainable AND awaitable: every `.order()` hands back the same chain, and the
// chain resolves to `result`.
interface OrderChain {
  order: jest.Mock;
  then: (
    onFulfilled?: ((value: unknown) => unknown) | null,
    onRejected?: ((reason: unknown) => unknown) | null,
  ) => Promise<unknown>;
}

function mockOrderedSelect(result: { data: unknown; error: unknown }) {
  const order: OrderChain["order"] = jest.fn(() => chain);
  const chain: OrderChain = {
    order,
    then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  const eq = jest.fn(() => chain);
  const select = jest.fn(() => ({ eq }));
  return { order, eq, select };
}

const ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "u1",
  widget_id: "mood",
  position: 2,
  created_at: "2026-05-10T07:00:00.000Z",
};

describe("widget-repository getWidgetsSeeded", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns true when widgets_seeded is true", async () => {
    const { from, select, eq } = mockMaybeSingle({ data: { widgets_seeded: true }, error: null });
    await expect(getWidgetsSeeded("user-1")).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith("user_preferences");
    expect(select).toHaveBeenCalledWith("widgets_seeded");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("returns false when widgets_seeded is false", async () => {
    mockMaybeSingle({ data: { widgets_seeded: false }, error: null });
    await expect(getWidgetsSeeded("user-1")).resolves.toBe(false);
  });

  it("returns false when there is no user_preferences row", async () => {
    mockMaybeSingle({ data: null, error: null });
    await expect(getWidgetsSeeded("user-1")).resolves.toBe(false);
  });

  it("returns false (degrades) ONLY for a missing-column error (pre-migration)", async () => {
    mockMaybeSingle({ data: null, error: { code: "42703", message: "column missing" } });
    await expect(getWidgetsSeeded("user-1")).resolves.toBe(false);
  });

  // The bug: a transient error was swallowed as "not seeded", re-seeding a Home the
  // user had deliberately emptied. A non-missing-column error must rethrow instead.
  it("rethrows a non-missing-column error (so a transient failure does not re-seed)", async () => {
    mockMaybeSingle({ data: null, error: { code: "08006", message: "connection failure" } });
    await expect(getWidgetsSeeded("user-1")).rejects.toMatchObject({ code: "08006" });
  });
});

describe("widget-repository listWidgetPreferences", () => {
  beforeEach(() => jest.clearAllMocks());

  // #974 dropped the `created_at` tiebreak on the grounds that server-assigned positions
  // made `position` alone total. That is true of the two write functions, but `position`
  // is not constrained unique and RLS still lets any client write it directly, so a
  // duplicate can arrive from outside them (#986) - and two rows sharing a position have
  // no defined order at all, which is worse than the wrong one. The tiebreak is back as
  // the read's total-order guarantee, and it is the SAME ordering the write path heals
  // into, so healing never reshuffles a dashboard.
  it("orders by position, then created_at, then widget_id", async () => {
    const { order, eq, select } = mockOrderedSelect({ data: [ROW], error: null });
    mockRequireSupabase.mockReturnValue(buildClient({ widget_preferences: { select } }));

    const result = await listWidgetPreferences("u1");
    expect(result).toEqual([
      {
        id: ROW.id,
        userId: "u1",
        widgetId: "mood",
        position: 2,
        createdAt: ROW.created_at,
      },
    ]);
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    // The order of the keys is the whole point, so assert the sequence, not the set.
    expect(order.mock.calls).toEqual([
      ["position", { ascending: true }],
      ["created_at", { ascending: true }],
      ["widget_id", { ascending: true }],
    ]);
  });

  it("throws when the query errors", async () => {
    const { select } = mockOrderedSelect({ data: null, error: { code: "08006" } });
    mockRequireSupabase.mockReturnValue(buildClient({ widget_preferences: { select } }));

    await expect(listWidgetPreferences("u1")).rejects.toMatchObject({ code: "08006" });
  });
});

describe("widget-repository markWidgetsSeeded", () => {
  beforeEach(() => jest.clearAllMocks());

  it("upserts the seeded marker keyed on user_id", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildClient({ user_preferences: { upsert } }));

    await markWidgetsSeeded("u1");
    const payload = (upsert.mock.calls[0] as unknown as [Record<string, unknown>, unknown])[0];
    expect(payload).toEqual({ user_id: "u1", widgets_seeded: true });
    const options = (upsert.mock.calls[0] as unknown as [unknown, Record<string, unknown>])[1];
    expect(options).toEqual({ onConflict: "user_id" });
  });
});

describe("widget-repository addWidgetPreference", () => {
  beforeEach(() => jest.clearAllMocks());

  // The whole point of the RPC: the client never names a position, so it cannot compute
  // a stale one. If a position ever appears in this payload, the race is back (#974).
  it("names only the widget id - the server owns the position", async () => {
    const rpc = mockRpc();

    await addWidgetPreference("mood-checkin");
    expect(rpc).toHaveBeenCalledWith("add_widget_preference", { p_widget_id: "mood-checkin" });
    const payload = (rpc.mock.calls[0] as unknown as [string, Record<string, unknown>])[1];
    expect(payload).not.toHaveProperty("position");
    expect(payload).not.toHaveProperty("p_position");
  });

  it("throws when the RPC errors", async () => {
    mockRpc({ error: { code: "23505" } });

    await expect(addWidgetPreference("mood-checkin")).rejects.toMatchObject({ code: "23505" });
  });
});

describe("widget-repository deleteWidgetPreference", () => {
  beforeEach(() => jest.clearAllMocks());

  it("issues a scoped delete on user_id and widget_id", async () => {
    const eqWidget = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqWidget }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ widget_preferences: { delete: del } }));

    await deleteWidgetPreference("u1", "mood");
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqWidget).toHaveBeenCalledWith("widget_id", "mood");
  });

  it("throws when the delete errors", async () => {
    const eqWidget = jest.fn().mockResolvedValue({ error: { code: "08006" } });
    const eqUser = jest.fn(() => ({ eq: eqWidget }));
    const del = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ widget_preferences: { delete: del } }));

    await expect(deleteWidgetPreference("u1", "mood")).rejects.toMatchObject({ code: "08006" });
  });
});

describe("widget-repository setWidgetOrder", () => {
  beforeEach(() => jest.clearAllMocks());

  // Order is expressed as the id sequence alone. No index is sent, because the server
  // reassigns the positions those ids already hold - which is what leaves rows the
  // caller did not name untouched (#974).
  it("sends the id order and no positions at all", async () => {
    const rpc = mockRpc();

    await setWidgetOrder(["c", "a", "b"]);
    expect(rpc).toHaveBeenCalledWith("set_widget_order", { p_widget_ids: ["c", "a", "b"] });
  });

  it("forwards a subset unchanged rather than padding it to the full list", async () => {
    const rpc = mockRpc();

    await setWidgetOrder(["e", "a"]);
    expect(rpc).toHaveBeenCalledWith("set_widget_order", { p_widget_ids: ["e", "a"] });
  });

  it("throws when the RPC errors", async () => {
    mockRpc({ error: { code: "23505" } });

    await expect(setWidgetOrder(["a"])).rejects.toMatchObject({ code: "23505" });
  });
});

describe("widget-repository restoreWidgetPreference", () => {
  beforeEach(() => jest.clearAllMocks());

  it("re-adds the widget then orders the full list around it", async () => {
    const { select } = mockOrderedSelect({
      data: [
        { ...ROW, widget_id: "a", position: 0 },
        { ...ROW, id: "22222222-2222-4222-8222-222222222222", widget_id: "c", position: 1 },
      ],
      error: null,
    });
    const rpc = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildClient({ widget_preferences: { select } }, rpc));

    await restoreWidgetPreference("u1", "b", 1);

    // Re-add first, so the row exists and holds a position before the order is set.
    expect(rpc).toHaveBeenNthCalledWith(1, "add_widget_preference", { p_widget_id: "b" });
    // Every id is named, so `set_widget_order` has every position to redistribute and
    // the restored row lands at the requested index.
    expect(rpc).toHaveBeenNthCalledWith(2, "set_widget_order", { p_widget_ids: ["a", "b", "c"] });
  });
});

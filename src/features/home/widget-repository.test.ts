import {
  deleteWidgetPreference,
  getWidgetsSeeded,
  insertWidgetPreferences,
  listWidgetPreferences,
  markWidgetsSeeded,
  updateWidgetPositions,
} from "@/src/features/home/widget-repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
  isMissingColumnError: (e: { code?: string } | null) =>
    e?.code === "42703" || e?.code === "PGRST204",
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

function buildClient(builders: Record<string, unknown>) {
  return { from: jest.fn((t: string) => builders[t]) } as unknown as ReturnType<
    typeof requireSupabase
  >;
}

function mockMaybeSingle(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
  return { from, select, eq, maybeSingle };
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

  it("maps rows and orders by position then created_at", async () => {
    const orderCreated = jest.fn().mockResolvedValue({ data: [ROW], error: null });
    const orderPosition = jest.fn(() => ({ order: orderCreated }));
    const eq = jest.fn(() => ({ order: orderPosition }));
    const select = jest.fn(() => ({ eq }));
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
    expect(orderPosition).toHaveBeenCalledWith("position", { ascending: true });
    expect(orderCreated).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  it("throws when the query errors", async () => {
    const orderCreated = jest.fn().mockResolvedValue({ data: null, error: { code: "08006" } });
    const orderPosition = jest.fn(() => ({ order: orderCreated }));
    const eq = jest.fn(() => ({ order: orderPosition }));
    const select = jest.fn(() => ({ eq }));
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

describe("widget-repository insertWidgetPreferences", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns early without touching the client when widgetIds is empty", async () => {
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await insertWidgetPreferences("u1", []);
    expect(from).not.toHaveBeenCalled();
  });

  it("builds positioned payload using the default startPosition (0)", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildClient({ widget_preferences: { upsert } }));

    await insertWidgetPreferences("u1", ["a", "b"]);
    const payload = (upsert.mock.calls[0] as unknown as [Record<string, unknown>[]])[0];
    expect(payload).toEqual([
      { user_id: "u1", widget_id: "a", position: 0 },
      { user_id: "u1", widget_id: "b", position: 1 },
    ]);
    const options = (upsert.mock.calls[0] as unknown as [unknown, Record<string, unknown>])[1];
    expect(options).toEqual({ onConflict: "user_id,widget_id", ignoreDuplicates: true });
  });

  it("offsets positions by an explicit startPosition", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildClient({ widget_preferences: { upsert } }));

    await insertWidgetPreferences("u1", ["a", "b"], 5);
    const payload = (upsert.mock.calls[0] as unknown as [Record<string, unknown>[]])[0];
    expect(payload).toEqual([
      { user_id: "u1", widget_id: "a", position: 5 },
      { user_id: "u1", widget_id: "b", position: 6 },
    ]);
  });

  it("throws when the upsert errors", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: { code: "23505" } });
    mockRequireSupabase.mockReturnValue(buildClient({ widget_preferences: { upsert } }));

    await expect(insertWidgetPreferences("u1", ["a"])).rejects.toMatchObject({ code: "23505" });
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

describe("widget-repository updateWidgetPositions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("upserts each widget at its array index position", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(buildClient({ widget_preferences: { upsert } }));

    await updateWidgetPositions("u1", ["c", "a", "b"]);
    const payload = (upsert.mock.calls[0] as unknown as [Record<string, unknown>[]])[0];
    expect(payload).toEqual([
      { user_id: "u1", widget_id: "c", position: 0 },
      { user_id: "u1", widget_id: "a", position: 1 },
      { user_id: "u1", widget_id: "b", position: 2 },
    ]);
    const options = (upsert.mock.calls[0] as unknown as [unknown, Record<string, unknown>])[1];
    expect(options).toEqual({ onConflict: "user_id,widget_id" });
  });

  it("throws when the upsert errors", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: { code: "23505" } });
    mockRequireSupabase.mockReturnValue(buildClient({ widget_preferences: { upsert } }));

    await expect(updateWidgetPositions("u1", ["a"])).rejects.toMatchObject({ code: "23505" });
  });
});

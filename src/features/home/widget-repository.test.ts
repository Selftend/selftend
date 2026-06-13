import { getWidgetsSeeded } from "@/src/features/home/widget-repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
  isMissingColumnError: (e: { code?: string } | null) =>
    e?.code === "42703" || e?.code === "PGRST204",
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

function mockMaybeSingle(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
  return { from, select, eq, maybeSingle };
}

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

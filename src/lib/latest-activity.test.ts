import { fetchLatestActivity } from "@/src/lib/latest-activity";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));

const mockRequireSupabase = jest.mocked(requireSupabase);

/**
 * One chainable spy per builder method, so a test can assert the exact projection,
 * filters and ordering the read sends - the three things ADR-0001 makes load-bearing.
 */
function mockClient(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const chain = () => builder;
  const builder: Record<string, jest.Mock> = {
    select: jest.fn(chain),
    eq: jest.fn(chain),
    is: jest.fn(chain),
    not: jest.fn(chain),
    order: jest.fn(chain),
    limit: jest.fn(chain),
    maybeSingle,
  };
  const from = jest.fn(() => builder);
  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
  return { from, builder };
}

describe("fetchLatestActivity", () => {
  beforeEach(() => jest.clearAllMocks());

  it("projects only the timestamp, ordered newest-first, one row", async () => {
    const { from, builder } = mockClient({
      data: { created_at: "2026-07-27T09:00:00.000Z" },
      error: null,
    });

    const latest = await fetchLatestActivity({
      table: "worry_entries",
      userId: "user-1",
      column: "created_at",
    });

    expect(latest).toEqual({ at: "2026-07-27T09:00:00.000Z", offsetMinutes: null });
    expect(from).toHaveBeenCalledWith("worry_entries");
    // The whole point of the ticket: no `select("*")` over a decrypting view.
    expect(builder.select).toHaveBeenCalledWith("created_at");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(1);
  });

  it("projects the captured offset alongside the instant when the table has one", async () => {
    const { builder } = mockClient({
      data: { completed_at: "2026-07-27T09:00:00.000Z", completed_offset_minutes: -420 },
      error: null,
    });

    const latest = await fetchLatestActivity({
      table: "activity_logs",
      userId: "user-1",
      column: "completed_at",
      offsetColumn: "completed_offset_minutes",
    });

    expect(latest).toEqual({ at: "2026-07-27T09:00:00.000Z", offsetMinutes: -420 });
    expect(builder.select).toHaveBeenCalledWith("completed_at, completed_offset_minutes");
  });

  it("reads a null captured offset as uncaptured rather than zero", async () => {
    mockClient({
      data: { created_at: "2026-07-27T09:00:00.000Z", created_offset_minutes: null },
      error: null,
    });

    const latest = await fetchLatestActivity({
      table: "thought_records",
      userId: "user-1",
      column: "created_at",
      offsetColumn: "created_offset_minutes",
    });

    expect(latest).toEqual({ at: "2026-07-27T09:00:00.000Z", offsetMinutes: null });
  });

  it("excludes null timestamps, which descending order would otherwise return first", async () => {
    const { builder } = mockClient({ data: null, error: null });

    await fetchLatestActivity({
      table: "activity_logs",
      userId: "user-1",
      column: "completed_at",
    });

    expect(builder.not).toHaveBeenCalledWith("completed_at", "is", null);
  });

  it("applies equality and is-null filters", async () => {
    const { builder } = mockClient({ data: null, error: null });

    await fetchLatestActivity({
      table: "act_connection_logs",
      userId: "user-1",
      column: "created_at",
      match: { technique: "dropAnchor" },
      isNull: "archived_at",
    });

    expect(builder.eq).toHaveBeenCalledWith("technique", "dropAnchor");
    expect(builder.is).toHaveBeenCalledWith("archived_at", null);
  });

  it("returns null when the tool holds nothing", async () => {
    mockClient({ data: null, error: null });

    await expect(
      fetchLatestActivity({ table: "worry_entries", userId: "user-1", column: "created_at" }),
    ).resolves.toBeNull();
  });

  // A failed fetch must surface as "not loaded", never as an empty history.
  it("throws the error rather than reporting emptiness", async () => {
    mockClient({ data: null, error: { message: "boom" } });

    await expect(
      fetchLatestActivity({ table: "worry_entries", userId: "user-1", column: "created_at" }),
    ).rejects.toEqual({ message: "boom" });
  });
});

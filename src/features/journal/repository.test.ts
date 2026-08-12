import {
  countJournalEntries,
  countJournalEntriesSince,
  deleteJournalEntry,
  getJournalEntry,
  listJournalEntries,
  listJournalEntriesPage,
  listJournalWritingBuckets,
  saveJournalEntry,
  sumJournalWords,
} from "@/src/features/journal/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

describe("journal repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists entries newest-first and maps rows", async () => {
    const rows = [
      {
        id: "j-1",
        user_id: "user-1",
        title: "Today",
        body: "Walked outside",
        created_at: "2026-05-15T08:00:00.000Z",
        updated_at: "2026-05-15T08:00:00.000Z",
      },
    ];
    const limit = jest.fn().mockResolvedValue({ data: rows, error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listJournalEntries("user-1", 25)).resolves.toEqual([
      {
        id: "j-1",
        userId: "user-1",
        title: "Today",
        body: "Walked outside",
        occurredAt: "2026-05-15T08:00:00.000Z",
        occurredOffsetMinutes: null,
        dayKey: "2026-05-15",
        createdAt: "2026-05-15T08:00:00.000Z",
        updatedAt: "2026-05-15T08:00:00.000Z",
      },
    ]);
    expect(from).toHaveBeenCalledWith("journal_entries");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("occurred_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(25);
  });

  it("pages entries after a deterministic occurred-at and id cursor", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [], error: null });
    const or = jest.fn(() => ({ limit }));
    const orderId = jest.fn(() => ({ or, limit }));
    const orderOccurred = jest.fn(() => ({ order: orderId }));
    const eq = jest.fn(() => ({ order: orderOccurred }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      listJournalEntriesPage("user-1", 50, {
        timestamp: "2026-08-09T13:57:59.000+00:00",
        id: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toEqual([]);

    expect(orderOccurred).toHaveBeenCalledWith("occurred_at", { ascending: false });
    expect(orderId).toHaveBeenCalledWith("id", { ascending: false });
    expect(or).toHaveBeenCalledWith(
      'occurred_at.lt."2026-08-09T13:57:59.000+00:00",and(occurred_at.eq."2026-08-09T13:57:59.000+00:00",id.lt."11111111-1111-4111-8111-111111111111")',
    );
    expect(limit).toHaveBeenCalledWith(50);
  });

  it("sums lifetime words through the RPC rather than the capped list", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 4210, error: null });
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ rpc, from } as unknown as ReturnType<
      typeof requireSupabase
    >);

    await expect(sumJournalWords()).resolves.toBe(4210);
    expect(rpc).toHaveBeenCalledWith("journal_word_total");
    // No table read: the point of the RPC is that no bodies cross the wire.
    expect(from).not.toHaveBeenCalled();
  });

  it("coerces a stringified bigint word total and defaults a null to zero", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: "4210", error: null });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);
    await expect(sumJournalWords()).resolves.toBe(4210);

    rpc.mockResolvedValue({ data: null, error: null });
    await expect(sumJournalWords()).resolves.toBe(0);
  });

  it("throws when the word-total RPC errors", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: new Error("rpc failed") });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);

    await expect(sumJournalWords()).rejects.toThrow("rpc failed");
  });

  it("loads exact adaptive writing buckets without reading journal bodies on the client", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        {
          bucket_start_key: "2026-03-01",
          bucket_end_key: "2026-03-07",
          word_count: 0,
          bucket_unit: "week",
          range_start_key: "2026-03-01",
          range_end_key: "2026-05-29",
        },
        {
          bucket_start_key: "2026-03-08",
          bucket_end_key: "2026-03-14",
          word_count: "421",
          bucket_unit: "week",
          range_start_key: "2026-03-01",
          range_end_key: "2026-05-29",
        },
      ],
      error: null,
    });
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ rpc, from } as unknown as ReturnType<
      typeof requireSupabase
    >);

    await expect(listJournalWritingBuckets("Europe/Sofia", 90)).resolves.toEqual([
      {
        startDayKey: "2026-03-01",
        endDayKey: "2026-03-07",
        wordCount: 0,
        unit: "week",
        rangeStartDayKey: "2026-03-01",
        rangeEndDayKey: "2026-05-29",
      },
      {
        startDayKey: "2026-03-08",
        endDayKey: "2026-03-14",
        wordCount: 421,
        unit: "week",
        rangeStartDayKey: "2026-03-01",
        rangeEndDayKey: "2026-05-29",
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("journal_writing_buckets", {
      p_time_zone: "Europe/Sofia",
      p_days: 90,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("passes null for all time and throws when the bucket RPC errors", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: new Error("rpc failed") });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listJournalWritingBuckets("Europe/Sofia", "all")).rejects.toThrow("rpc failed");
    expect(rpc).toHaveBeenCalledWith("journal_writing_buckets", {
      p_time_zone: "Europe/Sofia",
      p_days: null,
    });
  });

  it("returns null when getJournalEntry finds no row", async () => {
    // Well-formed uuid that matches no row, so the query itself runs (a malformed
    // id short-circuits before supabase - covered separately below).
    const missingId = "11111111-1111-4111-8111-111111111111";
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getJournalEntry("user-1", missingId)).resolves.toBeNull();
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", missingId);
  });

  it("returns null for a malformed id without calling supabase", async () => {
    // /tools/journal/does-not-exist: PostgREST would reject the uuid cast with a 400
    // (console error), so the repository must not fire the doomed request at all.
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getJournalEntry("user-1", "does-not-exist")).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("trims title and body and inserts a new entry", async () => {
    const row = {
      id: "j-1",
      user_id: "user-1",
      title: "Today",
      body: "Walked outside",
      created_at: "2026-05-15T08:00:00.000Z",
      updated_at: "2026-05-15T08:00:00.000Z",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveJournalEntry("user-1", {
      title: "  Today  ",
      body: "  Walked outside  ",
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        title: "Today",
        body: "Walked outside",
      }),
    );
  });

  it("trims and updates an existing entry", async () => {
    const row = {
      id: "j-1",
      user_id: "user-1",
      title: "Updated",
      body: "Body",
      created_at: "2026-05-15T08:00:00.000Z",
      updated_at: "2026-05-15T08:30:00.000Z",
    };
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveJournalEntry("user-1", { title: " Updated ", body: " Body " }, "j-1"),
    ).resolves.toEqual({
      id: "j-1",
      userId: "user-1",
      title: "Updated",
      body: "Body",
      occurredAt: "2026-05-15T08:00:00.000Z",
      occurredOffsetMinutes: null,
      dayKey: "2026-05-15",
      createdAt: "2026-05-15T08:00:00.000Z",
      updatedAt: "2026-05-15T08:30:00.000Z",
    });

    expect(update).toHaveBeenCalledWith({
      title: "Updated",
      body: "Body",
    });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "j-1");
  });

  it("keeps audit created_at immutable when an occurrence time is provided", async () => {
    const row = {
      id: "j-1",
      user_id: "user-1",
      title: "Updated",
      body: "Body",
      occurred_at: "2026-04-01T09:00:00.000Z",
      occurred_offset_minutes: 180,
      created_at: "2026-05-15T08:00:00.000Z",
      updated_at: "2026-05-15T08:30:00.000Z",
    };
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveJournalEntry(
      "user-1",
      { title: "Updated", body: "Body", createdAt: "2026-04-01T09:00:00.000Z" },
      "j-1",
    );

    expect(update).toHaveBeenCalledWith({
      title: "Updated",
      body: "Body",
      occurred_at: "2026-04-01T09:00:00.000Z",
      occurred_offset_minutes: expect.any(Number),
    });
  });

  it("throws a not-found error when the edited entry no longer exists", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveJournalEntry("user-1", { title: "Gone", body: "Body" }, "missing"),
    ).rejects.toThrow("Entry not found");
  });

  it("rejects a future occurrence timestamp", async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveJournalEntry("user-1", { title: "Future", body: "Body", createdAt: future }),
    ).rejects.toThrow("Entry date cannot be in the future");
    expect(from).not.toHaveBeenCalled();
  });

  it("deletes by id scoped to user", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ delete: del }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await deleteJournalEntry("user-1", "j-1");

    expect(from).toHaveBeenCalledWith("journal_entries");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "j-1");
  });

  it("counts journal entries for a user with a head request", async () => {
    const eqUser = jest.fn().mockResolvedValue({ count: 73, error: null });
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countJournalEntries("user-1")).resolves.toBe(73);
    expect(from).toHaveBeenCalledWith("journal_entries");
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("treats a null journal count as zero", async () => {
    const eqUser = jest.fn().mockResolvedValue({ count: null, error: null });
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    await expect(countJournalEntries("user-1")).resolves.toBe(0);
  });

  it("counts journal entries occurring since a cutoff (head request + gte filter)", async () => {
    const gte = jest.fn().mockResolvedValue({ count: 4, error: null });
    const eqUser = jest.fn(() => ({ gte }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countJournalEntriesSince("user-1", "2026-05-13T00:00:00.000Z")).resolves.toBe(4);
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(gte).toHaveBeenCalledWith("occurred_at", "2026-05-13T00:00:00.000Z");
  });
});

import {
  countMoodLogs,
  getFirstMoodDayKey,
  getMoodLog,
  listMoodLogs,
  listMoodLogsPage,
  listMoodScorePoints,
  saveMoodLog,
} from "@/src/features/mood/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

describe("mood repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists mood logs newest-first and maps rows", async () => {
    const rows = [
      {
        id: "log-1",
        user_id: "user-1",
        mood_score: 4,
        emotions: ["Anxious"],
        notes: "Feeling alright",
        linked_strategy: null,
        logged_at: "2026-05-10T08:00:00.000Z",
        created_at: "2026-05-10T08:00:01.000Z",
        situation: "",
        thoughts: "",
        behaviours: "",
        bodily_sensations: "",
      },
    ];
    const limit = jest.fn().mockResolvedValue({ data: rows, error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listMoodLogs("user-1", 15)).resolves.toEqual([
      {
        id: "log-1",
        userId: "user-1",
        moodScore: 4,
        emotions: ["Anxious"],
        notes: "Feeling alright",
        linkedStrategy: null,
        loggedAt: "2026-05-10T08:00:00.000Z",
        loggedOffsetMinutes: null,
        dayKey: "2026-05-10",
        createdAt: "2026-05-10T08:00:01.000Z",
        situation: "",
        thoughts: "",
        behaviours: "",
        bodilySensations: "",
      },
    ]);
    expect(from).toHaveBeenCalledWith("mood_logs");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("logged_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(15);
  });

  it("reads a history page at an offset, ordered by a total order", async () => {
    // `logged_at` alone is not a total order - two entries saved in the same
    // second have no defined relative position, so a row could be returned on
    // both sides of an offset boundary or on neither. `id` breaks the tie.
    const retry = jest.fn().mockResolvedValue({ data: [], error: null });
    const range = jest.fn(() => ({ retry }));
    const orderId = jest.fn(() => ({ range }));
    const orderLoggedAt = jest.fn(() => ({ order: orderId }));
    const eq = jest.fn(() => ({ order: orderLoggedAt }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listMoodLogsPage("user-1", 50, 100)).resolves.toEqual([]);
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(orderLoggedAt).toHaveBeenCalledWith("logged_at", { ascending: false });
    expect(orderId).toHaveBeenCalledWith("id", { ascending: false });
    // Inclusive on both ends, so a 50-row page starting at 100 ends at 149.
    expect(range).toHaveBeenCalledWith(100, 149);
    // React Query owns the retry budget; do not multiply it by PostgREST's
    // three inner retries on every failed page read (#748).
    expect(retry).toHaveBeenCalledWith(false);
  });

  it("returns null when getMoodLog finds no row", async () => {
    // Well-formed uuid that matches no row, so the query itself runs (a malformed
    // id short-circuits before supabase - covered separately below).
    const missingId = "11111111-1111-4111-8111-111111111111";
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getMoodLog("user-1", missingId)).resolves.toBeNull();
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", missingId);
  });

  it("returns null for a malformed id without calling supabase", async () => {
    // PostgREST would reject the uuid cast with a 400 (console error), so the
    // repository must not fire the doomed request at all.
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getMoodLog("user-1", "does-not-exist")).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("maps a single mood log when getMoodLog finds it", async () => {
    const logId = "22222222-2222-4222-8222-222222222222";
    const row = {
      id: logId,
      user_id: "user-1",
      mood_score: 2,
      emotions: null,
      notes: "Low day",
      linked_strategy: "thoughts",
      logged_at: "2026-05-10T08:00:00.000Z",
      created_at: "2026-05-10T08:00:01.000Z",
      situation: "Email",
      thoughts: "",
      behaviours: "",
      bodily_sensations: "",
    };
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getMoodLog("user-1", logId)).resolves.toEqual({
      id: logId,
      userId: "user-1",
      moodScore: 2,
      emotions: [],
      notes: "Low day",
      linkedStrategy: "thoughts",
      loggedAt: "2026-05-10T08:00:00.000Z",
      loggedOffsetMinutes: null,
      dayKey: "2026-05-10",
      createdAt: "2026-05-10T08:00:01.000Z",
      situation: "Email",
      thoughts: "",
      behaviours: "",
      bodilySensations: "",
    });
  });

  it("trims notes and inserts a mood log", async () => {
    const row = {
      id: "log-1",
      user_id: "user-1",
      mood_score: 3,
      emotions: ["Anxious"],
      notes: "Walked it off",
      linked_strategy: null,
      logged_at: "2026-05-10T08:00:00.000Z",
      created_at: "2026-05-10T08:00:01.000Z",
      situation: "S",
      thoughts: "",
      behaviours: "",
      bodily_sensations: "",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveMoodLog("user-1", {
      moodScore: 3,
      emotions: ["Anxious"],
      notes: "  Walked it off  ",
      linkedStrategy: null,
      situation: " S ",
      thoughts: "",
      behaviours: "",
      bodilySensations: "",
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        mood_score: 3,
        emotions: ["Anxious"],
        notes: "Walked it off",
        linked_strategy: null,
        situation: "S",
        thoughts: "",
        behaviours: "",
        bodily_sensations: "",
      }),
    );
  });

  it("sanitizes free text at save (mood saves bypass the zod schemas)", async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: "log-1" }, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveMoodLog("user-1", {
      moodScore: 3,
      emotions: [],
      // NBSP between words + an unpaired surrogate at the end.
      notes: "pasted\u00A0note \uD83D",
      linkedStrategy: null,
      situation: "",
      thoughts: "",
      behaviours: "",
      bodilySensations: "",
    });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ notes: "pasted note" }));
  });

  it("throws a clean not-found when updating a missing or RLS-hidden mood log (#85)", async () => {
    // An update whose id no longer matches a visible row returns 0 rows; the repo must
    // surface a clean not-found instead of PostgREST's opaque PGRST116 from .single().
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const select = jest.fn(() => ({ single: maybeSingle, maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveMoodLog(
        "user-1",
        {
          moodScore: 3,
          emotions: [],
          notes: "",
          linkedStrategy: null,
          situation: "",
          thoughts: "",
          behaviours: "",
          bodilySensations: "",
        },
        "missing-id",
      ),
    ).rejects.toThrow("Mood log not found");
  });

  it("trims notes and updates an existing mood log", async () => {
    const row = {
      id: "log-1",
      user_id: "user-1",
      mood_score: 5,
      emotions: ["Joy"],
      notes: "Better after lunch",
      linked_strategy: "thoughts",
      logged_at: "2026-05-10T08:00:00.000Z",
      created_at: "2026-05-10T08:00:01.000Z",
      situation: "",
      thoughts: "All good",
      behaviours: "",
      bodily_sensations: "",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveMoodLog(
        "user-1",
        {
          moodScore: 5,
          emotions: ["Joy"],
          notes: "  Better after lunch  ",
          linkedStrategy: "thoughts",
          situation: "",
          thoughts: "All good",
          behaviours: "",
          bodilySensations: "",
        },
        "log-1",
      ),
    ).resolves.toEqual({
      id: "log-1",
      userId: "user-1",
      moodScore: 5,
      emotions: ["Joy"],
      notes: "Better after lunch",
      linkedStrategy: "thoughts",
      loggedAt: "2026-05-10T08:00:00.000Z",
      loggedOffsetMinutes: null,
      dayKey: "2026-05-10",
      createdAt: "2026-05-10T08:00:01.000Z",
      situation: "",
      thoughts: "All good",
      behaviours: "",
      bodilySensations: "",
    });

    expect(update).toHaveBeenCalledWith({
      mood_score: 5,
      emotions: ["Joy"],
      notes: "Better after lunch",
      linked_strategy: "thoughts",
      logged_at: expect.any(String),
      logged_offset_minutes: expect.any(Number),
      situation: "",
      thoughts: "All good",
      behaviours: "",
      bodily_sensations: "",
    });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "log-1");
  });

  it("counts all mood logs for a user with a head request", async () => {
    const eqUser = jest.fn().mockResolvedValue({ count: 247, error: null });
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countMoodLogs("user-1")).resolves.toBe(247);
    expect(from).toHaveBeenCalledWith("mood_logs");
    expect(select).toHaveBeenCalledWith("*", { count: "exact", head: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("treats a null count as zero", async () => {
    const eqUser = jest.fn().mockResolvedValue({ count: null, error: null });
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    await expect(countMoodLogs("user-1")).resolves.toBe(0);
  });

  it("lists score points selecting only timestamp, offset, and score", async () => {
    const rows = [
      { logged_at: "2026-07-01T08:00:00.000Z", logged_offset_minutes: 180, mood_score: 4 },
      { logged_at: "2026-07-02T09:00:00.000Z", logged_offset_minutes: null, mood_score: 2 },
    ];
    const range = jest.fn().mockResolvedValue({ data: rows, error: null });
    const order = jest.fn(() => ({ range }));
    const gte = jest.fn(() => ({ order }));
    const eq = jest.fn(() => ({ gte }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listMoodScorePoints("user-1", "2026-07-01T00:00:00.000Z")).resolves.toEqual([
      {
        loggedAt: "2026-07-01T08:00:00.000Z",
        loggedOffsetMinutes: 180,
        dayKey: "2026-07-01",
        moodScore: 4,
      },
      {
        loggedAt: "2026-07-02T09:00:00.000Z",
        loggedOffsetMinutes: null,
        dayKey: "2026-07-02",
        moodScore: 2,
      },
    ]);
    expect(from).toHaveBeenCalledWith("mood_logs");
    expect(select).toHaveBeenCalledWith("logged_at, logged_offset_minutes, mood_score");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(gte).toHaveBeenCalledWith("logged_at", "2026-06-30T00:00:00.000Z");
    expect(order).toHaveBeenCalledWith("logged_at", { ascending: true });
  });

  it("bounds score points with lte when an end of window is given", async () => {
    const range = jest.fn().mockResolvedValue({ data: [], error: null });
    const order = jest.fn(() => ({ range }));
    const lte = jest.fn(() => ({ order }));
    const gte = jest.fn(() => ({ lte }));
    const eq = jest.fn(() => ({ gte }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      listMoodScorePoints("user-1", "2026-03-03T00:00:00.000Z", "2026-04-01T23:59:59.999Z"),
    ).resolves.toEqual([]);
    expect(gte).toHaveBeenCalledWith("logged_at", "2026-03-02T00:00:00.000Z");
    expect(lte).toHaveBeenCalledWith("logged_at", "2026-04-02T23:59:59.999Z");
  });

  it("pages past the PostgREST row cap so long windows never drop the newest rows", async () => {
    // PostgREST caps any single response (1,000 rows by default), so the repository
    // must keep fetching pages until a short page, not trust one unbounded select.
    const fullPage = Array.from({ length: 1000 }, (_, i) => ({
      logged_at: `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}.000Z`,
      logged_offset_minutes: 0,
      mood_score: 3,
    }));
    const lastRow = {
      logged_at: "2026-07-01T08:00:00.000Z",
      logged_offset_minutes: 0,
      mood_score: 5,
    };
    const range = jest
      .fn()
      .mockResolvedValueOnce({ data: fullPage, error: null })
      .mockResolvedValueOnce({ data: [lastRow], error: null });
    const order = jest.fn(() => ({ range }));
    const gte = jest.fn(() => ({ order }));
    const eq = jest.fn(() => ({ gte }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const points = await listMoodScorePoints("user-1", "2026-01-01T00:00:00.000Z");

    expect(points).toHaveLength(1001);
    expect(points[1000]).toEqual({
      loggedAt: "2026-07-01T08:00:00.000Z",
      // An explicitly stored 0 now means a genuine UTC capture, not "unknown".
      loggedOffsetMinutes: 0,
      dayKey: "2026-07-01",
      moodScore: 5,
    });
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  // getFirstMoodDayKey issues TWO queries: the earliest instant, then the window
  // in which an earlier civil day is still arithmetically possible.
  function mockFirstDayKeyQueries(
    firstRow: { logged_at: string; logged_offset_minutes: number | null } | null,
    windowRows: { logged_at: string; logged_offset_minutes: number | null }[] = [],
  ) {
    const maybeSingle = jest.fn().mockResolvedValue({ data: firstRow, error: null });
    const limit = jest.fn(() => ({ maybeSingle }));
    const order = jest.fn(() => ({ limit }));
    const lte = jest.fn().mockResolvedValue({ data: windowRows, error: null });
    const eq = jest.fn(() => ({ order, lte }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    return { select, order, limit, lte };
  }

  it("returns the first mood log's civil day, or null when the user has no logs", async () => {
    const first = { logged_at: "2026-01-05T10:00:00.000Z", logged_offset_minutes: 180 };
    const { select, order, limit } = mockFirstDayKeyQueries(first, [first]);

    // 10:00Z at +180 is 13:00 on the 5th - the day the user actually logged it.
    await expect(getFirstMoodDayKey("user-1")).resolves.toBe("2026-01-05");
    expect(select).toHaveBeenCalledWith("logged_at, logged_offset_minutes");
    expect(order).toHaveBeenCalledWith("logged_at", { ascending: true });
    expect(limit).toHaveBeenCalledWith(1);

    mockFirstDayKeyQueries(null);
    await expect(getFirstMoodDayKey("user-1")).resolves.toBeNull();
  });

  it("prefers a later instant whose captured offset puts it on an earlier civil day", async () => {
    // 15:30Z at +09:00 is Jan 2 local; the LATER 16:00Z at -08:00 is Jan 1 local.
    // Reading only the earliest instant made the picker refuse the real Jan 1.
    const first = { logged_at: "2026-01-01T15:30:00.000Z", logged_offset_minutes: 540 };
    const later = { logged_at: "2026-01-01T16:00:00.000Z", logged_offset_minutes: -480 };
    const { lte } = mockFirstDayKeyQueries(first, [first, later]);

    await expect(getFirstMoodDayKey("user-1")).resolves.toBe("2026-01-01");
    // Window end is the earliest instant + the full 28h offset span.
    expect(lte).toHaveBeenCalledWith("logged_at", "2026-01-02T19:30:00.000Z");
  });
});

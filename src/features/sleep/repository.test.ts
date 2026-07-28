import {
  countSleepLogs,
  deleteSleepLog,
  getSleepLog,
  listSleepLogs,
  saveSleepLog,
  sleepStats,
} from "@/src/features/sleep/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

const sampleRow = {
  id: "sl-1",
  user_id: "user-1",
  duration_minutes: 480,
  quality: 4,
  notes: "deep",
  logged_at: "2026-05-15T07:00:00.000Z",
  created_at: "2026-05-15T07:00:00.000Z",
};

describe("sleep repository", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists logs newest-first with limit", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [sampleRow], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listSleepLogs("user-1", 25);
    expect(from).toHaveBeenCalledWith("sleep_logs");
    expect(order).toHaveBeenCalledWith("logged_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(25);
  });

  it("returns null when getSleepLog finds nothing", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    // Well-formed uuid that matches no row, so the query itself runs (a malformed
    // id short-circuits to null before supabase).
    await expect(getSleepLog("user-1", "11111111-1111-4111-8111-111111111111")).resolves.toBeNull();
    expect(maybeSingle).toHaveBeenCalled();
  });

  it("returns null for a malformed id without calling supabase", async () => {
    // /tools/sleep/999: PostgREST would reject the uuid cast with a 400 (console
    // error), so the repository must not fire the doomed request at all.
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getSleepLog("user-1", "999")).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("trims notes and inserts a new log", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveSleepLog("user-1", {
      durationMinutes: 480,
      quality: 4,
      notes: "  deep  ",
    });

    expect(insert).toHaveBeenCalledWith({
      duration_minutes: 480,
      quality: 4,
      notes: "deep",
      user_id: "user-1",
    });
  });

  it("updates an existing log scoped to user and id", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveSleepLog("user-1", { durationMinutes: 420, quality: 3, notes: "x" }, "sl-1");
    expect(update).toHaveBeenCalledWith({
      duration_minutes: 420,
      quality: 3,
      notes: "x",
    });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "sl-1");
  });

  it("deletes a log scoped to user and id", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ delete: del }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await deleteSleepLog("user-1", "sl-1");
    expect(from).toHaveBeenCalledWith("sleep_logs");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "sl-1");
  });

  it("counts all sleep logs for a user with a head request", async () => {
    const eqUser = jest.fn().mockResolvedValue({ count: 123, error: null });
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countSleepLogs("user-1")).resolves.toBe(123);
    expect(from).toHaveBeenCalledWith("sleep_logs");
    expect(select).toHaveBeenCalledWith("*", { count: "exact", head: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("treats a null sleep-log count as zero", async () => {
    const eqUser = jest.fn().mockResolvedValue({ count: null, error: null });
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    await expect(countSleepLogs("user-1")).resolves.toBe(0);
  });
});

describe("sleep repository - sleepStats", () => {
  beforeEach(() => jest.clearAllMocks());

  function mockRpc(row: unknown) {
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const rpc = jest.fn(() => ({ maybeSingle }));
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ rpc, from } as unknown as ReturnType<
      typeof requireSupabase
    >);
    return { rpc, from };
  }

  const fullRow = {
    avg_duration_minutes_7: 420,
    avg_quality_7: 4,
    avg_duration_minutes_30: 471.4285714285714286,
    avg_quality_30: 3.7142857142857143,
    quality_counts_30: [0, 30, 0, 0, 40],
    longest_minutes: 600,
    shortest_minutes: 300,
    weekday_avg_minutes: [500, 450, null, null, null, 480, 500],
  };

  it("takes the summary through the RPC rather than the capped list", async () => {
    const { rpc, from } = mockRpc(fullRow);

    const stats = await sleepStats("Europe/Sofia");

    expect(rpc).toHaveBeenCalledWith("sleep_stats", { p_time_zone: "Europe/Sofia" });
    // No table read: the point of the RPC is that no sleep rows cross the wire, so a
    // 50-row cap cannot creep back into any of these figures.
    expect(from).not.toHaveBeenCalled();
    expect(stats).toEqual({
      sevenDayDurationMinutes: 420,
      sevenDayQuality: 4,
      thirtyDayDurationMinutes: 471,
      thirtyDayQuality: 3.7,
      qualityDistribution30: [0, 30, 0, 0, 40],
      longestMinutes: 600,
      shortestMinutes: 300,
      weekdayAverageMinutes: [500, 450, null, null, null, 480, 500],
    });
  });

  it("rounds a half-minute average up, the way the client-side summaries did", async () => {
    // 450 and 451 minutes average to 450.5. Math.round takes that to 451, matching
    // averageDurationMinutes(); Postgres round(double precision) would break the tie to
    // even and say 450, which is why the rounding stays on this side.
    mockRpc({ ...fullRow, avg_duration_minutes_7: 450.5, weekday_avg_minutes: [450.5] });

    const stats = await sleepStats("UTC");

    expect(stats?.sevenDayDurationMinutes).toBe(451);
    expect(stats?.weekdayAverageMinutes[0]).toBe(451);
  });

  it("rounds quality to one decimal, the way averageQuality() did", async () => {
    mockRpc({ ...fullRow, avg_quality_7: 3.7142857142857143, avg_quality_30: 4.25 });

    const stats = await sleepStats("UTC");

    expect(stats?.sevenDayQuality).toBe(3.7);
    expect(stats?.thirtyDayQuality).toBe(4.3);
  });

  it("coerces stringified numerics - `numeric` crosses the wire as a string", async () => {
    mockRpc({
      ...fullRow,
      avg_duration_minutes_7: "471.4285714285714286",
      avg_quality_7: "3.7142857142857143",
      quality_counts_30: ["1", "2", "3", "4", "5"],
      weekday_avg_minutes: ["450.5", null, null, null, null, null, null],
    });

    const stats = await sleepStats("UTC");

    expect(stats?.sevenDayDurationMinutes).toBe(471);
    expect(stats?.sevenDayQuality).toBe(3.7);
    expect(stats?.qualityDistribution30).toEqual([1, 2, 3, 4, 5]);
    expect(stats?.weekdayAverageMinutes[0]).toBe(451);
  });

  it("keeps an empty window null rather than calling it zero", async () => {
    // A user with no nights in the window has no average, which is not a zero-hour
    // night - the screen renders the shared "-" placeholder for it.
    mockRpc({
      avg_duration_minutes_7: null,
      avg_quality_7: null,
      avg_duration_minutes_30: null,
      avg_quality_30: null,
      quality_counts_30: [0, 0, 0, 0, 0],
      longest_minutes: null,
      shortest_minutes: null,
      weekday_avg_minutes: [null, null, null, null, null, null, null],
    });

    const stats = await sleepStats("UTC");

    expect(stats?.sevenDayDurationMinutes).toBeNull();
    expect(stats?.thirtyDayQuality).toBeNull();
    expect(stats?.longestMinutes).toBeNull();
    expect(stats?.weekdayAverageMinutes).toEqual([null, null, null, null, null, null, null]);
    // Counts are genuinely zero, though - nobody logged a quality-3 night.
    expect(stats?.qualityDistribution30).toEqual([0, 0, 0, 0, 0]);
  });

  it("pads short arrays so the charts always get the shape they render", async () => {
    // The function always returns dense arrays; a summary that silently drew four
    // quality bars would be worse than one that drew five, the fifth empty.
    mockRpc({ ...fullRow, quality_counts_30: [7], weekday_avg_minutes: null });

    const stats = await sleepStats("UTC");

    expect(stats?.qualityDistribution30).toEqual([7, 0, 0, 0, 0]);
    expect(stats?.weekdayAverageMinutes).toHaveLength(7);
    expect(stats?.weekdayAverageMinutes.every((v) => v === null)).toBe(true);
  });

  it("throws when the stats RPC errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: new Error("rpc failed") });
    const rpc = jest.fn(() => ({ maybeSingle }));
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);

    await expect(sleepStats("UTC")).rejects.toThrow("rpc failed");
  });

  it("returns null when the RPC yields no row, so the screen keeps its fallback", async () => {
    mockRpc(null);
    await expect(sleepStats("UTC")).resolves.toBeNull();
  });
});

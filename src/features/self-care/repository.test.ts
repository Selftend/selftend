import {
  getLatestSelfCareLogAt,
  getSelfCareLog,
  listSelfCareLogs,
  upsertSelfCareLog,
} from "@/src/features/self-care/repository";
import { fetchLatestActivity } from "@/src/lib/latest-activity";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

jest.mock("@/src/lib/latest-activity", () => ({ fetchLatestActivity: jest.fn() }));

const mockFetchLatestActivity = jest.mocked(fetchLatestActivity);

const mockRequireSupabase = jest.mocked(requireSupabase);

const sampleRow = {
  id: "sc-1",
  user_id: "user-1",
  log_date: "2026-05-15",
  exercise_done: true,
  exercise_minutes: 30,
  exercise_type: "walk",
  meals_structured: 3,
  emotional_eating: false,
  social_connection_made: true,
  social_notes: "talked to friend",
  meaningful_activity: "read",
  created_at: "2026-05-15T08:00:00.000Z",
  updated_at: "2026-05-15T08:00:00.000Z",
};

describe("self-care repository", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null when getSelfCareLog finds no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqDate = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqDate }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getSelfCareLog("user-1", "2026-05-15")).resolves.toBeNull();
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqDate).toHaveBeenCalledWith("log_date", "2026-05-15");
  });

  it("lists logs by log_date desc with default limit 14", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [sampleRow], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listSelfCareLogs("user-1");
    expect(order).toHaveBeenCalledWith("log_date", { ascending: false });
    expect(limit).toHaveBeenCalledWith(14);
  });

  it("inserts on (user_id, log_date) and trims text fields", async () => {
    // self_care_logs is an encrypted view; the (user_id, log_date) merge is resolved by the
    // view's INSTEAD OF trigger, so the client inserts plainly (a view cannot be the target of
    // INSERT ... ON CONFLICT).
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await upsertSelfCareLog("user-1", {
      logDate: "2026-05-15",
      exerciseDone: true,
      exerciseMinutes: 30,
      exerciseType: "  walk  ",
      mealsStructured: 3,
      emotionalEating: false,
      socialConnectionMade: true,
      socialNotes: "  hi  ",
      meaningfulActivity: "  read  ",
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        log_date: "2026-05-15",
        exercise_type: "walk",
        social_notes: "hi",
        meaningful_activity: "read",
      }),
    );
  });
});

describe("getLatestSelfCareLogAt", () => {
  // `created_at`, not `log_date`: a bare "YYYY-MM-DD" parses as UTC midnight and renders
  // as the previous day west of UTC, and a back-dated log sorts outside the day window.
  it("dates the newest log by its instant, not by its day key (#990)", async () => {
    mockFetchLatestActivity.mockResolvedValue(null);

    await getLatestSelfCareLogAt("user-1");

    expect(mockFetchLatestActivity).toHaveBeenCalledWith({
      table: "self_care_logs",
      userId: "user-1",
      column: "created_at",
    });
  });
});

import {
  getSelfCareLog,
  listSelfCareLogs,
  upsertSelfCareLog,
} from "@/src/features/self-care/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

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

  it("upserts on (user_id, log_date) and trims text fields", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ upsert }));
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

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        log_date: "2026-05-15",
        exercise_type: "walk",
        social_notes: "hi",
        meaningful_activity: "read",
      }),
      { onConflict: "user_id,log_date" },
    );
  });
});

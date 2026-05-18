import {
  deleteSleepLog,
  getSleepLog,
  listSleepLogs,
  saveSleepLog,
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

    await expect(getSleepLog("user-1", "missing")).resolves.toBeNull();
  });

  it("trims notes and inserts a new log", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single }));
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
    const select = jest.fn(() => ({ single }));
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
});

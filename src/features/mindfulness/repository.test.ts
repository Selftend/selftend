import {
  listMindfulnessSessions,
  saveMindfulnessSession,
} from "@/src/features/mindfulness/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

const sampleRow = {
  id: "ms-1",
  user_id: "user-1",
  exercise_name: "breath-awareness",
  duration_minutes: 5,
  reflection: "felt calm",
  mood_after: null,
  feeling_after: "calmer",
  completed_at: "2026-05-15T08:05:00.000Z",
  created_at: "2026-05-15T08:00:00.000Z",
};

describe("mindfulness repository", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists sessions newest-first with limit", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [sampleRow], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const sessions = await listMindfulnessSessions("user-1", 10);
    expect(from).toHaveBeenCalledWith("mindfulness_sessions");
    expect(order).toHaveBeenCalledWith("completed_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(10);
    expect(sessions[0].feelingAfter).toBe("calmer");
  });

  it("uses default limit of 30 when none given", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listMindfulnessSessions("user-1");
    expect(limit).toHaveBeenCalledWith(30);
  });

  it("trims reflection and inserts a session with feeling", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveMindfulnessSession("user-1", {
      exerciseName: "breath-awareness",
      durationMinutes: 5,
      reflection: "  felt calm  ",
      feelingAfter: "calmer",
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      exercise_name: "breath-awareness",
      duration_minutes: 5,
      reflection: "felt calm",
      feeling_after: "calmer",
      mood_after: null,
      cycles: null,
      duration_seconds: null,
    });
  });

  it("null-coerces missing feelingAfter", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveMindfulnessSession("user-1", {
      exerciseName: "x",
      durationMinutes: 1,
      reflection: "",
      feelingAfter: null,
    });
    const calls = insert.mock.calls as unknown as [{ feeling_after: string | null }][];
    expect(calls[0][0].feeling_after).toBeNull();
  });
});

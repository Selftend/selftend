import { getMoodLog, listMoodLogs, saveMoodLog } from "@/src/features/mood/repository";
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
        createdAt: "2026-05-10T08:00:01.000Z",
      },
    ]);
    expect(from).toHaveBeenCalledWith("mood_logs");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("logged_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(15);
  });

  it("returns null when getMoodLog finds no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getMoodLog("user-1", "missing")).resolves.toBeNull();
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "missing");
  });

  it("maps a single mood log when getMoodLog finds it", async () => {
    const row = {
      id: "log-1",
      user_id: "user-1",
      mood_score: 2,
      emotions: null,
      notes: "Low day",
      linked_strategy: "thoughts",
      logged_at: "2026-05-10T08:00:00.000Z",
      created_at: "2026-05-10T08:00:01.000Z",
    };
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getMoodLog("user-1", "log-1")).resolves.toEqual({
      id: "log-1",
      userId: "user-1",
      moodScore: 2,
      emotions: [],
      notes: "Low day",
      linkedStrategy: "thoughts",
      loggedAt: "2026-05-10T08:00:00.000Z",
      createdAt: "2026-05-10T08:00:01.000Z",
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
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveMoodLog("user-1", {
      moodScore: 3,
      emotions: ["Anxious"],
      notes: "  Walked it off  ",
      linkedStrategy: null,
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        mood_score: 3,
        emotions: ["Anxious"],
        notes: "Walked it off",
        linked_strategy: null,
      }),
    );
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
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single }));
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
      createdAt: "2026-05-10T08:00:01.000Z",
    });

    expect(update).toHaveBeenCalledWith({
      mood_score: 5,
      emotions: ["Joy"],
      notes: "Better after lunch",
      linked_strategy: "thoughts",
    });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "log-1");
  });
});

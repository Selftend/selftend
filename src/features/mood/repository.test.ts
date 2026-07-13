import {
  countMoodLogs,
  getMoodLog,
  listMoodLogs,
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
        loggedOffsetMinutes: 0,
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
      loggedOffsetMinutes: 0,
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
      loggedOffsetMinutes: 0,
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
});

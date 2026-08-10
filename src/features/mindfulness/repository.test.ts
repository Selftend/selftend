import {
  countMindfulnessSessionsByNames,
  listMindfulnessSessions,
  listMindfulnessSessionsByNamesPage,
  listMindfulnessSessionsExcludingNamesPage,
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

// The jest runner pins TZ to Asia/Kolkata (+05:30), so "the viewer's day" is fixed.
// 19:00Z on the 15th is 00:30 on the 16th in Kolkata but midday on the 15th at
// UTC-7 - one instant that lands on two different civil days.
const ACROSS_MIDNIGHT_AT = "2026-05-15T19:00:00.000Z";
const CAPTURED_DAY = "2026-05-15";
const VIEWER_DAY = "2026-05-16";

const listOne = (row: Record<string, unknown>) => {
  const limit = jest.fn().mockResolvedValue({ data: [row], error: null });
  const order = jest.fn(() => ({ limit }));
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
};

describe("mindfulness repository", () => {
  beforeEach(() => jest.clearAllMocks());

  it("buckets a session to its captured day, not the viewer's", async () => {
    listOne({
      ...sampleRow,
      completed_at: ACROSS_MIDNIGHT_AT,
      completed_offset_minutes: -420, // finished at midday somewhere at UTC-7
    });

    const [session] = await listMindfulnessSessions("user-1");
    expect(session.completedOffsetMinutes).toBe(-420);
    expect(session.dayKey).toBe(CAPTURED_DAY);
    // The instant alone would have filed it under the viewer's tomorrow.
    expect(session.dayKey).not.toBe(VIEWER_DAY);
  });

  it("falls back to the viewer's day when no offset was captured", async () => {
    // Same instant, offset absent: null means "unknown", never "UTC" (#250), so the
    // session renders exactly where it always has rather than moving.
    listOne({ ...sampleRow, completed_at: ACROSS_MIDNIGHT_AT, completed_offset_minutes: null });

    const [session] = await listMindfulnessSessions("user-1");
    expect(session.completedOffsetMinutes).toBeNull();
    expect(session.dayKey).toBe(VIEWER_DAY);
  });

  it("treats a column absent from an older response as uncaptured", async () => {
    listOne({ ...sampleRow, completed_at: ACROSS_MIDNIGHT_AT });

    const [session] = await listMindfulnessSessions("user-1");
    expect(session.completedOffsetMinutes).toBeNull();
    expect(session.dayKey).toBe(VIEWER_DAY);
  });

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

  it("anchors an exclusion page to the encoded completion cursor", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [sampleRow], error: null });
    const or = jest.fn(() => ({ limit }));
    const orderId = jest.fn(() => ({ or, limit }));
    const orderAt = jest.fn(() => ({ order: orderId }));
    const not = jest.fn(() => ({ order: orderAt }));
    const eq = jest.fn(() => ({ not }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listMindfulnessSessionsExcludingNamesPage("user-1", ["grounding"], 20, {
      timestamp: "2026-08-09T13:57:59.000+00:00",
      id: "11111111-1111-4111-8111-111111111111",
    });

    expect(not).toHaveBeenCalledWith("exercise_name", "in", '("grounding")');
    expect(or).toHaveBeenCalledWith(
      'completed_at.lt."2026-08-09T13:57:59.000+00:00",and(completed_at.eq."2026-08-09T13:57:59.000+00:00",id.lt."11111111-1111-4111-8111-111111111111")',
    );
    expect(limit).toHaveBeenCalledWith(20);
  });

  it("anchors an included-name page to the encoded completion cursor", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [sampleRow], error: null });
    const or = jest.fn(() => ({ limit }));
    const orderId = jest.fn(() => ({ or, limit }));
    const orderAt = jest.fn(() => ({ order: orderId }));
    const inNames = jest.fn(() => ({ order: orderAt }));
    const eq = jest.fn(() => ({ in: inNames }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listMindfulnessSessionsByNamesPage("user-1", ["54321"], 20, {
      timestamp: "2026-08-09T13:57:59.000+00:00",
      id: "11111111-1111-4111-8111-111111111111",
    });

    expect(inNames).toHaveBeenCalledWith("exercise_name", ["54321"]);
    expect(or).toHaveBeenCalledWith(
      'completed_at.lt."2026-08-09T13:57:59.000+00:00",and(completed_at.eq."2026-08-09T13:57:59.000+00:00",id.lt."11111111-1111-4111-8111-111111111111")',
    );
    expect(limit).toHaveBeenCalledWith(20);
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
      steps_completed: null,
      steps_total: null,
      completed_at: expect.any(String),
      completed_offset_minutes: expect.any(Number),
    });
  });

  it("sends the completion instant and its offset from one reading of the clock", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveMindfulnessSession("user-1", {
      exerciseName: "box-breathing",
      durationMinutes: 4,
      reflection: "",
      feelingAfter: null,
    });

    const payload = (insert.mock.calls as unknown as [Record<string, unknown>][])[0][0];
    // The pair has to describe the same moment: the offset must be the one in force
    // at the instant sent, not whatever a second clock reading would have produced.
    const sent = new Date(payload.completed_at as string);
    expect(Number.isNaN(sent.getTime())).toBe(false);
    expect(payload.completed_offset_minutes).toBe(-sent.getTimezoneOffset());
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

  it("counts sessions of the given exercise names with a head request", async () => {
    const inFn = jest.fn().mockResolvedValue({ count: 9, error: null });
    const eqUser = jest.fn(() => ({ in: inFn }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countMindfulnessSessionsByNames("user-1", ["grounding-54321"])).resolves.toBe(9);
    expect(from).toHaveBeenCalledWith("mindfulness_sessions");
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(inFn).toHaveBeenCalledWith("exercise_name", ["grounding-54321"]);
  });

  it("treats a null grounding count as zero", async () => {
    const inFn = jest.fn().mockResolvedValue({ count: null, error: null });
    const eqUser = jest.fn(() => ({ in: inFn }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    await expect(countMindfulnessSessionsByNames("user-1", ["x"])).resolves.toBe(0);
  });
});

import {
  countMeditationSessions,
  getMeditationProgramState,
  getMeditationSession,
  listMeditationMinutesSince,
  listMeditationSessions,
  listMeditationSessionsPage,
  listStagePracticeNotes,
  medianMeditationMinutes,
  saveMeditationSession,
  saveStagePracticeNote,
  upsertMeditationProgramState,
} from "@/src/features/meditation/repository";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

function buildClient(builders: Record<string, unknown>) {
  return { from: jest.fn((table: string) => builders[table]) } as unknown as ReturnType<
    typeof requireSupabase
  >;
}

// The runner's timezone is pinned to Asia/Kolkata (+05:30) in jest.config.js, so a
// captured offset of +09:00 or -08:00 genuinely disagrees with the viewer's day.
const VIEWER_OFFSET_MINUTES = 330;
const TOKYO_OFFSET_MINUTES = 540;
const LOS_ANGELES_OFFSET_MINUTES = -480;

describe("meditation repository - the captured day (#330)", () => {
  async function readOneSession(row: Record<string, unknown>) {
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { select } }));
    return getMeditationSession("u1", VALID_UUID);
  }

  it("files a sit on the day it was on where the user sat, not where they now stand", async () => {
    // 15:30 UTC is 00:30 on the 16th in Tokyo - the sit happened on the 16th and
    // must stay there. A viewer in Kolkata sees 21:00 on the 15th, which is
    // where this session used to land.
    const session = await readOneSession(
      sessionRow({
        completed_at: "2026-07-15T15:30:00.000Z",
        completed_offset_minutes: TOKYO_OFFSET_MINUTES,
      }),
    );

    expect(session?.dayKey).toBe("2026-07-16");
    expect(session?.completedOffsetMinutes).toBe(TOKYO_OFFSET_MINUTES);
  });

  it("moves the day backwards too, when the sit was west of the viewer", async () => {
    // 02:00 UTC is 18:00 the previous day in Los Angeles; Kolkata reads 07:30 on
    // the 15th. Same instant, and the captured day is the 14th.
    const session = await readOneSession(
      sessionRow({
        completed_at: "2026-07-15T02:00:00.000Z",
        completed_offset_minutes: LOS_ANGELES_OFFSET_MINUTES,
      }),
    );

    expect(session?.dayKey).toBe("2026-07-14");
  });

  it("falls back to the viewer's local day when no offset was captured", async () => {
    // Rows predating the column, and writes from older clients. Null is
    // "unknown", never a claim of UTC - the fallback puts these exactly where
    // they have always rendered: 15:30 UTC is 21:00 on the 15th in Kolkata.
    const session = await readOneSession(sessionRow({ completed_at: "2026-07-15T15:30:00.000Z" }));

    expect(session?.completedOffsetMinutes).toBeNull();
    expect(session?.dayKey).toBe("2026-07-15");
  });
});

describe("meditation repository - saveMeditationSession", () => {
  it("sends the completion instant and its offset from one reading of the clock", async () => {
    // completed_at used to be left to the server default. Pairing a
    // server-stamped instant with a device offset is two clocks: at 23:59 they
    // disagree about the day, which is the one thing the offset is for (#330).
    jest.useFakeTimers({ now: new Date("2026-07-15T18:29:00.000Z") });
    try {
      const single = jest.fn().mockResolvedValue({ data: sessionRow(), error: null });
      const select = jest.fn(() => ({ single }));
      let sent: Record<string, unknown> = {};
      const insert = jest.fn((values: Record<string, unknown>) => {
        sent = values;
        return { select };
      });
      mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { insert } }));

      await saveMeditationSession("u1", { stageAtSession: 3, durationMinutes: 15 });

      const payload = sent as {
        completed_at: string;
        completed_offset_minutes: number;
      };
      expect(payload.completed_at).toBe("2026-07-15T18:29:00.000Z");
      expect(payload.completed_offset_minutes).toBe(VIEWER_OFFSET_MINUTES);
      // 18:29 UTC is 23:59 in Kolkata: still the 15th where the user sat, and
      // the 16th to anyone reading the raw instant an hour east of them. The
      // pair the writer sends has to resolve to the former.
      expect(entryDayKey(payload.completed_at, payload.completed_offset_minutes)).toBe(
        "2026-07-15",
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("records when the sit ended, not when the reflection form was saved", async () => {
    // The timer stops, the post-sit form opens, and the mutation does not fire
    // until the user saves. Those are different instants and can straddle
    // midnight: a sit that ended 23:50 on the 15th, saved 00:20 on the 16th,
    // used to be stamped with the save. That now lands permanently, because the
    // stored instant/offset pair *is* the civil day the widgets and routines
    // read (#330).
    jest.useFakeTimers({ now: new Date("2026-07-15T18:50:00.000Z") }); // 00:20 on the 16th in Kolkata
    try {
      const single = jest.fn().mockResolvedValue({ data: sessionRow(), error: null });
      const select = jest.fn(() => ({ single }));
      let sent: Record<string, unknown> = {};
      const insert = jest.fn((values: Record<string, unknown>) => {
        sent = values;
        return { select };
      });
      mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { insert } }));

      await saveMeditationSession("u1", {
        stageAtSession: 3,
        durationMinutes: 15,
        occurredAt: {
          occurredAt: "2026-07-15T18:20:00.000Z", // 23:50 on the 15th in Kolkata
          occurredOffsetMinutes: VIEWER_OFFSET_MINUTES,
        },
      });

      const payload = sent as { completed_at: string; completed_offset_minutes: number };
      expect(payload.completed_at).toBe("2026-07-15T18:20:00.000Z");
      expect(entryDayKey(payload.completed_at, payload.completed_offset_minutes)).toBe(
        "2026-07-15",
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("falls back to the clock when the caller has no sit-end instant", async () => {
    // Callers without an earlier instant - anything that is not the timer
    // handover - must keep the old behaviour rather than send a null through.
    jest.useFakeTimers({ now: new Date("2026-07-15T18:29:00.000Z") });
    try {
      const single = jest.fn().mockResolvedValue({ data: sessionRow(), error: null });
      const select = jest.fn(() => ({ single }));
      let sent: Record<string, unknown> = {};
      const insert = jest.fn((values: Record<string, unknown>) => {
        sent = values;
        return { select };
      });
      mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { insert } }));

      await saveMeditationSession("u1", {
        stageAtSession: 3,
        durationMinutes: 15,
        occurredAt: null,
      });

      expect((sent as { completed_at: string }).completed_at).toBe("2026-07-15T18:29:00.000Z");
    } finally {
      jest.useRealTimers();
    }
  });

  it("rejects a sit-end instant in the future", async () => {
    // The pair arrives as route params, so a deep link can supply anything.
    jest.useFakeTimers({ now: new Date("2026-07-15T18:29:00.000Z") });
    try {
      const insert = jest.fn();
      mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { insert } }));

      await expect(
        saveMeditationSession("u1", {
          stageAtSession: 3,
          durationMinutes: 15,
          occurredAt: {
            occurredAt: "2026-07-16T18:29:00.000Z",
            occurredOffsetMinutes: VIEWER_OFFSET_MINUTES,
          },
        }),
      ).rejects.toThrow(/future/i);
      expect(insert).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("trims reflection text and writes stage-aware fields", async () => {
    const row = {
      id: "11111111-1111-4111-8111-111111111111",
      user_id: "u1",
      stage_at_session: 3,
      duration_minutes: 15,
      completed_at: "2026-05-16T08:00:00.000Z",
      created_at: "2026-05-16T08:00:00.000Z",
      mind_wandering_episodes: 2,
      dullness_level: null,
      distraction_level: null,
      obstacle_tags: ["forgetting"],
      reflection: "trimmed",
      mood_after: 7,
      technique_used: "followingTheBreath",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));

    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { insert } }));

    const result = await saveMeditationSession("u1", {
      stageAtSession: 3,
      durationMinutes: 15,
      mindWanderingEpisodes: 2,
      reflection: "  trimmed  ",
      moodAfter: 7,
      obstacleTags: ["forgetting"],
      techniqueUsed: "followingTheBreath",
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "u1",
      stage_at_session: 3,
      duration_minutes: 15,
      // Pinned to the clock by the occurrence test above; here they only have to
      // be present, so this assertion stays about the stage-aware fields.
      completed_at: expect.any(String),
      completed_offset_minutes: expect.any(Number),
      mind_wandering_episodes: 2,
      dullness_level: null,
      distraction_level: null,
      obstacle_tags: ["forgetting"],
      reflection: "trimmed",
      mood_after: 7,
      technique_used: "followingTheBreath",
    });
    expect(result.reflection).toBe("trimmed");
    expect(result.stageAtSession).toBe(3);
    expect(result.obstacleTags).toEqual(["forgetting"]);
  });
});

describe("meditation repository - getMeditationProgramState", () => {
  it("returns null when no row exists for the user", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));

    mockRequireSupabase.mockReturnValue(buildClient({ meditation_program_state: { select } }));

    const result = await getMeditationProgramState("u1");
    expect(result).toBeNull();
  });

  it("maps a returned row to a typed program state", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        user_id: "u1",
        current_stage: 4,
        assessed_stage: 2,
        milestones_reached: [1],
        onboarding_completed_at: "2026-05-10T07:00:00.000Z",
        last_session_at: "2026-05-16T07:00:00.000Z",
        preferred_duration_minutes: 20,
        preferred_time_of_day: "07:00",
        created_at: "2026-05-10T07:00:00.000Z",
        updated_at: "2026-05-16T07:00:00.000Z",
      },
      error: null,
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));

    mockRequireSupabase.mockReturnValue(buildClient({ meditation_program_state: { select } }));

    const result = await getMeditationProgramState("u1");
    expect(result?.currentStage).toBe(4);
    expect(result?.assessedStage).toBe(2);
    expect(result?.milestonesReached).toEqual([1]);
    expect(result?.preferredDurationMinutes).toBe(20);
  });
});

describe("meditation repository - upsertMeditationProgramState", () => {
  it("only sends fields that were passed in the patch", async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        user_id: "u1",
        current_stage: 5,
        assessed_stage: 2,
        milestones_reached: [1],
        onboarding_completed_at: "2026-05-10T07:00:00.000Z",
        last_session_at: null,
        preferred_duration_minutes: null,
        preferred_time_of_day: null,
        created_at: "2026-05-10T07:00:00.000Z",
        updated_at: "2026-05-16T07:00:00.000Z",
      },
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));

    mockRequireSupabase.mockReturnValue(buildClient({ meditation_program_state: { upsert } }));

    await upsertMeditationProgramState("u1", { currentStage: 5 });
    const calls = upsert.mock.calls as unknown as [Record<string, unknown>][];
    const payload = calls[0]?.[0] ?? {};
    expect(payload).toMatchObject({ user_id: "u1", current_stage: 5 });
    expect(payload).not.toHaveProperty("preferred_duration_minutes");
    expect(payload).not.toHaveProperty("assessed_stage");
  });
});

describe("meditation repository - countMeditationSessions", () => {
  it("counts all sessions for a user with a head request", async () => {
    const eqUser = jest.fn().mockResolvedValue({ count: 88, error: null });
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { select } }));

    await expect(countMeditationSessions("u1")).resolves.toBe(88);
    expect(select).toHaveBeenCalledWith("*", { count: "exact", head: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
  });

  it("treats a null count as zero", async () => {
    const eqUser = jest.fn().mockResolvedValue({ count: null, error: null });
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { select } }));
    await expect(countMeditationSessions("u1")).resolves.toBe(0);
  });

  it("throws when the count query errors", async () => {
    const eqUser = jest.fn().mockResolvedValue({ count: null, error: { code: "42P01" } });
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { select } }));
    await expect(countMeditationSessions("u1")).rejects.toMatchObject({ code: "42P01" });
  });
});

describe("meditation repository - medianMeditationMinutes", () => {
  it("takes the median through the RPC rather than the capped list", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 25, error: null });
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ rpc, from } as unknown as ReturnType<
      typeof requireSupabase
    >);

    await expect(medianMeditationMinutes()).resolves.toBe(25);
    expect(rpc).toHaveBeenCalledWith("meditation_median_minutes");
    // No table read: the point of the RPC is that no session rows cross the wire, so a
    // 200-row cap cannot creep back in.
    expect(from).not.toHaveBeenCalled();
  });

  it("rounds a half-minute median up, the way the client-side median() did", async () => {
    // percentile_cont interpolates an even-count median, so 20 and 25 minute sits give
    // 22.5. Math.round takes that to 23; Postgres round(double precision) would break the
    // tie to even and say 22, which is why the rounding stays on this side.
    const rpc = jest.fn().mockResolvedValue({ data: 22.5, error: null });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);

    await expect(medianMeditationMinutes()).resolves.toBe(23);
  });

  it("coerces a stringified numeric and keeps null distinct from zero", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: "17.5", error: null });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);
    await expect(medianMeditationMinutes()).resolves.toBe(18);

    // No sessions at all is null, not a zero-minute median - the hero renders a dash.
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(medianMeditationMinutes()).resolves.toBeNull();
  });

  it("throws when the median RPC errors", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: new Error("rpc failed") });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);

    await expect(medianMeditationMinutes()).rejects.toThrow("rpc failed");
  });
});

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "s1",
    user_id: "u1",
    stage_at_session: 3,
    duration_minutes: 15,
    completed_at: "2026-05-16T08:00:00.000Z",
    created_at: "2026-05-16T08:00:00.000Z",
    mind_wandering_episodes: 2,
    dullness_level: "moderate",
    distraction_level: "mild",
    obstacle_tags: ["forgetting"],
    reflection: "a note",
    mood_after: 7,
    technique_used: "followingTheBreath",
    ...overrides,
  };
}

describe("meditation repository - listMeditationSessions", () => {
  it("maps rows and reads the first 30 by default", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [sessionRow()], error: null });
    const orderId = jest.fn(() => ({ limit }));
    const order = jest.fn(() => ({ order: orderId }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { select } }));

    const result = await listMeditationSessions("u1");
    expect(result[0]).toMatchObject({ id: "s1", stageAtSession: 3, durationMinutes: 15 });
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(order).toHaveBeenCalledWith("completed_at", { ascending: false });
    expect(orderId).toHaveBeenCalledWith("id", { ascending: false });
    expect(limit).toHaveBeenCalledWith(30);
  });

  it("anchors a later page to an encoded timestamp and id cursor", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [], error: null });
    const or = jest.fn(() => ({ limit }));
    const orderId = jest.fn(() => ({ or, limit }));
    const order = jest.fn(() => ({ order: orderId }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { select } }));

    await listMeditationSessionsPage("u1", 20, {
      timestamp: "2026-08-09T13:57:59.000+00:00",
      id: "11111111-1111-4111-8111-111111111111",
    });
    expect(or).toHaveBeenCalledWith(
      'completed_at.lt."2026-08-09T13:57:59.000+00:00",and(completed_at.eq."2026-08-09T13:57:59.000+00:00",id.lt."11111111-1111-4111-8111-111111111111")',
    );
    expect(limit).toHaveBeenCalledWith(20);
  });

  it("clamps out-of-range stages and applies nullish fallbacks when mapping", async () => {
    const limit = jest.fn().mockResolvedValue({
      data: [
        sessionRow({
          id: "low",
          stage_at_session: 0,
          dullness_level: null,
          distraction_level: null,
          obstacle_tags: null,
          reflection: null,
          technique_used: null,
          mind_wandering_episodes: null,
          mood_after: null,
        }),
        sessionRow({ id: "high", stage_at_session: 11 }),
      ],
      error: null,
    });
    const orderId = jest.fn(() => ({ limit }));
    const order = jest.fn(() => ({ order: orderId }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { select } }));

    const [low, high] = await listMeditationSessions("u1", 10);
    expect(limit).toHaveBeenCalledWith(10);
    expect(low.stageAtSession).toBe(1);
    expect(low.dullnessLevel).toBeNull();
    expect(low.distractionLevel).toBeNull();
    expect(low.obstacleTags).toEqual([]);
    expect(low.reflection).toBe("");
    expect(low.techniqueUsed).toBeNull();
    expect(high.stageAtSession).toBe(10);
  });

  it("throws when the list query errors", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
    const orderId = jest.fn(() => ({ limit }));
    const order = jest.fn(() => ({ order: orderId }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { select } }));

    await expect(listMeditationSessions("u1")).rejects.toMatchObject({ code: "42501" });
  });
});

describe("meditation repository - listMeditationMinutesSince", () => {
  function buildMinutesQuery(result: { data: unknown; error: unknown }) {
    const order = jest.fn().mockResolvedValue(result);
    const gte = jest.fn(() => ({ order }));
    const eq = jest.fn(() => ({ gte }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { select } }));
    return { select, eq, gte, order };
  }

  it("reads three columns, bounded by date rather than by row count", async () => {
    const { select, eq, gte } = buildMinutesQuery({ data: [], error: null });

    await listMeditationMinutesSince("u1", "2026-07-08T00:00:00.000Z");

    // `*` here would pull every reflection in a month for a chart that plots
    // minutes; the bound is what stops the window truncating for a heavy user.
    expect(select).toHaveBeenCalledWith("duration_minutes, completed_at, completed_offset_minutes");
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(gte).toHaveBeenCalledWith("completed_at", "2026-07-08T00:00:00.000Z");
  });

  it("dates each row by the day CAPTURED with it, not the viewer's day", async () => {
    // 15:30 UTC is 00:30 on the 16th in Tokyo. A viewer in Kolkata (+05:30, the
    // runner's zone) reads 21:00 on the 15th - the chart column must be the 16th.
    buildMinutesQuery({
      data: [
        {
          duration_minutes: 12,
          completed_at: "2026-07-15T15:30:00.000Z",
          completed_offset_minutes: TOKYO_OFFSET_MINUTES,
        },
      ],
      error: null,
    });

    await expect(listMeditationMinutesSince("u1", "2026-07-01T00:00:00.000Z")).resolves.toEqual([
      { dayKey: "2026-07-16", durationMinutes: 12 },
    ]);
  });

  it("falls back to the viewer's frame for rows with no captured offset", async () => {
    buildMinutesQuery({
      data: [
        {
          duration_minutes: 20,
          completed_at: "2026-07-15T15:30:00.000Z",
          completed_offset_minutes: null,
        },
      ],
      error: null,
    });

    const [row] = await listMeditationMinutesSince("u1", "2026-07-01T00:00:00.000Z");
    expect(row).toEqual({
      dayKey: entryDayKey("2026-07-15T15:30:00.000Z", null),
      durationMinutes: 20,
    });
  });

  it("throws when the window query errors", async () => {
    buildMinutesQuery({ data: null, error: { code: "42501" } });
    await expect(
      listMeditationMinutesSince("u1", "2026-07-01T00:00:00.000Z"),
    ).rejects.toMatchObject({ code: "42501" });
  });
});

describe("meditation repository - getMeditationSession", () => {
  it("returns null for an invalid uuid without querying", async () => {
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    expect(await getMeditationSession("u1", "not-a-uuid")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("returns null when no row matches", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { select } }));

    expect(await getMeditationSession("u1", VALID_UUID)).toBeNull();
    expect(eqId).toHaveBeenCalledWith("id", VALID_UUID);
  });

  it("maps a found row", async () => {
    const maybeSingle = jest
      .fn()
      .mockResolvedValue({ data: sessionRow({ id: VALID_UUID }), error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { select } }));

    const result = await getMeditationSession("u1", VALID_UUID);
    expect(result).toMatchObject({ id: VALID_UUID, reflection: "a note", moodAfter: 7 });
  });

  it("throws when the fetch errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "500" } });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { select } }));

    await expect(getMeditationSession("u1", VALID_UUID)).rejects.toMatchObject({ code: "500" });
  });
});

describe("meditation repository - saveMeditationSession (omitted-field arms)", () => {
  it("falls back to null/[] defaults when optional fields are omitted", async () => {
    const single = jest.fn().mockResolvedValue({
      data: sessionRow({
        stage_at_session: 2,
        mind_wandering_episodes: null,
        dullness_level: null,
        distraction_level: null,
        obstacle_tags: null,
        reflection: null,
        mood_after: null,
        technique_used: null,
      }),
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { insert } }));

    await saveMeditationSession("u1", {
      stageAtSession: 2,
      durationMinutes: 10,
    } as never);

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      stage_at_session: 2,
      duration_minutes: 10,
      mind_wandering_episodes: null,
      dullness_level: null,
      distraction_level: null,
      obstacle_tags: [],
      reflection: "",
      mood_after: null,
      technique_used: null,
    });
  });

  it("throws when the insert errors", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { insert } }));

    await expect(
      saveMeditationSession("u1", { stageAtSession: 1, durationMinutes: 5 } as never),
    ).rejects.toMatchObject({ code: "23505" });
  });
});

describe("meditation repository - getMeditationProgramState (error arm)", () => {
  it("throws when the fetch errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "500" } });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_program_state: { select } }));

    await expect(getMeditationProgramState("u1")).rejects.toMatchObject({ code: "500" });
  });
});

describe("meditation repository - upsertMeditationProgramState (all arms)", () => {
  it("sends every field when the whole patch is provided and clamps mapped stages", async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        user_id: "u1",
        current_stage: 99,
        assessed_stage: -3,
        milestones_reached: null,
        onboarding_completed_at: null,
        last_session_at: null,
        preferred_duration_minutes: null,
        preferred_time_of_day: null,
        created_at: "2026-05-10T07:00:00.000Z",
        updated_at: "2026-05-16T07:00:00.000Z",
      },
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_program_state: { upsert } }));

    const result = await upsertMeditationProgramState("u1", {
      currentStage: 6,
      assessedStage: 3,
      milestonesReached: [1, 2],
      onboardingCompletedAt: "2026-05-10T07:00:00.000Z",
      lastSessionAt: "2026-05-16T07:00:00.000Z",
      preferredDurationMinutes: 20,
      preferredTimeOfDay: "07:00",
    });

    const payload = (upsert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      current_stage: 6,
      assessed_stage: 3,
      milestones_reached: [1, 2],
      onboarding_completed_at: "2026-05-10T07:00:00.000Z",
      last_session_at: "2026-05-16T07:00:00.000Z",
      preferred_duration_minutes: 20,
      preferred_time_of_day: "07:00",
    });
    expect(payload).toHaveProperty("updated_at");
    // clampStage high/low arms via the mapped result
    expect(result.currentStage).toBe(10);
    expect(result.assessedStage).toBe(1);
    expect(result.milestonesReached).toEqual([]);
  });

  it("throws when the upsert errors", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23514" } });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_program_state: { upsert } }));

    await expect(upsertMeditationProgramState("u1", { currentStage: 5 })).rejects.toMatchObject({
      code: "23514",
    });
  });
});

describe("meditation repository - listStagePracticeNotes", () => {
  const noteRow = {
    id: "n1",
    user_id: "u1",
    stage: 4,
    note: "keep going",
    created_at: "2026-05-10T07:00:00.000Z",
    updated_at: "2026-05-16T07:00:00.000Z",
  };

  it("lists notes for a user without a stage filter", async () => {
    const order = jest.fn().mockResolvedValue({ data: [noteRow], error: null });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ stage_practice_notes: { select } }));

    const result = await listStagePracticeNotes("u1");
    expect(result[0]).toMatchObject({ id: "n1", stage: 4, note: "keep going" });
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(order).toHaveBeenCalledWith("updated_at", { ascending: false });
  });

  it("adds a stage equality filter when a stage is supplied", async () => {
    const eqStage = jest.fn().mockResolvedValue({ data: [noteRow], error: null });
    const order = jest.fn(() => ({ eq: eqStage }));
    const eqUser = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ stage_practice_notes: { select } }));

    const result = await listStagePracticeNotes("u1", 4);
    expect(eqStage).toHaveBeenCalledWith("stage", 4);
    expect(result).toHaveLength(1);
  });

  it("throws when the notes query errors", async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { code: "42P01" } });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ stage_practice_notes: { select } }));

    await expect(listStagePracticeNotes("u1")).rejects.toMatchObject({ code: "42P01" });
  });
});

describe("meditation repository - saveStagePracticeNote", () => {
  const noteRow = {
    id: "n1",
    user_id: "u1",
    stage: 4,
    note: "keep going",
    created_at: "2026-05-10T07:00:00.000Z",
    updated_at: "2026-05-16T07:00:00.000Z",
  };

  it("inserts a note and maps the returned row", async () => {
    const single = jest.fn().mockResolvedValue({ data: noteRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ stage_practice_notes: { insert } }));

    const result = await saveStagePracticeNote("u1", 4, "keep going");
    expect(insert).toHaveBeenCalledWith({ user_id: "u1", stage: 4, note: "keep going" });
    expect(result).toMatchObject({ id: "n1", stage: 4, note: "keep going" });
  });

  it("throws when the insert errors", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ stage_practice_notes: { insert } }));

    await expect(saveStagePracticeNote("u1", 4, "x")).rejects.toMatchObject({ code: "23505" });
  });
});

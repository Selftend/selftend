import {
  countMeditationSessions,
  getMeditationProgramState,
  getMeditationSession,
  listMeditationSessions,
  listStagePracticeNotes,
  saveMeditationSession,
  saveStagePracticeNote,
  upsertMeditationProgramState,
} from "@/src/features/meditation/repository";
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

describe("meditation repository - saveMeditationSession", () => {
  it("trims reflection text and writes stage-aware fields", async () => {
    const row = {
      id: "s1",
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
  it("maps rows and applies the default limit of 30", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [sessionRow()], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { select } }));

    const result = await listMeditationSessions("u1");
    expect(result[0]).toMatchObject({ id: "s1", stageAtSession: 3, durationMinutes: 15 });
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(order).toHaveBeenCalledWith("completed_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(30);
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
    const order = jest.fn(() => ({ limit }));
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
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ meditation_sessions: { select } }));

    await expect(listMeditationSessions("u1")).rejects.toMatchObject({ code: "42501" });
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

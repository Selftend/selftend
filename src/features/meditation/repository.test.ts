import {
  countMeditationSessions,
  getMeditationProgramState,
  saveMeditationSession,
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
});

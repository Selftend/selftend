import { computeMeditationInsights } from "@/src/features/meditation/insights";
import type { MeditationSession } from "@/src/features/meditation/types";

function makeSession(overrides: Partial<MeditationSession>): MeditationSession {
  return {
    id: "id",
    userId: "u1",
    stageAtSession: 1,
    durationMinutes: 15,
    completedAt: "2026-05-15T08:00:00.000Z",
    createdAt: "2026-05-15T08:00:00.000Z",
    mindWanderingEpisodes: null,
    dullnessLevel: null,
    distractionLevel: null,
    obstacleTags: [],
    reflection: "",
    moodAfter: null,
    techniqueUsed: null,
    ...overrides,
  };
}

describe("computeMeditationInsights", () => {
  it("returns zeros for an empty session list", () => {
    const result = computeMeditationInsights([]);
    expect(result).toEqual({
      totalSessions: 0,
      totalMinutes: 0,
      longestSitMinutes: 0,
      averageMoodAfter: null,
      stageDistribution: [],
      mindWanderingTrend: null,
    });
  });

  it("aggregates totals, longest sit, and mood average", () => {
    const result = computeMeditationInsights([
      makeSession({ id: "a", durationMinutes: 10, moodAfter: 6 }),
      makeSession({ id: "b", durationMinutes: 30, moodAfter: 8 }),
      makeSession({ id: "c", durationMinutes: 20, moodAfter: null }),
    ]);
    expect(result.totalSessions).toBe(3);
    expect(result.totalMinutes).toBe(60);
    expect(result.longestSitMinutes).toBe(30);
    expect(result.averageMoodAfter).toBe(7);
  });

  it("groups sessions by stage, sorted ascending", () => {
    const result = computeMeditationInsights([
      makeSession({ id: "a", stageAtSession: 4, durationMinutes: 20 }),
      makeSession({ id: "b", stageAtSession: 1, durationMinutes: 10 }),
      makeSession({ id: "c", stageAtSession: 1, durationMinutes: 15 }),
      makeSession({ id: "d", stageAtSession: 4, durationMinutes: 30 }),
    ]);
    expect(result.stageDistribution).toEqual([
      { stage: 1, sessionCount: 2, totalMinutes: 25 },
      { stage: 4, sessionCount: 2, totalMinutes: 50 },
    ]);
  });

  it("computes mind-wandering trend when both windows have enough samples", () => {
    const now = new Date("2026-05-30T12:00:00.000Z");
    const day = 24 * 60 * 60 * 1000;
    const at = (offsetDays: number) => new Date(now.getTime() - offsetDays * day).toISOString();

    const sessions = [
      // Recent window (≤14 days): catches have dropped to ~3 on average.
      makeSession({ id: "r1", completedAt: at(1), mindWanderingEpisodes: 3 }),
      makeSession({ id: "r2", completedAt: at(5), mindWanderingEpisodes: 2 }),
      makeSession({ id: "r3", completedAt: at(10), mindWanderingEpisodes: 4 }),
      // Prior window (14–28 days): catches were ~7 on average.
      makeSession({ id: "p1", completedAt: at(16), mindWanderingEpisodes: 8 }),
      makeSession({ id: "p2", completedAt: at(20), mindWanderingEpisodes: 6 }),
      makeSession({ id: "p3", completedAt: at(25), mindWanderingEpisodes: 7 }),
    ];

    const result = computeMeditationInsights(sessions, now);
    expect(result.mindWanderingTrend).toBeCloseTo(-4, 5);
  });

  it("returns null trend when either window is short of samples", () => {
    const now = new Date("2026-05-30T12:00:00.000Z");
    const day = 24 * 60 * 60 * 1000;
    const at = (offsetDays: number) => new Date(now.getTime() - offsetDays * day).toISOString();

    const result = computeMeditationInsights(
      [
        makeSession({ id: "r1", completedAt: at(1), mindWanderingEpisodes: 3 }),
        makeSession({ id: "p1", completedAt: at(20), mindWanderingEpisodes: 8 }),
      ],
      now,
    );
    expect(result.mindWanderingTrend).toBeNull();
  });
});

import { computeWindowInsights, type WindowSit } from "@/src/features/meditation/insights";

const WINDOW = ["2026-05-13", "2026-05-14", "2026-05-15"];

function sit(overrides: Partial<WindowSit>): WindowSit {
  return { dayKey: "2026-05-15", durationMinutes: 15, obstacleTags: [], ...overrides };
}

describe("computeWindowInsights", () => {
  it("returns zeros for an empty window", () => {
    expect(computeWindowInsights([], WINDOW)).toEqual({
      sessionCount: 0,
      totalMinutes: 0,
      topObstacles: [],
    });
  });

  it("counts sits and sums minutes", () => {
    const result = computeWindowInsights(
      [sit({ durationMinutes: 10 }), sit({ durationMinutes: 30, dayKey: "2026-05-14" })],
      WINDOW,
    );
    expect(result.sessionCount).toBe(2);
    expect(result.totalMinutes).toBe(40);
  });

  it("drops rows outside the window's day keys", () => {
    // The query behind the card is padded a day wider than the window (#250),
    // so a row can arrive keyed before the first drawn day - it must not count.
    const result = computeWindowInsights(
      [sit({ dayKey: "2026-05-12", durationMinutes: 60 }), sit({ durationMinutes: 10 })],
      WINDOW,
    );
    expect(result.sessionCount).toBe(1);
    expect(result.totalMinutes).toBe(10);
  });

  it("ranks obstacles by count, ties alphabetical, and caps at three", () => {
    const result = computeWindowInsights(
      [
        sit({ obstacleTags: ["restlessness", "doubt"] }),
        sit({ obstacleTags: ["restlessness", "fatigue"], dayKey: "2026-05-14" }),
        sit({ obstacleTags: ["restlessness", "boredom"], dayKey: "2026-05-13" }),
        sit({ obstacleTags: ["doubt"] }),
      ],
      WINDOW,
    );
    expect(result.topObstacles).toEqual([
      { tag: "restlessness", count: 3 },
      { tag: "doubt", count: 2 },
      // boredom and fatigue both count 1; the alphabetical tie-break keeps the
      // third row stable rather than following insertion order.
      { tag: "boredom", count: 1 },
    ]);
  });

  it("reports no obstacles when none were tagged", () => {
    expect(computeWindowInsights([sit({})], WINDOW).topObstacles).toEqual([]);
  });
});

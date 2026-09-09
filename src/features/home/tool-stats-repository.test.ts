import { parseHomeToolStats } from "@/src/features/home/tool-stats-repository";

/**
 * The RPC's rows, as PostgREST serialises them: one row per tool, `stats` a jsonb
 * object. Numbers inside jsonb arrive as JSON numbers.
 */
const ROWS = [
  { tool_key: "mood", stats: { lifetimeCount: 12, thisWeekCount: 3, avg7: 3.2666 } },
  { tool_key: "journal", stats: { entries: 24, words: 698 } },
  { tool_key: "gratitude", stats: { entries: 29, thisWeek: 3 } },
  { tool_key: "breathing", stats: { sessions: 14, minutes: 82 } },
  {
    tool_key: "grounding",
    stats: {
      sessions: 14,
      lastCompletedAt: "2026-05-27T19:40:00.000Z",
      lastCompletedOffsetMinutes: 120,
    },
  },
  { tool_key: "meditation", stats: { sits: 30, medianMinutes: 22.5 } },
  { tool_key: "sleep", stats: { avgDurationMinutes7: 431.5, avgQuality7: 3.24 } },
  { tool_key: "habits", stats: { active: 3, dueToday: 2, doneToday: 1 } },
];

describe("parseHomeToolStats", () => {
  it("keys every tool's figures by tool key, unrounded", () => {
    const stats = parseHomeToolStats(ROWS);

    // Unrounded on the way in - ADR-0001 keeps the rounding in the stat hooks, so the
    // figures cannot drift from what the per-tool screens render on a `.5` tie.
    expect(stats.mood).toEqual({ lifetimeCount: 12, thisWeekCount: 3, avg7: 3.2666 });
    expect(stats.meditation).toEqual({ sits: 30, medianMinutes: 22.5 });
    expect(stats.sleep).toEqual({ avgDurationMinutes7: 431.5, avgQuality7: 3.24 });
    expect(stats.habits).toEqual({ active: 3, dueToday: 2, doneToday: 1 });
    expect(stats.grounding.lastCompletedOffsetMinutes).toBe(120);
  });

  it("keeps a null figure null rather than reading it as zero", () => {
    // "No sits" and "a zero-minute median" are different facts, and so are "no nights"
    // and "a zero-hour night". Each card renders a different line for them.
    const stats = parseHomeToolStats(
      ROWS.map((row) =>
        row.tool_key === "meditation"
          ? { tool_key: "meditation", stats: { sits: 0, medianMinutes: null } }
          : row.tool_key === "sleep"
            ? { tool_key: "sleep", stats: { avgDurationMinutes7: null, avgQuality7: null } }
            : row,
      ),
    );

    expect(stats.meditation.medianMinutes).toBeNull();
    expect(stats.sleep.avgDurationMinutes7).toBeNull();
    expect(stats.grounding.lastCompletedAt).toBe("2026-05-27T19:40:00.000Z");
  });

  it("accepts a numeric that arrives as a string", () => {
    const stats = parseHomeToolStats(
      ROWS.map((row) =>
        row.tool_key === "journal"
          ? { tool_key: "journal", stats: { entries: "24", words: "698" } }
          : row,
      ),
    );

    expect(stats.journal).toEqual({ entries: 24, words: 698 });
  });

  it("ignores a row for a tool this client does not know", () => {
    // The database migrates before the clients do (docs/releasing.md), so a later
    // migration may return a ninth tool to a build that has never heard of it.
    const stats = parseHomeToolStats([...ROWS, { tool_key: "future-tool", stats: { x: 1 } }]);

    expect(Object.keys(stats).sort()).toEqual(
      [
        "breathing",
        "gratitude",
        "grounding",
        "habits",
        "journal",
        "meditation",
        "mood",
        "sleep",
      ].sort(),
    );
  });

  /**
   * ☠️ A missing or malformed figure THROWS rather than defaulting to zero. The query
   * then errors, `data` stays `undefined`, and the card draws nothing — which is the
   * honest state. "0 entries" over a broken payload would erase a real history on the
   * one surface that must never claim emptiness it has not verified.
   */
  it("throws rather than reading a missing tool as empty", () => {
    expect(() => parseHomeToolStats(ROWS.filter((row) => row.tool_key !== "habits"))).toThrow(
      /habits/,
    );
  });

  it("throws rather than reading a missing figure as zero", () => {
    expect(() =>
      parseHomeToolStats(
        ROWS.map((row) => (row.tool_key === "journal" ? { tool_key: "journal", stats: {} } : row)),
      ),
    ).toThrow(/entries/);
  });
});

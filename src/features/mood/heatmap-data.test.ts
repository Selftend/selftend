import { buildMoodHeatmapWeeks } from "@/src/features/mood/heatmap-data";

// Fixed "today": Saturday 2026-07-25 (a known date, independent of the run clock).
const NOW = new Date(2026, 6, 25, 15, 0, 0);

describe("buildMoodHeatmapWeeks", () => {
  it("returns no weeks without any points", () => {
    expect(buildMoodHeatmapWeeks(undefined, "en", NOW)).toEqual([]);
    expect(buildMoodHeatmapWeeks([], "en", NOW)).toEqual([]);
  });

  it("lays out Monday-start week columns from the first entry's week through today", () => {
    const weeks = buildMoodHeatmapWeeks(
      [
        { dayKey: "2026-07-01", moodScore: 4 },
        { dayKey: "2026-07-25", moodScore: 3 },
      ],
      "en",
      NOW,
    );

    // 2026-07-01 is a Wednesday → weeks start Mon 2026-06-29; today's week is Mon 2026-07-20.
    expect(weeks).toHaveLength(4);
    expect(weeks[0].days[0]).toBeNull(); // Mon 6/29 predates the first entry
    expect(weeks[0].days[1]).toBeNull(); // Tue 6/30
    expect(weeks[0].days[2]).toEqual({ dateKey: "2026-07-01", score: 4 });
    expect(weeks[0].days[3]).toEqual({ dateKey: "2026-07-02", score: null }); // in-range, no entry
    // Last column: Sat 7/25 is today (index 5); Sunday 7/26 is the future.
    expect(weeks[3].days[5]).toEqual({ dateKey: "2026-07-25", score: 3 });
    expect(weeks[3].days[6]).toBeNull();
    // Every column carries exactly 7 slots.
    expect(weeks.every((w) => w.days.length === 7)).toBe(true);
  });

  it("averages same-day points and rounds to the nearest 1-5 score", () => {
    const weeks = buildMoodHeatmapWeeks(
      [
        { dayKey: "2026-07-20", moodScore: 4 },
        { dayKey: "2026-07-20", moodScore: 5 },
        { dayKey: "2026-07-21", moodScore: 2 },
      ],
      "en",
      NOW,
    );

    expect(weeks).toHaveLength(1);
    expect(weeks[0].days[0]).toEqual({ dateKey: "2026-07-20", score: 5 }); // 4.5 → 5
    expect(weeks[0].days[1]).toEqual({ dateKey: "2026-07-21", score: 2 });
  });

  it("labels the first week and every week containing the 1st of a month", () => {
    const weeks = buildMoodHeatmapWeeks([{ dayKey: "2026-06-10", moodScore: 3 }], "en", NOW);

    // Weeks: Jun 8, 15, 22, 29 (contains Jul 1), Jul 6, 13, 20.
    expect(weeks).toHaveLength(7);
    expect(weeks[0].monthLabel).toBe("Jun");
    expect(weeks[1].monthLabel).toBeNull();
    expect(weeks[2].monthLabel).toBeNull();
    expect(weeks[3].monthLabel).toBe("Jul");
    expect(weeks[4].monthLabel).toBeNull();
  });

  // Log at 08:00 in Tokyo (UTC+9), fly to Los Angeles: it is still the previous
  // day where you land, so the entry's captured day sits *ahead* of the viewer's
  // today. Clamping the grid at today would delete it from the heatmap entirely.
  it("extends past today to cover an entry captured east of the viewer", () => {
    const weeks = buildMoodHeatmapWeeks(
      [
        { dayKey: "2026-07-25", moodScore: 3 },
        { dayKey: "2026-07-26", moodScore: 5 },
      ],
      "en",
      NOW,
    );

    const lastWeek = weeks[weeks.length - 1];
    expect(lastWeek.days[5]).toEqual({ dateKey: "2026-07-25", score: 3 });
    expect(lastWeek.days[6]).toEqual({ dateKey: "2026-07-26", score: 5 });
  });
});

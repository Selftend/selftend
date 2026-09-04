import { buildRecordBand } from "@/src/features/progress/record-band";

const NOW = new Date("2026-09-04T12:00:00");

describe("buildRecordBand", () => {
  it("is empty when there is no record at all", () => {
    expect(buildRecordBand([], "en", NOW).state).toBe("empty");
  });

  /**
   * ☠️ **`undefined` IS NOT `[]`, and this test exists because they were the
   * same for one revision.** `undefined` is the query still in flight; `[]` is a
   * person with no record. Collapsing them made the card assert
   * "Days you record anything will appear here." on first paint to someone with
   * years of history - absence stated before anything is known, on the screen
   * whose whole job is to state the record truthfully.
   */
  it("is loading, not empty, while the query is still in flight", () => {
    expect(buildRecordBand(undefined, "en", NOW).state).toBe("loading");
  });

  /**
   * ☠️ **The gate is SPAN, not COUNT** - the AC's own example, and the reason
   * the anchor exists. The axis is anchored at the first record, so a person
   * whose whole record is today would get a zero-width band: an axis from today
   * to today, with one mark filling it. That is not a timeline, it is a dot
   * claiming to be one.
   */
  it("gates on span rather than count: two records today is a single day", () => {
    const band = buildRecordBand(["2026-09-04", "2026-09-04"], "en", NOW);

    expect(band.state).toBe("single-day");
  });

  it("gates on span rather than count: one record three days ago draws the band", () => {
    const band = buildRecordBand(["2026-09-01"], "en", NOW);

    expect(band.state).toBe("marks");
  });

  /** The boundary the table draws: "first record >= 2 days back". */
  it.each([
    ["2026-09-04", "single-day"],
    ["2026-09-03", "single-day"],
    ["2026-09-02", "marks"],
  ])("a first record on %s is %s", (firstKey, state) => {
    expect(buildRecordBand([firstKey], "en", NOW).state).toBe(state);
  });

  it("anchors at the first record and runs to today, one offset per day", () => {
    const band = buildRecordBand(["2026-09-01", "2026-09-03"], "en", NOW);

    expect(band.firstKey).toBe("2026-09-01");
    expect(band.lastKey).toBe("2026-09-04");
    // 1st, 2nd, 3rd, 4th.
    expect(band.totalDays).toBe(4);
    // Offsets from the anchor, so the 1st is 0 and the 3rd is 2.
    expect(band.marks).toEqual([0, 2]);
  });

  /**
   * ☠️ A day with six records and a day with one are the SAME mark. The unit is
   * the day; the screen states that the record exists and nothing else. A
   * builder that emitted one mark per record would be drawing a count.
   */
  it("emits one mark per DAY, however many records that day holds", () => {
    const band = buildRecordBand(
      ["2026-09-01", "2026-09-01", "2026-09-01", "2026-09-03"],
      "en",
      NOW,
    );

    expect(band.marks).toEqual([0, 2]);
  });

  it("takes days in any order and does not care how they arrive", () => {
    const band = buildRecordBand(["2026-09-03", "2026-09-01"], "en", NOW);

    expect(band.firstKey).toBe("2026-09-01");
    expect(band.marks).toEqual([0, 2]);
  });

  /**
   * ☠️ Adopted from `buildMoodHeatmapWeeks` (#250): fly east-to-west and you
   * land holding an entry dated "tomorrow". A hard clamp at today would drop
   * that day off the axis entirely - erasing a record on the one screen whose
   * job is to state that the record exists.
   */
  it("ends at a later day the user already holds a record on, not at today", () => {
    const band = buildRecordBand(["2026-09-01", "2026-09-05"], "en", NOW);

    expect(band.lastKey).toBe("2026-09-05");
    expect(band.totalDays).toBe(5);
    expect(band.marks).toEqual([0, 4]);
  });

  /**
   * Sparse month ticks: the leftmost names month AND year, the rest name the
   * month alone. ☠️ Ticks are NOT a lattice - they are the only thing drawn
   * besides the marks, and there is deliberately no tick for a day, a week, or
   * a year boundary.
   */
  it("labels the leftmost tick with month and year, and later ticks with the month alone", () => {
    const band = buildRecordBand(["2026-07-15", "2026-09-03"], "en", NOW);

    expect(band.months[0]).toEqual({ offset: 0, label: "Jul 2026" });
    expect(band.months.slice(1)).toEqual([
      // 1 August is 17 days after 15 July; 1 September is 48.
      { offset: 17, label: "Aug" },
      { offset: 48, label: "Sep" },
    ]);
  });

  it("draws no month tick beyond the anchor when the whole band sits in one month", () => {
    const band = buildRecordBand(["2026-09-01"], "en", NOW);

    expect(band.months).toEqual([{ offset: 0, label: "Sep 2026" }]);
  });

  it("labels the months in the app's language, not the device's", () => {
    const band = buildRecordBand(["2026-07-15", "2026-09-03"], "bg", NOW);

    // Whatever bg renders, it is not the English form - the point is that `lang`
    // reaches the formatter at all.
    expect(band.months[0].label).not.toBe("Jul 2026");
    expect(band.months[0].label).toContain("2026");
  });

  /**
   * The extent the accessibility summary reads. It names where the record
   * STARTS and nothing else about it - ☠️ an a11y-only count was refused on
   * #1906: handing AT users the figure that was cut for being harmful is worse
   * than the gap.
   */
  it("carries the extent for the summary, and no count of any kind", () => {
    const band = buildRecordBand(["2026-07-15", "2026-07-16", "2026-09-03"], "en", NOW);

    expect(band.firstMonthLabel).toBe("July 2026");
    expect(band).not.toHaveProperty("count");
    expect(band).not.toHaveProperty("total");
  });
});

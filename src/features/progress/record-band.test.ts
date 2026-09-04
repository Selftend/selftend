import {
  MIN_TICK_GAP_DAYS,
  buildRecordBand,
  type RecordBand,
} from "@/src/features/progress/record-band";

const NOW = new Date("2026-09-04T12:00:00");

function band(dayKeys: string[] | undefined, now = NOW, lang = "en") {
  return buildRecordBand(dayKeys, lang, now);
}

function expectBand(result: RecordBand) {
  if (result.kind !== "band") throw new Error(`expected a band, got "${result.kind}"`);
  return result;
}

describe("buildRecordBand states", () => {
  /**
   * The query has not answered yet. Rendering the empty line here would state
   * "days you record anything will appear here" at a person who has a year of
   * records - a false absence on the one screen whose job is to state the
   * record truthfully, arriving from the loading state instead of the cache.
   */
  it("says nothing at all until the days have arrived", () => {
    expect(band(undefined).kind).toBe("pending");
  });

  it("is empty only when there is no record anywhere", () => {
    expect(band([]).kind).toBe("empty");
  });

  /**
   * ☠️ The gate is SPAN, not count. #1836 anchors the axis at the first record,
   * so a record that is only hours old gives a zero-width axis with nothing to
   * draw on it - and "nothing here yet" would be a lie about the person's own
   * record, which is why the single-day state has a string of its own.
   *
   * These two cases are the mutation guard: the case with FEWER days draws the
   * band and the case with MORE days does not, so a gate that counted marks
   * would have to invert to pass both.
   */
  it("draws the band from one record two days back", () => {
    expect(band(["2026-09-02"]).kind).toBe("band");
  });

  it("stays a single day for two days of records ending today", () => {
    expect(band(["2026-09-03", "2026-09-04"]).kind).toBe("singleDay");
  });

  it("stays a single day when the only record is today", () => {
    expect(band(["2026-09-04"]).kind).toBe("singleDay");
  });
});

describe("buildRecordBand axis", () => {
  it("anchors at the first record and runs to today", () => {
    const result = expectBand(band(["2026-09-01", "2026-09-03"]));

    // 1st, 2nd, 3rd, 4th - the axis ends at today even though nothing was
    // recorded on it, because the axis is a span and not a list of marks.
    expect(result.totalDays).toBe(4);
    expect(result.marks).toEqual([
      { key: "2026-09-01", index: 0 },
      { key: "2026-09-03", index: 2 },
    ]);
  });

  /**
   * #250: fly east-to-west and you land holding an entry keyed "tomorrow"
   * relative to where you are now. `dayRangeEndKey` is the shared rule for
   * this - clamping at today would drop that entry off the right-hand end.
   */
  it("runs past today to a day the person already holds an entry on", () => {
    const result = expectBand(band(["2026-09-01", "2026-09-05"]));

    expect(result.totalDays).toBe(5);
    expect(result.marks.at(-1)).toEqual({ key: "2026-09-05", index: 4 });
  });

  /**
   * ☠️ A day with six records and a day with one look identical, and the band
   * holds no cell for a day with none. The empty day is not drawn at all - the
   * lattice is the chain, not the calendar (#1834), so absence is never a mark.
   */
  it("carries one mark per recorded day and nothing for the rest", () => {
    const result = expectBand(band(["2026-08-30", "2026-09-04"]));

    expect(result.marks).toHaveLength(2);
    expect(result.totalDays).toBe(6);
  });
});

describe("buildRecordBand ticks", () => {
  it("names the month and the year at the left edge", () => {
    const result = expectBand(band(["2026-03-12", "2026-09-04"]));

    expect(result.ticks[0]).toEqual({ key: "2026-03-12", index: 0, label: "Mar 2026" });
  });

  it("marks each month start after that, month only", () => {
    const result = expectBand(band(["2026-03-12", "2026-09-04"]));

    expect(result.ticks.map((tick) => tick.label)).toEqual([
      "Mar 2026",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
    ]);
    // April opens 20 days after 12 March.
    expect(result.ticks[1]).toEqual({ key: "2026-04-01", index: 20, label: "Apr" });
  });

  /**
   * Sparse, in the literal sense: a month start that would land on top of the
   * previous label is skipped rather than drawn over it. There is no lattice to
   * hang a squeezed label on, so a dropped tick costs nothing.
   */
  it("skips a month start too close to the last label to fit", () => {
    // The record opens on 28 March, so 1 April is 4 days along - well inside
    // the gap a label needs.
    const result = expectBand(band(["2026-03-28", "2026-09-04"]));

    expect(result.ticks[0].label).toBe("Mar 2026");
    expect(result.ticks[1]).toEqual({ key: "2026-05-01", index: 34, label: "May" });
    expect(result.ticks.every((tick) => tick.key !== "2026-04-01")).toBe(true);
  });

  it("never places two labels closer than the gap a label needs", () => {
    const result = expectBand(band(["2026-01-30", "2026-09-04"]));

    for (let i = 1; i < result.ticks.length; i++) {
      expect(result.ticks[i].index - result.ticks[i - 1].index).toBeGreaterThanOrEqual(
        MIN_TICK_GAP_DAYS,
      );
    }
  });

  it("brings the year back when the axis crosses into a new one", () => {
    const result = expectBand(band(["2025-11-08"], new Date("2026-02-04T12:00:00")));

    expect(result.ticks.map((tick) => tick.label)).toEqual(["Nov 2025", "Dec", "Jan 2026", "Feb"]);
  });

  /**
   * ☠️ **`month: "short"` is a NUMBER in Bulgarian.** CLDR abbreviates март to
   * "03", and asking for the short month and the year together collapses the
   * pair to "03.2026 г." - digits, on the one screen that computes nothing,
   * where they would read as a figure rather than a date. The en assertions
   * above cannot see this: en has a real abbreviation.
   */
  it("never abbreviates a month into digits", () => {
    const result = expectBand(band(["2026-03-12", "2026-09-04"], NOW, "bg"));

    expect(result.ticks[0].label).toBe("март 2026 г.");
    expect(result.ticks.some((tick) => /[0-9]/.test(tick.label.replace(/2026 г\.$/, "")))).toBe(
      false,
    );
  });
});

describe("buildRecordBand extent", () => {
  /**
   * ☠️ The accessible summary is EXTENT ONLY. An a11y-only count was refused:
   * handing a screen-reader user the figure that was cut for being harmful is
   * worse than the gap it leaves. The builder returns two dates and nothing a
   * label could be built from that the eye is not also given.
   */
  it("returns the two ends of the axis, spelled out", () => {
    const result = expectBand(band(["2026-03-12", "2026-09-04"]));

    expect(result.extent).toEqual({ from: "March 12, 2026", to: "September 4, 2026" });
  });

  it("spells the extent in the reader's language", () => {
    const result = expectBand(band(["2026-03-12", "2026-09-04"], NOW, "bg"));

    expect(result.extent.from).toContain("март");
    expect(result.extent.to).toContain("септември");
  });
});

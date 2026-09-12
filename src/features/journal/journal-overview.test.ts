import {
  formatJournalMonth,
  formatJournalRecentWhen,
  formatJournalWritingBucket,
  formatJournalWritingRange,
  groupJournalHistoryEntries,
  groupRecentJournalEntries,
  journalWritingBarLabel,
  journalWritingReservationBuckets,
  journalWritingUnit,
} from "@/src/features/journal/journal-overview";
import type { JournalEntry } from "@/src/features/journal/types";

const THURSDAY = new Date("2026-05-28T12:00:00.000Z");

function entry(dayKey: string, time = "08:00:00", id = dayKey): JournalEntry {
  const occurredAt = `${dayKey}T${time}Z`;
  return {
    id,
    userId: "user-1",
    title: id,
    body: "A few words.",
    occurredAt,
    occurredOffsetMinutes: 0,
    dayKey,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

describe("groupRecentJournalEntries", () => {
  it("groups the five newest entries and leaves older rows for the all-entries screen", () => {
    const sections = groupRecentJournalEntries(
      [
        entry("2026-05-28"),
        entry("2026-05-27"),
        entry("2026-05-25"),
        entry("2026-05-20"),
        entry("2026-04-30"),
        entry("2026-03-01", "08:00:00", "sixth"),
      ],
      THURSDAY,
    );

    expect(sections.map(({ key, data }) => [key, data.map((item) => item.id)])).toEqual([
      ["today", ["2026-05-28"]],
      ["yesterday", ["2026-05-27"]],
      ["thisWeek", ["2026-05-25"]],
      ["lastWeek", ["2026-05-20"]],
      ["month:2026-04", ["2026-04-30"]],
    ]);
  });

  it("keeps every loaded row on the all-entries screen", () => {
    const sections = groupJournalHistoryEntries(
      [
        entry("2026-05-28"),
        entry("2026-05-27"),
        entry("2026-04-30"),
        entry("2026-03-01", "08:00:00", "fourth"),
      ],
      THURSDAY,
    );

    expect(sections.flatMap((section) => section.data.map((item) => item.id))).toEqual([
      "2026-05-28",
      "2026-05-27",
      "2026-04-30",
      "fourth",
    ]);
  });

  it("anchors on a captured future day after travel", () => {
    expect(
      groupRecentJournalEntries([entry("2026-05-29"), entry("2026-05-28")], THURSDAY).map(
        (section) => section.key,
      ),
    ).toEqual(["today", "yesterday"]);
  });
});

describe("journal overview formatting", () => {
  it("disambiguates rows inside single- and multi-day groups", () => {
    const item = entry("2026-05-25", "16:50:00");
    expect(formatJournalRecentWhen(item, "today", "en")).toBe("4:50 PM");
    expect(formatJournalRecentWhen(item, "thisWeek", "en")).toBe("Mon 4:50 PM");
  });

  it("reads timestamps in the entry's captured offset", () => {
    const tokyo = { ...entry("2026-05-25", "14:30:00"), occurredOffsetMinutes: 540 };
    expect(formatJournalRecentWhen(tokyo, "today", "en")).toBe("11:30 PM");
  });

  it("localises old month groups and the chart range", () => {
    expect(formatJournalMonth("2026-04", "en")).toBe("April 2026");
    expect(
      formatJournalWritingRange(
        [
          {
            startDayKey: "2026-05-15",
            endDayKey: "2026-05-15",
            wordCount: 0,
            unit: "day",
            rangeStartDayKey: "2026-05-15",
            rangeEndDayKey: "2026-05-28",
          },
        ],
        "en",
      ),
    ).toBe("May 15 – May 28");
  });

  it("labels adaptive buckets without crowding every bar", () => {
    const weekly = {
      startDayKey: "2026-03-01",
      endDayKey: "2026-03-07",
      wordCount: 42,
      unit: "week" as const,
      rangeStartDayKey: "2026-03-01",
      rangeEndDayKey: "2026-05-29",
    };

    expect(formatJournalWritingBucket(weekly, "en")).toBe("Mar 1 – Mar 7");
    expect(journalWritingBarLabel(weekly, 0, 13, "en")).toBeUndefined();
    expect(journalWritingBarLabel(weekly, 1, 13, "en")).toBeUndefined();
    expect(
      formatJournalWritingBucket(
        {
          ...weekly,
          startDayKey: "2024-01-01",
          endDayKey: "2024-12-31",
          unit: "year",
        },
        "en",
      ),
    ).toBe("2024");
  });
});

/**
 * The shape the chart will take, before the read that fills it returns - the stick
 * `JournalWritingChartReservation` holds the section's space with (ADR-0009, edge 4).
 *
 * What the assertions are about is **height**, expressed as the two things that can
 * change it. A bar's value cannot: the bar area is a fixed box whatever is drawn inside
 * it. The unit can, because it picks the caption line under the bars. And the count can,
 * because seven buckets carry day labels under the columns and thirty do not - so a
 * reservation that guessed thirty for the 7d range would be a label line short, which is
 * the "silhouette that quietly dropped a glyph" this technique exists to rule out.
 */
describe("journalWritingReservationBuckets", () => {
  /**
   * ☠️ The counts and units mirror `journal_writing_buckets`'s own bucketing
   * (`20260810000001_journal_writing_buckets.sql`): 7 and 30 daily, 90 as thirteen
   * seven-day buckets, All time as calendar months. Nothing in jest can read the SQL, so
   * this is the record of what was mirrored, and the place to correct if it moves.
   */
  it("mirrors the RPC's bucketing for every range", () => {
    expect(journalWritingReservationBuckets(7, THURSDAY)).toHaveLength(7);
    expect(journalWritingReservationBuckets(30, THURSDAY)).toHaveLength(30);
    expect(journalWritingReservationBuckets(90, THURSDAY)).toHaveLength(13);

    expect(journalWritingUnit(journalWritingReservationBuckets(7, THURSDAY))).toBe("day");
    expect(journalWritingUnit(journalWritingReservationBuckets(30, THURSDAY))).toBe("day");
    expect(journalWritingUnit(journalWritingReservationBuckets(90, THURSDAY))).toBe("week");
    expect(journalWritingUnit(journalWritingReservationBuckets("all", THURSDAY))).toBe("month");
  });

  /**
   * The height that is easiest to get wrong: at seven buckets each column carries a day
   * number under the bar, and past seven none of them does. The reservation resolves its
   * labels through the chart's own label function rather than deciding for itself, so the
   * two cannot disagree about whether that line is there.
   */
  it("carries the label line at seven buckets and not at thirty", () => {
    const week = journalWritingReservationBuckets(7, THURSDAY);
    expect(
      week.map((bucket, index) => journalWritingBarLabel(bucket, index, week.length, "en")),
    ).toEqual(["22", "23", "24", "25", "26", "27", "28"]);

    const month = journalWritingReservationBuckets(30, THURSDAY);
    expect(
      month.every(
        (bucket, index) => journalWritingBarLabel(bucket, index, month.length, "en") === undefined,
      ),
    ).toBe(true);
  });

  // A day per bar, ending today, so the stick's window is the window the read will cover.
  it("ends its window on today, a bar per day", () => {
    const week = journalWritingReservationBuckets(7, THURSDAY);

    expect(week[0]!.startDayKey).toBe("2026-05-22");
    expect(week[6]!.startDayKey).toBe("2026-05-28");
    expect(week[6]!.endDayKey).toBe("2026-05-28");
    expect(week[0]!.rangeEndDayKey).toBe("2026-05-28");
  });

  // The last seven-day bucket runs past today, and the RPC clips it rather than drawing a
  // week the range does not cover.
  it("clips the final weekly bucket to the end of the window", () => {
    const quarter = journalWritingReservationBuckets(90, THURSDAY);

    expect(quarter[0]!.startDayKey).toBe("2026-02-28");
    expect(quarter[12]!.startDayKey).toBe("2026-05-23");
    expect(quarter[12]!.endDayKey).toBe("2026-05-28");
  });

  /**
   * How far back All time reaches is the one thing about the chart's shape that cannot be
   * known before the read - and the one thing that does not change the height, since past
   * seven buckets no column carries a label. A year of months, ending in this one.
   */
  it("stands in for All time with a year of months, the last clipped to today", () => {
    const all = journalWritingReservationBuckets("all", THURSDAY);

    expect(all).toHaveLength(12);
    expect(all[0]!.startDayKey).toBe("2025-06-01");
    expect(all[11]!.startDayKey).toBe("2026-05-01");
    expect(all[11]!.endDayKey).toBe("2026-05-28");
    expect(all[10]!.endDayKey).toBe("2026-04-30");
  });

  // Clause 1 reaches the stick's own numbers: a bar cannot be given a word count nobody
  // has read. Zero is what a bar area of fixed height draws either way.
  it("claims no word counts", () => {
    expect(
      journalWritingReservationBuckets(30, THURSDAY).every((bucket) => bucket.wordCount === 0),
    ).toBe(true);
  });
});

import {
  formatJournalMonth,
  formatJournalRecentWhen,
  formatJournalWritingBucket,
  formatJournalWritingRange,
  groupJournalHistoryEntries,
  groupRecentJournalEntries,
  journalWritingBarLabel,
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

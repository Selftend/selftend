import {
  formatHistoryMonth,
  formatHistoryWhen,
  groupHistorySections,
} from "@/src/lib/history-groups";
import type { MoodLog } from "@/src/features/mood/types";

// 2026-08-08 is a Saturday, so the Monday-start calendar week runs 08-03..08-09
// and the previous one runs 07-27..08-02. Every fixture is anchored at an
// explicit UTC instant with a captured offset of 0, so the assertions below do
// not move with the machine's timezone.
const SATURDAY = new Date("2026-08-08T12:00:00");

function log(dayKey: string, timeUtc = "12:00:00", overrides: Partial<MoodLog> = {}): MoodLog {
  const loggedAt = `${dayKey}T${timeUtc}Z`;
  return {
    id: `${dayKey}-${timeUtc}`,
    userId: "user-1",
    moodScore: 3,
    emotions: [],
    notes: "",
    linkedStrategy: null,
    loggedAt,
    loggedOffsetMinutes: 0,
    dayKey,
    createdAt: loggedAt,
    situation: "",
    thoughts: "",
    behaviours: "",
    bodilySensations: "",
    ...overrides,
  };
}

function shape(logs: MoodLog[], now = SATURDAY) {
  return groupHistorySections(logs, now).map((section) => ({
    key: section.key,
    kind: section.kind,
    days: section.data.map((entry) => entry.dayKey),
  }));
}

describe("groupHistorySections", () => {
  it("returns nothing for an empty history", () => {
    expect(groupHistorySections([])).toEqual([]);
    expect(groupHistorySections(undefined)).toEqual([]);
  });

  it("orders Today, Yesterday, this week, last week, then one section per month", () => {
    const logs = [
      log("2026-08-08"),
      log("2026-08-07"),
      log("2026-08-05"),
      log("2026-08-03"),
      log("2026-08-02"),
      log("2026-07-27"),
      log("2026-07-26"),
      log("2026-07-01"),
      log("2026-06-15"),
    ];

    expect(shape(logs)).toEqual([
      { key: "today", kind: "today", days: ["2026-08-08"] },
      { key: "yesterday", kind: "yesterday", days: ["2026-08-07"] },
      { key: "thisWeek", kind: "thisWeek", days: ["2026-08-05", "2026-08-03"] },
      { key: "lastWeek", kind: "lastWeek", days: ["2026-08-02", "2026-07-27"] },
      {
        key: "month:2026-07",
        kind: "month",
        days: ["2026-07-26", "2026-07-01"],
      },
      { key: "month:2026-06", kind: "month", days: ["2026-06-15"] },
    ]);
  });

  it("skips sections with no entries rather than rendering empty headings", () => {
    expect(shape([log("2026-08-08"), log("2026-06-15")])).toEqual([
      { key: "today", kind: "today", days: ["2026-08-08"] },
      { key: "month:2026-06", kind: "month", days: ["2026-06-15"] },
    ]);
  });

  it("keeps Yesterday out of Last week on a Monday", () => {
    // Monday 2026-08-10: the calendar week starts today, so Sunday sits in the
    // PREVIOUS week - but it is still yesterday, and reads better that way.
    const monday = new Date("2026-08-10T12:00:00");

    expect(shape([log("2026-08-10"), log("2026-08-09"), log("2026-08-08")], monday)).toEqual([
      { key: "today", kind: "today", days: ["2026-08-10"] },
      { key: "yesterday", kind: "yesterday", days: ["2026-08-09"] },
      { key: "lastWeek", kind: "lastWeek", days: ["2026-08-08"] },
    ]);
  });

  it("anchors on the newest captured day, so a 'tomorrow' entry files under Today", () => {
    // Fly east-to-west and you land holding an entry keyed a day ahead of where
    // you are. Clamping at the viewer's day would file the user's most recent
    // check-in under a month heading (#250).
    expect(shape([log("2026-08-09"), log("2026-08-08")])).toEqual([
      { key: "today", kind: "today", days: ["2026-08-09"] },
      { key: "yesterday", kind: "yesterday", days: ["2026-08-08"] },
    ]);
  });

  it("carries no averages - a paged group average would only cover loaded rows (#705)", () => {
    // Anchored like every other case: against the real clock these fixtures drift
    // into a month section (gaining monthKey) once the calendar week rolls past
    // them - which is exactly what happened on 2026-08-17.
    const [section] = groupHistorySections(
      [log("2026-08-08"), log("2026-08-08", "18:00:00")],
      SATURDAY,
    );

    expect(Object.keys(section).sort()).toEqual(["data", "key", "kind"]);
  });
});

describe("formatHistoryWhen", () => {
  const entry = log("2026-08-08", "16:50:00");

  it("shows the time alone in single-day sections", () => {
    expect(formatHistoryWhen(entry, "today", "en")).toBe("4:50 PM");
    expect(formatHistoryWhen(entry, "yesterday", "en")).toBe("4:50 PM");
  });

  it("adds the weekday in multi-day sections", () => {
    expect(formatHistoryWhen(entry, "thisWeek", "en")).toBe("Sat 4:50 PM");
    expect(formatHistoryWhen(entry, "lastWeek", "en")).toBe("Sat 4:50 PM");
  });

  it("shows the date in month sections", () => {
    expect(formatHistoryWhen(log("2026-07-27", "10:00:00"), "month", "en")).toBe("Jul 27");
  });

  it("reads in the frame the entry was captured in, not the viewer's", () => {
    // 23:30 in Tokyo (+540), which is 14:30Z. Labelling it viewer-locally would
    // contradict the civil day it is filed under (#250).
    const tokyo = log("2026-08-08", "14:30:00", { loggedOffsetMinutes: 540 });

    expect(formatHistoryWhen(tokyo, "today", "en")).toBe("11:30 PM");
  });
});

describe("formatHistoryMonth", () => {
  it("always names the year - a bare month is ambiguous across a multi-year scroll", () => {
    expect(formatHistoryMonth("2026-07", "en")).toBe("July 2026");
    expect(formatHistoryMonth("2025-12", "en")).toBe("December 2025");
  });

  it("localises", () => {
    expect(formatHistoryMonth("2026-07", "bg")).toBe("юли 2026 г.");
  });
});

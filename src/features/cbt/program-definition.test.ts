import { CBT_PROGRAM, type ProgramSignalData } from "@/src/features/cbt/program-definition";
import type { MoodLog } from "@/src/features/mood/types";
import { toLocalDateKey } from "@/src/utils/date";

describe("CBT_PROGRAM", () => {
  it("has 5 ordered workbook-arc phases", () => {
    expect(CBT_PROGRAM).toHaveLength(5);
    expect(CBT_PROGRAM.map((p) => p.key)).toEqual([
      "assessment",
      "formulation",
      "thinking",
      "behavioural",
      "resilience",
    ]);
  });

  it("gives every phase a title, subtitle, and description i18n key", () => {
    for (const phase of CBT_PROGRAM) {
      expect(phase.themeLabelKey).toBe(`program.weeks.${phase.key}.title`);
      expect(phase.themeSubKey).toBe(`program.weeks.${phase.key}.sub`);
      expect(phase.themeDescKey).toBe(`program.weeks.${phase.key}.description`);
    }
  });

  it("gives every phase at least one milestone", () => {
    for (const phase of CBT_PROGRAM) {
      expect(phase.milestones.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("gives assessment, thinking, behavioural, and resilience a dailyPractice; formulation has none", () => {
    const withPractice = CBT_PROGRAM.filter((p) => p.dailyPractice !== undefined).map((p) => p.key);
    const withoutPractice = CBT_PROGRAM.filter((p) => p.dailyPractice === undefined).map(
      (p) => p.key,
    );
    expect(withPractice).toEqual(["assessment", "thinking", "behavioural", "resilience"]);
    expect(withoutPractice).toEqual(["formulation"]);
  });

  it("has all unique task keys across milestones and dailyPractice", () => {
    const keys = new Set<string>();
    for (const phase of CBT_PROGRAM) {
      for (const task of phase.milestones) {
        expect(keys.has(task.key)).toBe(false);
        keys.add(task.key);
      }
      if (phase.dailyPractice) {
        expect(keys.has(phase.dailyPractice.key)).toBe(false);
        keys.add(phase.dailyPractice.key);
      }
    }
  });

  it("gives every task a label key, a route, and a signal", () => {
    for (const phase of CBT_PROGRAM) {
      const tasks = [...phase.milestones, ...(phase.dailyPractice ? [phase.dailyPractice] : [])];
      expect(tasks.length).toBeGreaterThan(0);
      for (const task of tasks) {
        expect(typeof task.labelKey).toBe("string");
        expect(task.route).toBeTruthy();
        expect(typeof task.signal).toBe("function");
      }
    }
  });
});

describe("dailyNoticing buckets by the captured civil day", () => {
  const dailyNoticing = CBT_PROGRAM[0].dailyPractice!;

  const moodLog = (overrides: Partial<MoodLog>): MoodLog => ({
    id: "m1",
    userId: "user-1",
    moodScore: 3,
    emotions: [],
    notes: "",
    linkedStrategy: null,
    loggedAt: "2026-05-11T16:00:00.000Z",
    loggedOffsetMinutes: null,
    dayKey: "2026-05-11",
    createdAt: "2026-05-11T16:00:00.000Z",
    situation: "Work stress",
    thoughts: "",
    behaviours: "",
    bodilySensations: "",
    ...overrides,
  });

  const signal = (moodLogs: MoodLog[], selectedDate: string) =>
    dailyNoticing.signal({ selectedDate, moodLogs, since: 0 } as ProgramSignalData).current;

  // Logged at 01:00 on the 12th in Tokyo (UTC+9), i.e. 16:00Z on the 11th. The
  // test runner sits at UTC+5:30, so converting that instant through the VIEWER's
  // zone lands on the 11th - a different day from the one the entry was logged on.
  const LOGGED_AT = "2026-05-11T16:00:00.000Z";
  const CAPTURED_DAY = "2026-05-12";
  const VIEWER_DAY = "2026-05-11";

  it("the two days genuinely differ, or the rest of this suite proves nothing", () => {
    expect(toLocalDateKey(LOGGED_AT)).toBe(VIEWER_DAY);
    expect(toLocalDateKey(LOGGED_AT)).not.toBe(CAPTURED_DAY);
  });

  it("counts the log on the day it was logged, not the day the viewer is standing in", () => {
    const logs = [moodLog({ loggedAt: LOGGED_AT, loggedOffsetMinutes: 540, dayKey: CAPTURED_DAY })];
    expect(signal(logs, CAPTURED_DAY)).toBe(1);
    expect(signal(logs, VIEWER_DAY)).toBe(0);
  });

  it("still requires a noticing-grade entry, not merely a mood score", () => {
    const blank = moodLog({
      loggedAt: LOGGED_AT,
      loggedOffsetMinutes: 540,
      dayKey: CAPTURED_DAY,
      situation: "  ",
    });
    expect(signal([blank], CAPTURED_DAY)).toBe(0);
  });

  it("falls back to the viewer's day when no offset was captured", () => {
    // The repository resolves dayKey through entryDayKey, which for a null offset
    // is the viewer's local day - exactly where such rows have always rendered.
    const legacy = moodLog({
      loggedAt: LOGGED_AT,
      loggedOffsetMinutes: null,
      dayKey: toLocalDateKey(LOGGED_AT),
    });
    expect(signal([legacy], VIEWER_DAY)).toBe(1);
    expect(signal([legacy], CAPTURED_DAY)).toBe(0);
  });
});

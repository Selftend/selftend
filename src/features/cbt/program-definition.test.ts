import type { ActivityLog } from "@/src/features/activities/types";
import { CBT_PROGRAM, type ProgramSignalData } from "@/src/features/cbt/program-definition";
import type { ThoughtRecord } from "@/src/features/cbt/types";
import type { MeditationSession } from "@/src/features/meditation/types";
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

// The three legs #425 graduates. Each mirrors the dailyNoticing suite above, and
// each has a SERVER twin in 20260803000000 that must answer the same way - the
// integration suite holds that end.
//
// The same instant throughout: 01:00 on the 12th in Tokyo (UTC+9), i.e. 16:00Z on
// the 11th. The runner sits at UTC+5:30, so converting it through the VIEWER's
// zone lands on the 11th - a different civil day from the one it happened on.
const OCCURRED_AT = "2026-05-11T16:00:00.000Z";
const TOKYO_OFFSET_MINUTES = 540;
const CAPTURED = "2026-05-12";
const VIEWER = "2026-05-11";

describe("the captured day and the viewer's day genuinely differ", () => {
  it("or every suite below proves nothing", () => {
    expect(toLocalDateKey(OCCURRED_AT)).toBe(VIEWER);
    expect(toLocalDateKey(OCCURRED_AT)).not.toBe(CAPTURED);
  });
});

describe("thoughtRecordDaily buckets by the captured civil day", () => {
  const task = CBT_PROGRAM[2].dailyPractice!;

  const record = (overrides: Partial<ThoughtRecord>): ThoughtRecord => ({
    id: "t1",
    userId: "user-1",
    situation: "Missed the deadline",
    nats: [],
    emotions: [],
    emotionIntensityBefore: null,
    distortions: [],
    evidenceFor: [],
    evidenceAgainst: [],
    balancedThought: "",
    emotionIntensityAfter: null,
    outcomeNotes: "",
    createdAt: OCCURRED_AT,
    createdOffsetMinutes: TOKYO_OFFSET_MINUTES,
    dayKey: CAPTURED,
    updatedAt: OCCURRED_AT,
    archivedAt: null,
    ...overrides,
  });

  const signal = (thoughtRecords: ThoughtRecord[], selectedDate: string) =>
    task.signal({ selectedDate, thoughtRecords, since: 0 } as ProgramSignalData).current;

  it("counts the record on the day it was written, not the day the viewer is standing in", () => {
    const records = [record({})];
    expect(signal(records, CAPTURED)).toBe(1);
    expect(signal(records, VIEWER)).toBe(0);
  });

  it("falls back to the viewer's day when no offset was captured", () => {
    const legacy = [record({ createdOffsetMinutes: null, dayKey: toLocalDateKey(OCCURRED_AT) })];
    expect(signal(legacy, VIEWER)).toBe(1);
    expect(signal(legacy, CAPTURED)).toBe(0);
  });

  it("is not done on a day with no record at all", () => {
    expect(signal([], CAPTURED)).toBe(0);
  });
});

describe("activityDaily buckets by the captured completion day", () => {
  const task = CBT_PROGRAM[3].dailyPractice!;

  const activity = (overrides: Partial<ActivityLog>): ActivityLog => ({
    id: "a1",
    userId: "user-1",
    activityName: "Walk",
    category: "pleasure",
    paceCategory: null,
    scheduledAt: null,
    scheduledOffsetMinutes: null,
    scheduledDayKey: null,
    completedAt: OCCURRED_AT,
    completedOffsetMinutes: TOKYO_OFFSET_MINUTES,
    completedDayKey: CAPTURED,
    moodBefore: null,
    moodAfter: null,
    notes: "",
    createdAt: OCCURRED_AT,
    updatedAt: OCCURRED_AT,
    ...overrides,
  });

  const signal = (activities: ActivityLog[], selectedDate: string) =>
    task.signal({ selectedDate, activities, since: 0 } as ProgramSignalData).current;

  it("counts the activity on the day it was completed, not the viewer's day", () => {
    const activities = [activity({})];
    expect(signal(activities, CAPTURED)).toBe(1);
    expect(signal(activities, VIEWER)).toBe(0);
  });

  it("ignores an activity that is still open", () => {
    const open = [
      activity({ completedAt: null, completedOffsetMinutes: null, completedDayKey: null }),
    ];
    expect(signal(open, CAPTURED)).toBe(0);
    expect(signal(open, VIEWER)).toBe(0);
  });
});

describe("calmingDaily buckets by the captured civil day", () => {
  const task = CBT_PROGRAM[4].dailyPractice!;

  const session = (overrides: Partial<MeditationSession>): MeditationSession => ({
    id: "s1",
    userId: "user-1",
    stageAtSession: 1,
    durationMinutes: 10,
    completedAt: OCCURRED_AT,
    completedOffsetMinutes: TOKYO_OFFSET_MINUTES,
    dayKey: CAPTURED,
    createdAt: OCCURRED_AT,
    mindWanderingEpisodes: null,
    dullnessLevel: null,
    distractionLevel: null,
    obstacleTags: [],
    reflection: "",
    moodAfter: null,
    techniqueUsed: null,
    ...overrides,
  });

  const signal = (meditationSessions: MeditationSession[], selectedDate: string) =>
    task.signal({ selectedDate, meditationSessions, since: 0 } as ProgramSignalData).current;

  it("counts the sit on the day it happened, not the day the viewer is standing in", () => {
    const sessions = [session({})];
    expect(signal(sessions, CAPTURED)).toBe(1);
    expect(signal(sessions, VIEWER)).toBe(0);
  });

  it("falls back to the viewer's day when no offset was captured", () => {
    const legacy = [session({ completedOffsetMinutes: null, dayKey: toLocalDateKey(OCCURRED_AT) })];
    expect(signal(legacy, VIEWER)).toBe(1);
    expect(signal(legacy, CAPTURED)).toBe(0);
  });
});

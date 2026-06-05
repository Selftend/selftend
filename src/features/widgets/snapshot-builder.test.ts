import { buildSnapshot, buildSignedOutSnapshot } from "@/src/features/widgets/snapshot-builder";
import type {
  WidgetData,
  MoodWidgetPayload,
  TodayWidgetPayload,
} from "@/src/features/widgets/snapshot-types";

const t = (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k);
const ctx = { t, ta: t, locale: "en", dateKey: "2026-06-05", appThemePref: "system" as const };

const empty: WidgetData = {
  moodLogs: [],
  sleepLogs: [],
  meditationSessions: [],
  activities: [],
  gratitudeEntries: [],
  journalEntries: [],
  groundingSessions: [],
  breathingSessions: [],
  committedActions: [],
  actionSteps: [],
  defusionLogs: [],
};

describe("buildSnapshot", () => {
  it("stamps metadata and includes the mood + today widgets", () => {
    const snap = buildSnapshot(empty, ctx);
    expect(snap.schemaVersion).toBe(1);
    expect(snap.locale).toBe("en");
    expect(snap.dateKey).toBe("2026-06-05");
    expect(snap.auth).toBe("signed-in");
    expect(snap.widgets["mood"]).toBeDefined();
    expect(snap.widgets["today"]).toBeDefined();
  });

  it("mood: today face + glance from mood logs", () => {
    const data: WidgetData = {
      ...empty,
      moodLogs: [
        { loggedAt: "2026-06-05T09:00:00", moodScore: 4 },
        { loggedAt: "2026-06-04T09:00:00", moodScore: 2 },
      ],
    };
    const p = buildSnapshot(data, ctx).widgets["mood"] as MoodWidgetPayload;
    expect(p.kind).toBe("mood");
    expect(p.todayFace).toBe("😊");
    expect(p.glanceLabel).toContain("3");
  });

  it("mood: no logs → null face + noLogs label", () => {
    const p = buildSnapshot(empty, ctx).widgets["mood"] as MoodWidgetPayload;
    expect(p.todayFace).toBeNull();
    expect(p.glanceLabel).toBe("home.widgets.mood.noLogs");
  });

  it("today: prioritized stat items (mood, habits, sleep, meditation)", () => {
    const data: WidgetData = {
      ...empty,
      moodLogs: [{ loggedAt: "2026-06-05T09:00:00", moodScore: 5 }],
      activities: [
        {
          id: "a",
          activityName: "Walk",
          scheduledAt: "2026-06-05T08:00:00",
          completedAt: "2026-06-05T09:00:00",
        },
        { id: "b", activityName: "Read", scheduledAt: "2026-06-05T08:00:00", completedAt: null },
      ],
      meditationSessions: [{ completedAt: "2026-06-05T07:00:00", durationMinutes: 10 }],
    };
    const p = buildSnapshot(data, ctx).widgets["today"] as TodayWidgetPayload;
    expect(p.kind).toBe("today");
    expect(p.items.map((i) => i.key)).toEqual([
      "mood",
      "habits",
      "sleep",
      "meditation",
      "gratitude",
      "journal",
      "breathing",
      "grounding",
    ]);
    expect(p.items[0].value).toBe("😁");
    expect(p.items[1].value).toBe("1/2");
    expect(p.items[3].value).toBe("✓");
    expect(p.homePath).toBe("/today");
  });
});

describe("buildSignedOutSnapshot", () => {
  it("produces an empty signed-out snapshot", () => {
    const snap = buildSignedOutSnapshot("bg", "2026-06-05", "system");
    expect(snap.auth).toBe("signed-out");
    expect(snap.widgets).toEqual({});
    expect(snap.locale).toBe("bg");
    expect(snap.appThemePref).toBe("system");
  });
});

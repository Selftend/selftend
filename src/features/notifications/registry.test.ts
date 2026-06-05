import {
  getNotificationTarget,
  NOTIFICATION_TARGETS,
  type NotificationTargetKey,
  readEnabled,
  readHour,
  readMinute,
} from "@/src/features/notifications/registry";
import { defaultUserPreferences } from "@/src/features/modules/types";

const NEW_LIVE: NotificationTargetKey[] = [
  "mood",
  "journal",
  "gratitude",
  "grounding",
  "breathing",
  "sleep",
  "habits",
];

describe("NOTIFICATION_TARGETS", () => {
  it("contains all expected keys exactly once", () => {
    const keys = NOTIFICATION_TARGETS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of [
      "cbt",
      "act",
      "meditation",
      "gratitude",
      "mood",
      "journal",
      "breathing",
      "grounding",
      "sleep",
      "habits",
    ]) {
      expect(keys).toContain(k);
    }
  });

  it("no longer contains the stale mindfulness target", () => {
    expect(NOTIFICATION_TARGETS.map((t) => String(t.key))).not.toContain("mindfulness");
  });

  it("live targets have schedule fields, placeholder targets do not", () => {
    for (const target of NOTIFICATION_TARGETS) {
      if (target.status === "live") {
        expect(target.enabledField).toBeDefined();
        expect(target.hourField).toBeDefined();
        expect(target.minuteField).toBeDefined();
        expect(target.timezoneField).toBeDefined();
      } else {
        expect(target.enabledField).toBeUndefined();
        expect(target.hourField).toBeUndefined();
      }
    }
  });

  it.each(NEW_LIVE)("%s is live, schedules OS notifications, and names all four fields", (key) => {
    const target = getNotificationTarget(key);
    expect(target.status).toBe("live");
    expect(target.schedulesOs).toBe(true);
    expect(target.enabledField).toBe(`${key}RemindersEnabled`);
    expect(target.hourField).toBe(`${key}ReminderHour`);
    expect(target.minuteField).toBe(`${key}ReminderMinute`);
    expect(target.timezoneField).toBe(`${key}ReminderTimezone`);
  });
});

describe("getNotificationTarget", () => {
  it("returns the target for a known key", () => {
    const target = getNotificationTarget("cbt");
    expect(target.key).toBe("cbt");
    expect(target.schedulesOs).toBe(true);
  });

  it("throws for an unknown key", () => {
    expect(() => getNotificationTarget("nope" as never)).toThrow(/Unknown notification target/);
  });
});

describe("readEnabled / readHour / readMinute", () => {
  it("readEnabled returns false for a disabled live target", () => {
    const mood = getNotificationTarget("mood");
    expect(readEnabled(defaultUserPreferences, mood)).toBe(false);
  });

  it("readEnabled reflects the preferences value for live targets", () => {
    const cbt = getNotificationTarget("cbt");
    expect(readEnabled({ ...defaultUserPreferences, cbtRemindersEnabled: true }, cbt)).toBe(true);
    expect(readEnabled({ ...defaultUserPreferences, cbtRemindersEnabled: false }, cbt)).toBe(false);
  });

  it("readHour returns each live target's stored value", () => {
    expect(
      readHour({ ...defaultUserPreferences, cbtReminderHour: 8 }, getNotificationTarget("cbt")),
    ).toBe(8);
    // mood's staggered default lands at 12:00.
    expect(readHour(defaultUserPreferences, getNotificationTarget("mood"))).toBe(12);
  });

  it("readMinute returns each live target's stored value", () => {
    expect(readMinute(defaultUserPreferences, getNotificationTarget("mood"))).toBe(0);
    expect(
      readMinute(
        { ...defaultUserPreferences, meditationReminderMinute: 45 },
        getNotificationTarget("meditation"),
      ),
    ).toBe(45);
  });
});

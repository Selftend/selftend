import {
  getNotificationTarget,
  NOTIFICATION_TARGETS,
  readEnabled,
  readHour,
  readMinute,
} from "@/src/features/notifications/registry";
import { defaultUserPreferences } from "@/src/features/modules/types";

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
      "mindfulness",
      "grounding",
      "sleep",
      "habits",
    ]) {
      expect(keys).toContain(k);
    }
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
  it("readEnabled returns false when target has no enabledField", () => {
    const placeholder = getNotificationTarget("mood");
    expect(readEnabled(defaultUserPreferences, placeholder)).toBe(false);
  });

  it("readEnabled reflects the preferences value for live targets", () => {
    const cbt = getNotificationTarget("cbt");
    expect(readEnabled({ ...defaultUserPreferences, cbtRemindersEnabled: true }, cbt)).toBe(true);
    expect(readEnabled({ ...defaultUserPreferences, cbtRemindersEnabled: false }, cbt)).toBe(false);
  });

  it("readHour defaults to 19 for placeholders and to the stored value for live", () => {
    expect(readHour(defaultUserPreferences, getNotificationTarget("mood"))).toBe(19);
    expect(
      readHour({ ...defaultUserPreferences, cbtReminderHour: 8 }, getNotificationTarget("cbt")),
    ).toBe(8);
  });

  it("readMinute defaults to 0 for placeholders and to the stored value for live", () => {
    expect(readMinute(defaultUserPreferences, getNotificationTarget("mood"))).toBe(0);
    expect(
      readMinute(
        { ...defaultUserPreferences, meditationReminderMinute: 45 },
        getNotificationTarget("meditation"),
      ),
    ).toBe(45);
  });
});

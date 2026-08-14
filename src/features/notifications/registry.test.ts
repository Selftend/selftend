import {
  getNotificationTarget,
  NOTIFICATION_TARGETS,
  type NotificationTargetKey,
  readEnabled,
  readHour,
  readMinute,
} from "@/src/features/notifications/registry";
import { WIDGET_META } from "@/src/features/home/widget-registry";
import { defaultUserPreferences } from "@/src/features/modules/types";

const ALL_KEYS: NotificationTargetKey[] = [
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
];

describe("NOTIFICATION_TARGETS", () => {
  it("contains all expected keys exactly once", () => {
    const keys = NOTIFICATION_TARGETS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of ALL_KEYS) {
      expect(keys).toContain(k);
    }
  });

  it("no longer contains the stale mindfulness target", () => {
    expect(NOTIFICATION_TARGETS.map((t) => String(t.key))).not.toContain("mindfulness");
  });

  /**
   * DERIVED, not restated (#981): the expected order is computed from the dashboard
   * catalogue, so adding a widget id ahead of another reorders this screen too rather than
   * quietly disagreeing with home. A hand-written expected array would pass forever while the
   * two screens drifted, which is the failure shape #807 recorded.
   */
  it("is ordered by the dashboard catalogue, so home and reminders agree", () => {
    const reminderKeys = new Set<string>(ALL_KEYS);
    const seen = new Set<string>();
    const catalogueOrder: string[] = [];
    for (const meta of Object.values(WIDGET_META)) {
      if (meta.tier !== "tool") continue;
      if (!reminderKeys.has(meta.toolKey) || seen.has(meta.toolKey)) continue;
      seen.add(meta.toolKey);
      catalogueOrder.push(meta.toolKey);
    }

    // Every reminder target is a dashboard tool, so the catalogue names all ten.
    expect(catalogueOrder).toHaveLength(ALL_KEYS.length);
    expect(NOTIFICATION_TARGETS.map((t) => t.key)).toEqual(catalogueOrder);
  });

  it.each(ALL_KEYS)("%s names all four preference columns", (key) => {
    const target = getNotificationTarget(key);
    expect(target.enabledField).toBe(`${key}RemindersEnabled`);
    expect(target.hourField).toBe(`${key}ReminderHour`);
    expect(target.minuteField).toBe(`${key}ReminderMinute`);
    expect(target.timezoneField).toBe(`${key}ReminderTimezone`);
  });

  it("carries no placeholder status and no description key", () => {
    for (const target of NOTIFICATION_TARGETS) {
      // Both were dead: `status: "placeholder"` was never used, and all ten descriptions
      // restated their own labels (#981). Asserted as absence so a revert is loud.
      expect(target).not.toHaveProperty("status");
      expect(target).not.toHaveProperty("descriptionKey");
    }
  });
});

describe("getNotificationTarget", () => {
  it("returns the target for a known key", () => {
    expect(getNotificationTarget("cbt").key).toBe("cbt");
  });

  it("throws for an unknown key", () => {
    expect(() => getNotificationTarget("nope" as never)).toThrow(/Unknown notification target/);
  });
});

describe("readEnabled / readHour / readMinute", () => {
  it("readEnabled returns false for a disabled target", () => {
    const mood = getNotificationTarget("mood");
    expect(readEnabled(defaultUserPreferences, mood)).toBe(false);
  });

  it("readEnabled reflects the preferences value", () => {
    const cbt = getNotificationTarget("cbt");
    expect(readEnabled({ ...defaultUserPreferences, cbtRemindersEnabled: true }, cbt)).toBe(true);
    expect(readEnabled({ ...defaultUserPreferences, cbtRemindersEnabled: false }, cbt)).toBe(false);
  });

  it("readHour returns each target's stored value", () => {
    expect(
      readHour({ ...defaultUserPreferences, cbtReminderHour: 8 }, getNotificationTarget("cbt")),
    ).toBe(8);
    // mood's staggered default lands at 12:00.
    expect(readHour(defaultUserPreferences, getNotificationTarget("mood"))).toBe(12);
  });

  it("readMinute returns each target's stored value", () => {
    expect(readMinute(defaultUserPreferences, getNotificationTarget("mood"))).toBe(0);
    expect(
      readMinute(
        { ...defaultUserPreferences, meditationReminderMinute: 45 },
        getNotificationTarget("meditation"),
      ),
    ).toBe(45);
  });
});

import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";
import type { UserPreferences } from "@/src/features/modules/types";

export type NotificationTargetKey =
  | "cbt"
  | "act"
  | "meditation"
  | "gratitude"
  | "mood"
  | "journal"
  | "breathing"
  | "grounding"
  | "sleep"
  | "habits";

type EnabledField =
  | "cbtRemindersEnabled"
  | "meditationRemindersEnabled"
  | "actRemindersEnabled"
  | "moodRemindersEnabled"
  | "journalRemindersEnabled"
  | "gratitudeRemindersEnabled"
  | "groundingRemindersEnabled"
  | "breathingRemindersEnabled"
  | "sleepRemindersEnabled"
  | "habitsRemindersEnabled";
type HourField =
  | "cbtReminderHour"
  | "meditationReminderHour"
  | "actReminderHour"
  | "moodReminderHour"
  | "journalReminderHour"
  | "gratitudeReminderHour"
  | "groundingReminderHour"
  | "breathingReminderHour"
  | "sleepReminderHour"
  | "habitsReminderHour";
type MinuteField =
  | "cbtReminderMinute"
  | "meditationReminderMinute"
  | "actReminderMinute"
  | "moodReminderMinute"
  | "journalReminderMinute"
  | "gratitudeReminderMinute"
  | "groundingReminderMinute"
  | "breathingReminderMinute"
  | "sleepReminderMinute"
  | "habitsReminderMinute";
type TimezoneField =
  | "cbtReminderTimezone"
  | "meditationReminderTimezone"
  | "actReminderTimezone"
  | "moodReminderTimezone"
  | "journalReminderTimezone"
  | "gratitudeReminderTimezone"
  | "groundingReminderTimezone"
  | "breathingReminderTimezone"
  | "sleepReminderTimezone"
  | "habitsReminderTimezone";

/**
 * One reminder target: a tool or module the server can nudge about, and the four
 * `user_preferences` columns the edge function reads at send time.
 *
 * There is no `status` field and no `descriptionKey` any more (#981). `status: "placeholder"`
 * appeared zero times in the array, so its whole branch - the "Coming soon" badge, the hidden
 * time field, the optional field types - was dead code guarding a state that never existed.
 * Every target is live, so every field is required.
 */
export interface NotificationTarget {
  key: NotificationTargetKey;
  kind: "module" | "tool";
  /** i18n key inside the `notifications` namespace, e.g. `targets.cbt.label`. */
  labelKey: string;
  icon: MaterialIconName;
  enabledField: EnabledField;
  hourField: HourField;
  minuteField: MinuteField;
  timezoneField: TimezoneField;
}

/**
 * Ordered by the dashboard catalogue, so a user meets the same tools in the same sequence on
 * home and here (#981). `notification-registry-order.test.ts` derives the expected order from
 * `WIDGET_META` rather than restating it, so the two screens cannot drift apart silently.
 */
export const NOTIFICATION_TARGETS: NotificationTarget[] = [
  {
    key: "mood",
    kind: "tool",
    labelKey: "targets.mood.label",
    icon: "mood",
    enabledField: "moodRemindersEnabled",
    hourField: "moodReminderHour",
    minuteField: "moodReminderMinute",
    timezoneField: "moodReminderTimezone",
  },
  {
    key: "breathing",
    kind: "tool",
    labelKey: "targets.breathing.label",
    icon: "air",
    enabledField: "breathingRemindersEnabled",
    hourField: "breathingReminderHour",
    minuteField: "breathingReminderMinute",
    timezoneField: "breathingReminderTimezone",
  },
  {
    key: "gratitude",
    kind: "tool",
    labelKey: "targets.gratitude.label",
    icon: "favorite",
    enabledField: "gratitudeRemindersEnabled",
    hourField: "gratitudeReminderHour",
    minuteField: "gratitudeReminderMinute",
    timezoneField: "gratitudeReminderTimezone",
  },
  {
    key: "meditation",
    kind: "tool",
    labelKey: "targets.meditation.label",
    icon: "self-improvement",
    enabledField: "meditationRemindersEnabled",
    hourField: "meditationReminderHour",
    minuteField: "meditationReminderMinute",
    timezoneField: "meditationReminderTimezone",
  },
  {
    key: "habits",
    kind: "tool",
    labelKey: "targets.habits.label",
    icon: "task-alt",
    enabledField: "habitsRemindersEnabled",
    hourField: "habitsReminderHour",
    minuteField: "habitsReminderMinute",
    timezoneField: "habitsReminderTimezone",
  },
  {
    key: "cbt",
    kind: "module",
    labelKey: "targets.cbt.label",
    icon: "psychology",
    enabledField: "cbtRemindersEnabled",
    hourField: "cbtReminderHour",
    minuteField: "cbtReminderMinute",
    timezoneField: "cbtReminderTimezone",
  },
  {
    key: "act",
    kind: "module",
    labelKey: "targets.act.label",
    icon: "explore",
    enabledField: "actRemindersEnabled",
    hourField: "actReminderHour",
    minuteField: "actReminderMinute",
    timezoneField: "actReminderTimezone",
  },
  {
    key: "sleep",
    kind: "tool",
    labelKey: "targets.sleep.label",
    icon: "bedtime",
    enabledField: "sleepRemindersEnabled",
    hourField: "sleepReminderHour",
    minuteField: "sleepReminderMinute",
    timezoneField: "sleepReminderTimezone",
  },
  {
    key: "journal",
    kind: "tool",
    labelKey: "targets.journal.label",
    icon: "edit-note",
    enabledField: "journalRemindersEnabled",
    hourField: "journalReminderHour",
    minuteField: "journalReminderMinute",
    timezoneField: "journalReminderTimezone",
  },
  {
    key: "grounding",
    kind: "tool",
    labelKey: "targets.grounding.label",
    icon: "anchor",
    enabledField: "groundingRemindersEnabled",
    hourField: "groundingReminderHour",
    minuteField: "groundingReminderMinute",
    timezoneField: "groundingReminderTimezone",
  },
];

export function getNotificationTarget(key: NotificationTargetKey): NotificationTarget {
  const target = NOTIFICATION_TARGETS.find((t) => t.key === key);
  if (!target) {
    throw new Error(`Unknown notification target: ${key}`);
  }
  return target;
}

export function readEnabled(prefs: UserPreferences, target: NotificationTarget): boolean {
  return Boolean(prefs[target.enabledField]);
}

export function readHour(prefs: UserPreferences, target: NotificationTarget): number {
  return prefs[target.hourField] as number;
}

export function readMinute(prefs: UserPreferences, target: NotificationTarget): number {
  return prefs[target.minuteField] as number;
}

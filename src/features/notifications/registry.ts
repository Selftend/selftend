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

export interface NotificationTarget {
  key: NotificationTargetKey;
  kind: "module" | "tool";
  status: "live" | "placeholder";
  /** i18n key inside the `notifications` namespace, e.g. `targets.cbt.label`. */
  labelKey: string;
  /** i18n key for the muted subtitle, e.g. `targets.cbt.description`. */
  descriptionKey: string;
  icon: MaterialIconName;
  /** Only set for live targets. */
  enabledField?: EnabledField;
  hourField?: HourField;
  minuteField?: MinuteField;
  timezoneField?: TimezoneField;
  /**
   * True if saving this target should actually schedule an OS notification
   * (currently only CBT). Other live targets persist toggles but rely on
   * platform-specific scheduling that isn't wired up yet.
   */
  schedulesOs?: boolean;
}

export const NOTIFICATION_TARGETS: NotificationTarget[] = [
  {
    key: "cbt",
    kind: "module",
    status: "live",
    labelKey: "targets.cbt.label",
    descriptionKey: "targets.cbt.description",
    icon: "psychology",
    enabledField: "cbtRemindersEnabled",
    hourField: "cbtReminderHour",
    minuteField: "cbtReminderMinute",
    timezoneField: "cbtReminderTimezone",
    schedulesOs: true,
  },
  {
    key: "act",
    kind: "module",
    status: "live",
    labelKey: "targets.act.label",
    descriptionKey: "targets.act.description",
    icon: "explore",
    enabledField: "actRemindersEnabled",
    hourField: "actReminderHour",
    minuteField: "actReminderMinute",
    timezoneField: "actReminderTimezone",
    schedulesOs: true,
  },
  {
    key: "meditation",
    kind: "tool",
    status: "live",
    labelKey: "targets.meditation.label",
    descriptionKey: "targets.meditation.description",
    icon: "self-improvement",
    enabledField: "meditationRemindersEnabled",
    hourField: "meditationReminderHour",
    minuteField: "meditationReminderMinute",
    timezoneField: "meditationReminderTimezone",
    schedulesOs: true,
  },
  {
    key: "mood",
    kind: "tool",
    status: "live",
    labelKey: "targets.mood.label",
    descriptionKey: "targets.mood.description",
    icon: "mood",
    enabledField: "moodRemindersEnabled",
    hourField: "moodReminderHour",
    minuteField: "moodReminderMinute",
    timezoneField: "moodReminderTimezone",
    schedulesOs: true,
  },
  {
    key: "journal",
    kind: "tool",
    status: "live",
    labelKey: "targets.journal.label",
    descriptionKey: "targets.journal.description",
    icon: "edit-note",
    enabledField: "journalRemindersEnabled",
    hourField: "journalReminderHour",
    minuteField: "journalReminderMinute",
    timezoneField: "journalReminderTimezone",
    schedulesOs: true,
  },
  {
    key: "gratitude",
    kind: "tool",
    status: "live",
    labelKey: "targets.gratitude.label",
    descriptionKey: "targets.gratitude.description",
    icon: "favorite",
    enabledField: "gratitudeRemindersEnabled",
    hourField: "gratitudeReminderHour",
    minuteField: "gratitudeReminderMinute",
    timezoneField: "gratitudeReminderTimezone",
    schedulesOs: true,
  },
  {
    key: "grounding",
    kind: "tool",
    status: "live",
    labelKey: "targets.grounding.label",
    descriptionKey: "targets.grounding.description",
    icon: "anchor",
    enabledField: "groundingRemindersEnabled",
    hourField: "groundingReminderHour",
    minuteField: "groundingReminderMinute",
    timezoneField: "groundingReminderTimezone",
    schedulesOs: true,
  },
  {
    key: "breathing",
    kind: "tool",
    status: "live",
    labelKey: "targets.breathing.label",
    descriptionKey: "targets.breathing.description",
    icon: "air",
    enabledField: "breathingRemindersEnabled",
    hourField: "breathingReminderHour",
    minuteField: "breathingReminderMinute",
    timezoneField: "breathingReminderTimezone",
    schedulesOs: true,
  },
  {
    key: "sleep",
    kind: "tool",
    status: "live",
    labelKey: "targets.sleep.label",
    descriptionKey: "targets.sleep.description",
    icon: "bedtime",
    enabledField: "sleepRemindersEnabled",
    hourField: "sleepReminderHour",
    minuteField: "sleepReminderMinute",
    timezoneField: "sleepReminderTimezone",
    schedulesOs: true,
  },
  {
    key: "habits",
    kind: "tool",
    status: "live",
    labelKey: "targets.habits.label",
    descriptionKey: "targets.habits.description",
    icon: "task-alt",
    enabledField: "habitsRemindersEnabled",
    hourField: "habitsReminderHour",
    minuteField: "habitsReminderMinute",
    timezoneField: "habitsReminderTimezone",
    schedulesOs: true,
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
  if (!target.enabledField) return false;
  return Boolean(prefs[target.enabledField]);
}

export function readHour(prefs: UserPreferences, target: NotificationTarget): number {
  if (!target.hourField) return 19;
  return prefs[target.hourField] as number;
}

export function readMinute(prefs: UserPreferences, target: NotificationTarget): number {
  if (!target.minuteField) return 0;
  return prefs[target.minuteField] as number;
}

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
  | "mindfulness"
  | "grounding"
  | "sleep"
  | "habits";

type EnabledField = "cbtRemindersEnabled" | "meditationRemindersEnabled" | "actRemindersEnabled";
type HourField = "cbtReminderHour" | "meditationReminderHour" | "actReminderHour";
type MinuteField = "cbtReminderMinute" | "meditationReminderMinute" | "actReminderMinute";
type TimezoneField = "cbtReminderTimezone" | "meditationReminderTimezone" | "actReminderTimezone";

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
    status: "placeholder",
    labelKey: "targets.mood.label",
    descriptionKey: "targets.mood.description",
    icon: "mood",
  },
  {
    key: "journal",
    kind: "tool",
    status: "placeholder",
    labelKey: "targets.journal.label",
    descriptionKey: "targets.journal.description",
    icon: "edit-note",
  },
  {
    key: "gratitude",
    kind: "tool",
    status: "placeholder",
    labelKey: "targets.gratitude.label",
    descriptionKey: "targets.gratitude.description",
    icon: "favorite",
  },
  {
    key: "mindfulness",
    kind: "tool",
    status: "placeholder",
    labelKey: "targets.mindfulness.label",
    descriptionKey: "targets.mindfulness.description",
    icon: "air",
  },
  {
    key: "grounding",
    kind: "tool",
    status: "placeholder",
    labelKey: "targets.grounding.label",
    descriptionKey: "targets.grounding.description",
    icon: "anchor",
  },
  {
    key: "breathing",
    kind: "tool",
    status: "placeholder",
    labelKey: "targets.breathing.label",
    descriptionKey: "targets.breathing.description",
    icon: "air",
  },
  {
    key: "sleep",
    kind: "tool",
    status: "placeholder",
    labelKey: "targets.sleep.label",
    descriptionKey: "targets.sleep.description",
    icon: "bedtime",
  },
  {
    key: "habits",
    kind: "tool",
    status: "placeholder",
    labelKey: "targets.habits.label",
    descriptionKey: "targets.habits.description",
    icon: "task-alt",
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

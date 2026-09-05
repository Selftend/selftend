import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";
import type { UserPreferences } from "@/src/features/modules/types";

export type NotificationTargetKey =
  | "cbt"
  | "act"
  | "dbt"
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
  | "dbtRemindersEnabled"
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
  | "dbtReminderHour"
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
  | "dbtReminderMinute"
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
  | "dbtReminderTimezone"
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
 * There is no `status` field, no `descriptionKey` and no `kind` any more (#981). `kind` split
 * the list into "Modules" and "Tools" sections; the screen renders one run in catalogue order
 * now, so nothing read it. `status: "placeholder"`
 * appeared zero times in the array, so its whole branch - the "Coming soon" badge, the hidden
 * time field, the optional field types - was dead code guarding a state that never existed.
 * Every target is live, so every field is required.
 */
export interface NotificationTarget {
  key: NotificationTargetKey;
  /** i18n key inside the `notifications` namespace, e.g. `targets.cbt.label`. */
  labelKey: string;
  icon: MaterialIconName;
  enabledField: EnabledField;
  hourField: HourField;
  minuteField: MinuteField;
  timezoneField: TimezoneField;
}

/**
 * Ordered by the widget catalogue (#981), which `registry.test.ts` derives from
 * `WIDGET_META` rather than restating, so the two cannot drift apart silently. That
 * catalogue is the Android launcher's since #1952; Home's Favourites (#1956) follow
 * `CATALOGUE` in src/features/favorites/items.ts, a different tool order, and
 * re-sequencing this screen onto it is an open product call, not something a test decides.
 */
export const NOTIFICATION_TARGETS: NotificationTarget[] = [
  {
    key: "mood",
    labelKey: "targets.mood.label",
    icon: "mood",
    enabledField: "moodRemindersEnabled",
    hourField: "moodReminderHour",
    minuteField: "moodReminderMinute",
    timezoneField: "moodReminderTimezone",
  },
  {
    key: "breathing",
    labelKey: "targets.breathing.label",
    icon: "air",
    enabledField: "breathingRemindersEnabled",
    hourField: "breathingReminderHour",
    minuteField: "breathingReminderMinute",
    timezoneField: "breathingReminderTimezone",
  },
  {
    key: "gratitude",
    labelKey: "targets.gratitude.label",
    icon: "favorite",
    enabledField: "gratitudeRemindersEnabled",
    hourField: "gratitudeReminderHour",
    minuteField: "gratitudeReminderMinute",
    timezoneField: "gratitudeReminderTimezone",
  },
  {
    key: "meditation",
    labelKey: "targets.meditation.label",
    icon: "self-improvement",
    enabledField: "meditationRemindersEnabled",
    hourField: "meditationReminderHour",
    minuteField: "meditationReminderMinute",
    timezoneField: "meditationReminderTimezone",
  },
  {
    key: "habits",
    labelKey: "targets.habits.label",
    icon: "task-alt",
    enabledField: "habitsRemindersEnabled",
    hourField: "habitsReminderHour",
    minuteField: "habitsReminderMinute",
    timezoneField: "habitsReminderTimezone",
  },
  {
    key: "cbt",
    labelKey: "targets.cbt.label",
    icon: "psychology",
    enabledField: "cbtRemindersEnabled",
    hourField: "cbtReminderHour",
    minuteField: "cbtReminderMinute",
    timezoneField: "cbtReminderTimezone",
  },
  {
    key: "act",
    labelKey: "targets.act.label",
    icon: "explore",
    enabledField: "actRemindersEnabled",
    hourField: "actReminderHour",
    minuteField: "actReminderMinute",
    timezoneField: "actReminderTimezone",
  },
  {
    key: "sleep",
    labelKey: "targets.sleep.label",
    icon: "bedtime",
    enabledField: "sleepRemindersEnabled",
    hourField: "sleepReminderHour",
    minuteField: "sleepReminderMinute",
    timezoneField: "sleepReminderTimezone",
  },
  {
    key: "journal",
    labelKey: "targets.journal.label",
    icon: "edit-note",
    enabledField: "journalRemindersEnabled",
    hourField: "journalReminderHour",
    minuteField: "journalReminderMinute",
    timezoneField: "journalReminderTimezone",
  },
  {
    key: "grounding",
    labelKey: "targets.grounding.label",
    icon: "anchor",
    enabledField: "groundingRemindersEnabled",
    hourField: "groundingReminderHour",
    minuteField: "groundingReminderMinute",
    timezoneField: "groundingReminderTimezone",
  },
  // ⚠️ LAST, and not by preference: the row order is derived from the Android
  // launcher's widget catalogue, and DBT has no widget by ruling (#1980,
  // decision 13 excludes the launcher). A target the catalogue cannot name has
  // to sit somewhere the catalogue is not deciding, which is the end.
  {
    key: "dbt",
    labelKey: "targets.dbt.label",
    icon: "balance",
    enabledField: "dbtRemindersEnabled",
    hourField: "dbtReminderHour",
    minuteField: "dbtReminderMinute",
    timezoneField: "dbtReminderTimezone",
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

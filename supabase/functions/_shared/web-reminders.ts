// Runtime-agnostic scheduling logic for the send-web-reminders edge function.
// Imported by both the Deno function (index.ts) and jest unit tests. Contains NO
// Deno globals and NO i18n JSON imports so Node/jest can load it directly.

export type ReminderTarget = "cbt" | "meditation" | "act";

export interface WebPushSubscriptionRow {
  auth: string;
  endpoint: string;
  failure_count: number;
  id: string;
  last_cbt_reminder_key: string | null;
  last_meditation_reminder_key: string | null;
  last_act_reminder_key: string | null;
  p256dh: string;
  time_zone: string | null;
  user_id: string;
}

export interface UserPreferenceRow {
  user_id: string;
  notifications_enabled_global: boolean | null;
  reminder_consent: boolean;
  language: string | null;
  cbt_reminders_enabled: boolean;
  cbt_reminder_hour: number;
  cbt_reminder_minute: number;
  cbt_reminder_timezone: string | null;
  meditation_reminders_enabled: boolean;
  meditation_reminder_hour: number;
  meditation_reminder_minute: number;
  meditation_reminder_timezone: string | null;
  act_reminders_enabled: boolean;
  act_reminder_hour: number;
  act_reminder_minute: number;
  act_reminder_timezone: string | null;
}

export interface TargetConfig {
  enabledField: keyof UserPreferenceRow;
  hourField: keyof UserPreferenceRow;
  minuteField: keyof UserPreferenceRow;
  timezoneField: keyof UserPreferenceRow;
  lastKeyField: keyof WebPushSubscriptionRow;
  url: string;
  tag: string;
}

export const TARGET_CONFIGS: Record<ReminderTarget, TargetConfig> = {
  cbt: {
    enabledField: "cbt_reminders_enabled",
    hourField: "cbt_reminder_hour",
    minuteField: "cbt_reminder_minute",
    timezoneField: "cbt_reminder_timezone",
    lastKeyField: "last_cbt_reminder_key",
    url: "/modules/cbt",
    tag: "selftend-cbt-reminder",
  },
  meditation: {
    enabledField: "meditation_reminders_enabled",
    hourField: "meditation_reminder_hour",
    minuteField: "meditation_reminder_minute",
    timezoneField: "meditation_reminder_timezone",
    lastKeyField: "last_meditation_reminder_key",
    url: "/tools/meditation",
    tag: "selftend-meditation-reminder",
  },
  act: {
    enabledField: "act_reminders_enabled",
    hourField: "act_reminder_hour",
    minuteField: "act_reminder_minute",
    timezoneField: "act_reminder_timezone",
    lastKeyField: "last_act_reminder_key",
    url: "/modules/act",
    tag: "selftend-act-reminder",
  },
};

export const TARGETS: ReminderTarget[] = ["cbt", "meditation", "act"];

export interface ZonedParts {
  day: string;
  hour: number;
  minute: number;
  month: string;
  year: string;
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric",
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(date).map((part) => [part.type, part.value]),
    );
    return {
      day: parts.day,
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      month: parts.month,
      year: parts.year,
    };
  } catch {
    return null;
  }
}

export function reminderKeyIfDue(
  target: ReminderTarget,
  subscription: WebPushSubscriptionRow,
  preferences: UserPreferenceRow,
  now: Date,
): string | null {
  const config = TARGET_CONFIGS[target];
  if (!preferences[config.enabledField]) return null;

  // Subscription tz takes precedence over the user-preference tz, then UTC.
  const timeZone =
    subscription.time_zone ?? (preferences[config.timezoneField] as string | null) ?? "UTC";
  const parts = getZonedParts(now, timeZone);
  if (!parts) return null;

  const reminderKey = `${parts.year}-${parts.month}-${parts.day}`;
  if (subscription[config.lastKeyField] === reminderKey) return null;

  const targetHour = preferences[config.hourField] as number;
  const targetMinute = preferences[config.minuteField] as number;

  if (parts.hour !== targetHour) return null;
  if (parts.minute < targetMinute || parts.minute >= targetMinute + 5) return null;

  return reminderKey;
}

export function resolveReminderLanguage(language: string | null): "bg" | "en" {
  return language?.toLowerCase().startsWith("bg") ? "bg" : "en";
}

export function classifyPushError(error: unknown): { expired: boolean; statusCode: number | null } {
  const statusCode =
    error && typeof error === "object" && "statusCode" in error
      ? Number((error as { statusCode: unknown }).statusCode)
      : null;
  return { expired: statusCode === 404 || statusCode === 410, statusCode };
}

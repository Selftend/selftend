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
      // Intl's hour12:false clock reports midnight as "24"; normalize to 0 so a
      // reminder set for hour 0 (midnight) matches instead of silently never firing.
      hour: Number(parts.hour) % 24,
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

  // Due if "now" is within 5 minutes after the target, measured in minute-of-day so
  // the window spans the hour/day boundary. A separate `hour === targetHour` gate plus
  // a `[minute, minute+5)` check would never fire for target minutes 56-59, because the
  // */5 cron ticks at :55 (below the window) and :00 (hour no longer matches).
  const MINUTES_PER_DAY = 24 * 60;
  const nowMinuteOfDay = parts.hour * 60 + parts.minute;
  const targetMinuteOfDay = targetHour * 60 + targetMinute;
  const minutesSinceTarget =
    (((nowMinuteOfDay - targetMinuteOfDay) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  if (minutesSinceTarget >= 5) return null;

  return reminderKey;
}

export function resolveReminderLanguage(language: string | null): "bg" | "en" {
  return language?.toLowerCase().startsWith("bg") ? "bg" : "en";
}

// Allowlist of real Web Push service hosts. send-web-reminders runs with the service-role
// key and delivers to web_push_subscriptions.endpoint, but the table's RLS only checks
// user_id — not endpoint — so an authenticated user can upsert an arbitrary endpoint and
// turn the worker into a blind-SSRF probe of internal URLs. Only deliver to an https URL on
// a known push host (default port), and skip anything else.
const PUSH_HOST_EXACT = new Set(["fcm.googleapis.com", "push.services.mozilla.com"]);
const PUSH_HOST_SUFFIXES = [
  ".push.apple.com",
  ".notify.windows.com",
  ".wns.windows.com",
  ".push.services.mozilla.com",
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  // Push services always use the default https port; a non-default port signals an internal
  // host:port target.
  if (url.port !== "" && url.port !== "443") return false;
  const host = url.hostname.toLowerCase();
  if (PUSH_HOST_EXACT.has(host)) return true;
  return PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export function classifyPushError(error: unknown): { expired: boolean; statusCode: number | null } {
  const statusCode =
    error && typeof error === "object" && "statusCode" in error
      ? Number((error as { statusCode: unknown }).statusCode)
      : null;
  return { expired: statusCode === 404 || statusCode === 410, statusCode };
}

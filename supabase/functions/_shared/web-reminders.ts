// Runtime-agnostic scheduling logic for the send-web-reminders edge function.
// Imported by both the Deno function (index.ts) and jest unit tests. Contains NO
// Deno globals and NO i18n JSON imports so Node/jest can load it directly.

export type ReminderTarget =
  | "cbt"
  | "meditation"
  | "act"
  | "mood"
  | "journal"
  | "gratitude"
  | "grounding"
  | "breathing"
  | "sleep"
  | "habits";

export interface WebPushSubscriptionRow {
  auth: string;
  endpoint: string;
  failure_count: number;
  id: string;
  last_cbt_reminder_key: string | null;
  last_meditation_reminder_key: string | null;
  last_act_reminder_key: string | null;
  last_mood_reminder_key: string | null;
  last_journal_reminder_key: string | null;
  last_gratitude_reminder_key: string | null;
  last_grounding_reminder_key: string | null;
  last_breathing_reminder_key: string | null;
  last_sleep_reminder_key: string | null;
  last_habits_reminder_key: string | null;
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
  mood_reminders_enabled: boolean;
  mood_reminder_hour: number;
  mood_reminder_minute: number;
  mood_reminder_timezone: string | null;
  journal_reminders_enabled: boolean;
  journal_reminder_hour: number;
  journal_reminder_minute: number;
  journal_reminder_timezone: string | null;
  gratitude_reminders_enabled: boolean;
  gratitude_reminder_hour: number;
  gratitude_reminder_minute: number;
  gratitude_reminder_timezone: string | null;
  grounding_reminders_enabled: boolean;
  grounding_reminder_hour: number;
  grounding_reminder_minute: number;
  grounding_reminder_timezone: string | null;
  breathing_reminders_enabled: boolean;
  breathing_reminder_hour: number;
  breathing_reminder_minute: number;
  breathing_reminder_timezone: string | null;
  sleep_reminders_enabled: boolean;
  sleep_reminder_hour: number;
  sleep_reminder_minute: number;
  sleep_reminder_timezone: string | null;
  habits_reminders_enabled: boolean;
  habits_reminder_hour: number;
  habits_reminder_minute: number;
  habits_reminder_timezone: string | null;
}

export interface ActivitySource {
  table: string;
  // timestamptz column compared with `>= start-of-today-in-tz`...
  timestampColumn?: string;
  // ...or a `date` column compared with `= today's zoned date string`.
  dateColumn?: string;
}

export interface TargetConfig {
  enabledField: keyof UserPreferenceRow;
  hourField: keyof UserPreferenceRow;
  minuteField: keyof UserPreferenceRow;
  timezoneField: keyof UserPreferenceRow;
  lastKeyField: keyof WebPushSubscriptionRow;
  url: string;
  tag: string;
  // Omitted for targets with no per-day activity log (breathing, act) — those never suppress.
  activitySource?: ActivitySource;
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
    activitySource: { table: "thought_records", timestampColumn: "created_at" },
  },
  meditation: {
    enabledField: "meditation_reminders_enabled",
    hourField: "meditation_reminder_hour",
    minuteField: "meditation_reminder_minute",
    timezoneField: "meditation_reminder_timezone",
    lastKeyField: "last_meditation_reminder_key",
    url: "/tools/meditation",
    tag: "selftend-meditation-reminder",
    activitySource: { table: "meditation_sessions", timestampColumn: "completed_at" },
  },
  act: {
    enabledField: "act_reminders_enabled",
    hourField: "act_reminder_hour",
    minuteField: "act_reminder_minute",
    timezoneField: "act_reminder_timezone",
    lastKeyField: "last_act_reminder_key",
    url: "/modules/act",
    tag: "selftend-act-reminder",
    // No single ACT activity table; act_program_state.updated_at changes for non-activity
    // reasons, so ACT degrades (never suppressed) rather than mis-suppress.
  },
  mood: {
    enabledField: "mood_reminders_enabled",
    hourField: "mood_reminder_hour",
    minuteField: "mood_reminder_minute",
    timezoneField: "mood_reminder_timezone",
    lastKeyField: "last_mood_reminder_key",
    url: "/tools/mood-tracker",
    tag: "selftend-mood-reminder",
    activitySource: { table: "mood_logs", timestampColumn: "logged_at" },
  },
  journal: {
    enabledField: "journal_reminders_enabled",
    hourField: "journal_reminder_hour",
    minuteField: "journal_reminder_minute",
    timezoneField: "journal_reminder_timezone",
    lastKeyField: "last_journal_reminder_key",
    url: "/tools/journal",
    tag: "selftend-journal-reminder",
    activitySource: { table: "journal_entries", timestampColumn: "created_at" },
  },
  gratitude: {
    enabledField: "gratitude_reminders_enabled",
    hourField: "gratitude_reminder_hour",
    minuteField: "gratitude_reminder_minute",
    timezoneField: "gratitude_reminder_timezone",
    lastKeyField: "last_gratitude_reminder_key",
    url: "/tools/gratitude-log",
    tag: "selftend-gratitude-reminder",
    activitySource: { table: "gratitude_entries", timestampColumn: "logged_at" },
  },
  grounding: {
    enabledField: "grounding_reminders_enabled",
    hourField: "grounding_reminder_hour",
    minuteField: "grounding_reminder_minute",
    timezoneField: "grounding_reminder_timezone",
    lastKeyField: "last_grounding_reminder_key",
    url: "/tools/grounding",
    tag: "selftend-grounding-reminder",
    activitySource: { table: "noticing_logs", timestampColumn: "logged_at" },
  },
  breathing: {
    enabledField: "breathing_reminders_enabled",
    hourField: "breathing_reminder_hour",
    minuteField: "breathing_reminder_minute",
    timezoneField: "breathing_reminder_timezone",
    lastKeyField: "last_breathing_reminder_key",
    url: "/tools/breathing",
    tag: "selftend-breathing-reminder",
    // No per-session breathing log → never suppressed.
  },
  sleep: {
    enabledField: "sleep_reminders_enabled",
    hourField: "sleep_reminder_hour",
    minuteField: "sleep_reminder_minute",
    timezoneField: "sleep_reminder_timezone",
    lastKeyField: "last_sleep_reminder_key",
    url: "/tools/sleep",
    tag: "selftend-sleep-reminder",
    activitySource: { table: "sleep_logs", timestampColumn: "logged_at" },
  },
  habits: {
    enabledField: "habits_reminders_enabled",
    hourField: "habits_reminder_hour",
    minuteField: "habits_reminder_minute",
    timezoneField: "habits_reminder_timezone",
    lastKeyField: "last_habits_reminder_key",
    url: "/tools/habits",
    tag: "selftend-habits-reminder",
    activitySource: { table: "habit_logs", dateColumn: "logged_on" },
  },
};

export const TARGETS: ReminderTarget[] = [
  "cbt",
  "meditation",
  "act",
  "mood",
  "journal",
  "gratitude",
  "grounding",
  "breathing",
  "sleep",
  "habits",
];

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

export interface ActivityWindow {
  table: string;
  column: string;
  op: "gte" | "eq";
  value: string;
}

// Describes the "did the user use this tool today, in their timezone?" query for a target,
// or null when the target has no activity source (breathing, act) and so never suppresses.
// Pure + Deno-free so it is unit-tested; index.ts turns it into a supabase query.
export function activityWindowForTarget(
  target: ReminderTarget,
  timeZone: string,
  now: Date,
): ActivityWindow | null {
  const source = TARGET_CONFIGS[target].activitySource;
  if (!source) return null;

  const parts = getZonedParts(now, timeZone);
  if (!parts) return null;

  if (source.dateColumn) {
    return {
      table: source.table,
      column: source.dateColumn,
      op: "eq",
      value: `${parts.year}-${parts.month}-${parts.day}`,
    };
  }

  // The UTC instant of midnight today in `timeZone`: subtract the elapsed zone-local
  // time-of-day from `now`. Seconds/ms are tz-invariant, so getUTC* is correct here.
  const elapsedMs =
    (parts.hour * 60 + parts.minute) * 60000 +
    now.getUTCSeconds() * 1000 +
    now.getUTCMilliseconds();
  const startOfDay = new Date(now.getTime() - elapsedMs);

  return {
    table: source.table,
    column: source.timestampColumn as string,
    op: "gte",
    value: startOfDay.toISOString(),
  };
}

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound: "default";
  data: { url: string };
}

export function buildExpoPushMessage(
  token: string,
  target: ReminderTarget,
  copy: { title: string; body: string },
): ExpoPushMessage {
  return {
    to: token,
    title: copy.title,
    body: copy.body,
    sound: "default",
    data: { url: TARGET_CONFIGS[target].url },
  };
}

export interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

// Acts on the synchronous Expo push *ticket* (not the deferred receipt): DeviceNotRegistered
// means the token is dead and should be deleted; other errors are transient (retry next tick).
export function classifyExpoTicket(ticket: ExpoTicket): { ok: boolean; removeToken: boolean } {
  if (ticket.status === "ok") return { ok: true, removeToken: false };
  return { ok: false, removeToken: ticket.details?.error === "DeviceNotRegistered" };
}

export function resolveReminderLanguage(language: string | null): "bg" | "en" {
  return language?.toLowerCase().startsWith("bg") ? "bg" : "en";
}

// Allowlist of real Web Push service hosts. send-web-reminders runs with the service-role
// key and delivers to web_push_subscriptions.endpoint, but the table's RLS only checks
// user_id - not endpoint - so an authenticated user can upsert an arbitrary endpoint and
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

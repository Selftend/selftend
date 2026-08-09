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
  last_routine_reminder_keys: Record<string, string> | null;
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
  // Optional secondary `nameColumn IN (nameValues)` filter, for tables shared across
  // tools (grounding lives in mindfulness_sessions alongside breathing/meditation,
  // distinguished by exercise_name). Omitted for single-purpose tables.
  nameColumn?: string;
  nameValues?: readonly string[];
}

// Grounding sessions are stored in mindfulness_sessions keyed by exercise_name. Kept in sync
// with src/constants/grounding.ts groundingSlugs (asserted by a parity unit test) so this
// module stays dependency-free for the Deno bundle and Node/jest alike.
export const GROUNDING_EXERCISE_NAMES = ["54321", "cold-water", "feet-floor"] as const;

export interface TargetConfig {
  enabledField: keyof UserPreferenceRow;
  hourField: keyof UserPreferenceRow;
  minuteField: keyof UserPreferenceRow;
  timezoneField: keyof UserPreferenceRow;
  lastKeyField: keyof WebPushSubscriptionRow;
  url: string;
  tag: string;
  // Omitted for targets with no per-day activity log (breathing, act) - those never suppress.
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
    // Do NOT flip this to `/tools/check-in` (#732, decided on #704). The route was renamed;
    // this URL was not. The repo has no OTA channel - no `expo-updates`, no `runtimeVersion` -
    // so every client change is a store release with an unbounded tail of users who never
    // update, and this server is shared by all of them. The old path stays permanently
    // allowlisted in `src/lib/notifications.ts` and permanently served by a `<Redirect>` stub,
    // so minting it works on every build ever shipped; minting the new one would break the tap
    // for anyone who has not updated. `test/check-in-route-compat.test.tsx` guards both sides.
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
    // Grounding logs to mindfulness_sessions (exercise_name in the grounding slugs), not the
    // dropped noticing_logs table. Suppress a grounding reminder when the user completed a
    // grounding exercise today, in their timezone.
    activitySource: {
      table: "mindfulness_sessions",
      timestampColumn: "completed_at",
      nameColumn: "exercise_name",
      nameValues: GROUNDING_EXERCISE_NAMES,
    },
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
  // Optional secondary `inColumn IN (inValues)` filter (see ActivitySource.nameColumn).
  inColumn?: string;
  inValues?: readonly string[];
}

// The UTC instant of local midnight (00:00) on `now`'s civil date in `timeZone`, or null for
// an invalid timezone. A constant-offset estimate (now - elapsed-local-time-of-day) is WRONG
// on DST-transition days because the zone offset changed during the day; re-read the zoned
// clock at the estimate and subtract the residual minute-of-day. One or two corrections
// converge for whole-/half-hour DST shifts (residuals near a full day map to a small signed
// delta so a fall-back estimate that lands at 23:xx the prior day is nudged forward to 00:00).
export function startOfZonedDay(now: Date, timeZone: string): Date | null {
  const initial = getZonedParts(now, timeZone);
  if (!initial) return null;

  let candidate = new Date(
    now.getTime() -
      ((initial.hour * 60 + initial.minute) * 60000 +
        now.getUTCSeconds() * 1000 +
        now.getUTCMilliseconds()),
  );

  for (let i = 0; i < 3; i++) {
    const parts = getZonedParts(candidate, timeZone);
    if (!parts) return null;
    let residualMin = parts.hour * 60 + parts.minute;
    if (residualMin === 0) break;
    if (residualMin > 720) residualMin -= 1440; // closer to midnight from below (prior-day 23:xx)
    candidate = new Date(candidate.getTime() - residualMin * 60000);
  }

  return candidate;
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

  const nameFilter =
    source.nameColumn && source.nameValues
      ? { inColumn: source.nameColumn, inValues: source.nameValues }
      : {};

  if (source.dateColumn) {
    return {
      table: source.table,
      column: source.dateColumn,
      op: "eq",
      value: `${parts.year}-${parts.month}-${parts.day}`,
      ...nameFilter,
    };
  }

  const startOfDay = startOfZonedDay(now, timeZone);
  if (!startOfDay) return null;

  return {
    table: source.table,
    column: source.timestampColumn as string,
    op: "gte",
    value: startOfDay.toISOString(),
    ...nameFilter,
  };
}

// ----- Per-routine reminders (issue #47) -----
//
// Routine reminders are per-ROW (routines.reminder_* fields), unlike the fixed
// per-tool preference columns, so the due/dedup logic generalizes the per-tool
// mechanism: the same 5-minute due window and day-key stamp, but the stamp lives
// in a `{ routineId: 'YYYY-MM-DD' }` jsonb map per delivery-channel row
// (last_routine_reminder_keys), guaranteeing <= 1 notification per routine per
// day per channel. Routines have no server-side activity suppression (deriving
// "routine complete today" would need every step tool's table; like breathing
// and act, they simply never suppress).

/**
 * When a routine runs (#103/#113). Mirrors RoutineCadence in
 * src/features/routines/types.ts — duplicated (like GROUNDING_EXERCISE_NAMES)
 * so this module stays import-free for the Deno bundle. `custom_days` uses JS
 * getDay() numbering (0=Sun..6=Sat), same as habits.
 */
export type RoutineCadence = "daily" | "weekdays" | "custom" | "on-demand";

/**
 * The reminder-relevant slice of a `routines` view row. `name` comes decrypted
 * through the view: the service role holds execute on app.decrypt_text (granted
 * in 20260587 for export_user_data), so the edge function can personalize the
 * notification title with the routine's name.
 *
 * `cadence`/`custom_days` (#113) are optional + nullable so the due-check stays
 * defensive against rows read before the #103 migration (or a SELECT that omits
 * them): a missing cadence is treated as 'daily'.
 */
export interface RoutineReminderRow {
  id: string;
  user_id: string;
  name: string | null;
  reminder_enabled: boolean;
  reminder_hour: number | null;
  reminder_minute: number | null;
  reminder_timezone: string | null;
  cadence?: RoutineCadence | null;
  custom_days?: number[] | null;
}

/** The slice of a delivery-channel row the routine due-check reads. */
export interface RoutineReminderChannel {
  time_zone: string | null;
  last_routine_reminder_keys: Record<string, string> | null;
}

export function routineUrl(routineId: string): string {
  return `/routines/${routineId}`;
}

/** Per-routine notification tag so two routines' notifications never replace each other. */
export function routineTag(routineId: string): string {
  return `selftend-routine-${routineId}-reminder`;
}

/**
 * Notification copy for a routine: the routine's (decrypted-view) name as the
 * title when present, otherwise the static localized fallback. The body always
 * comes from the localized fallback.
 */
export function routineNotificationCopy(
  routine: RoutineReminderRow,
  fallback: { title: string; body: string },
): { title: string; body: string } {
  const name = routine.name?.trim();
  return name ? { title: name, body: fallback.body } : fallback;
}

/**
 * Whether a routine's schedule includes the given local weekday (JS getDay(),
 * 0=Sun..6=Sat). Decided server-side per issue #113: daily → always; weekdays →
 * Mon-Fri; custom → custom_days contains the weekday; on-demand → NEVER (those
 * routines only run manually and never nudge). A missing/unknown cadence is
 * treated as 'daily' so pre-#103-migration rows keep their reminders.
 */
function isRoutineScheduledOn(routine: RoutineReminderRow, weekday: number): boolean {
  switch (routine.cadence) {
    case "on-demand":
      return false;
    case "weekdays":
      return weekday >= 1 && weekday <= 5;
    case "custom":
      return (routine.custom_days ?? []).includes(weekday);
    default:
      return true; // 'daily', or missing/unknown cadence
  }
}

/**
 * Routine analogue of reminderKeyIfDue: today's day key when the routine's
 * reminder is enabled, scheduled today (#113), configured, inside the 5-minute
 * due window, and not yet stamped for this channel today - otherwise null.
 */
export function routineReminderKeyIfDue(
  routine: RoutineReminderRow,
  channel: RoutineReminderChannel,
  now: Date,
): string | null {
  if (!routine.reminder_enabled) return null;
  if (routine.reminder_hour === null || routine.reminder_minute === null) return null;

  // Channel tz takes precedence over the routine's stored tz, then UTC (same
  // precedence as tool reminders).
  const timeZone = channel.time_zone ?? routine.reminder_timezone ?? "UTC";
  const parts = getZonedParts(now, timeZone);
  if (!parts) return null;

  const reminderKey = `${parts.year}-${parts.month}-${parts.day}`;
  if (channel.last_routine_reminder_keys?.[routine.id] === reminderKey) return null;

  // Same hour-boundary-spanning minute-of-day window as reminderKeyIfDue.
  const MINUTES_PER_DAY = 24 * 60;
  const nowMinuteOfDay = parts.hour * 60 + parts.minute;
  const targetMinuteOfDay = routine.reminder_hour * 60 + routine.reminder_minute;
  const minutesSinceTarget =
    (((nowMinuteOfDay - targetMinuteOfDay) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  if (minutesSinceTarget >= 5) return null;

  // Schedule gate (#113): suppress the reminder on days the routine is not
  // scheduled. The weekday is the LOCAL one in the resolved timezone (late-UTC
  // Friday can already be local Saturday), derived from the already-zoned civil
  // date so no second Intl pass is needed. It is the weekday of the TARGET
  // occurrence, not of "now": for target minutes 56-59 the due window spans
  // midnight (that is why the window math wraps mod MINUTES_PER_DAY), so a
  // Friday 23:58 target fires at the Saturday 00:00 cron tick and must be gated
  // as Friday. Inside the window, the target belongs to the previous local day
  // exactly when the raw difference went negative before the mod wrapped it.
  const localWeekday = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
  ).getUTCDay();
  const targetWeekday = nowMinuteOfDay < targetMinuteOfDay ? (localWeekday + 6) % 7 : localWeekday;
  if (!isRoutineScheduledOn(routine, targetWeekday)) return null;

  return reminderKey;
}

/**
 * The next value of a channel's last_routine_reminder_keys map after stamping
 * `routineId` with `reminderKey`. Entries for routines not in `activeRoutineIds`
 * (deleted, or reminder since disabled) are pruned so the map stays bounded.
 */
export function nextRoutineReminderKeys(
  current: Record<string, string> | null,
  routineId: string,
  reminderKey: string,
  activeRoutineIds: Iterable<string>,
): Record<string, string> {
  const active = new Set(activeRoutineIds);
  const next: Record<string, string> = {};
  for (const [id, key] of Object.entries(current ?? {})) {
    if (active.has(id)) next[id] = key;
  }
  next[routineId] = reminderKey;
  return next;
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

export function buildRoutineExpoPushMessage(
  token: string,
  routineId: string,
  copy: { title: string; body: string },
): ExpoPushMessage {
  return {
    to: token,
    title: copy.title,
    body: copy.body,
    sound: "default",
    data: { url: routineUrl(routineId) },
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

// PostgREST caps a single response at ~1000 rows, so an unbounded .select() silently drops
// everyone past the first page (#25). The cron drains a read a page at a time.
export const PAGE_SIZE = 1000;

export interface PagedResult {
  data: unknown[] | null;
  error: unknown;
}

/**
 * The slice of a PostgREST builder the drain needs. Deliberately structural rather
 * than supabase-js's own types: the drain is called with four different row shapes
 * and only ever touches these three methods.
 */
export interface PagedQuery {
  order(column: string, options?: { ascending?: boolean }): PagedQuery;
  gt(column: string, value: unknown): PagedQuery;
  limit(count: number): PromiseLike<PagedResult>;
}

/**
 * Drain a PostgREST read one page at a time, by **keyset** — never by offset.
 *
 * Offsets are not stable against a table being written to, and this cron reads four
 * tables that are written to constantly. Three failure modes, all silent:
 *
 * - **No `ORDER BY` at all** (what shipped): Postgres may return a different physical
 *   order per statement, and does, because an `UPDATE` writes a new heap tuple at the
 *   end of the table. One two-row update between pages pushed two rows past a boundary
 *   — never returned — while two others came back twice (#831).
 * - **`ORDER BY` + `OFFSET`**: ordering fixes the heap-movement case but not the rest.
 *   A row **deleted** before the boundary shifts an unseen row into the previous page's
 *   span, skipping it; a row **inserted** before the boundary pushes one down, repeating
 *   it. Randomly-ordered UUID keys mean an insert lands before the cursor about as often
 *   as after.
 * - **Keyset** (this): each page asks for the rows *after the last key seen*. Inserts
 *   and deletes on either side of the cursor cannot shift the window, because there is
 *   no window — only a position in a total order.
 *
 * For this cron a skipped row means that subscriber gets **no reminder for that run**,
 * silently: nothing is logged and nothing is retried. A repeated row is worse than a
 * wasted read — the row object carries its pre-send reminder stamps, so both copies pass
 * the due check and both send. This is the strategy map #812 settled on (#817).
 *
 * `orderBy` must be a **total** order, so in practice the table's primary key, and the
 * query must select it. It is not always `id`: `user_preferences` is keyed on `user_id`
 * and has no `id` column at all.
 *
 * `buildQuery` is re-invoked per page because a PostgREST builder is single-use; it must
 * return the query *before* `.order()`/`.gt()`/`.limit()`, which is what lets the drain
 * own the walk.
 */
export async function fetchAllPaged(
  orderBy: string,
  buildQuery: () => PagedQuery,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  let cursor: unknown = undefined;

  for (;;) {
    let query = buildQuery().order(orderBy);
    if (cursor !== undefined) query = query.gt(orderBy, cursor);

    const { data, error } = await query.limit(PAGE_SIZE);
    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;

    const last = page[page.length - 1] as Record<string, unknown>;
    const next = last?.[orderBy];
    // A query that does not select its own ordering column would otherwise re-read
    // page one forever. Fail loudly instead: a cron that never terminates is a worse
    // outcome than one that errors, and the drain cannot recover on its own.
    if (next === undefined || next === null) {
      throw new Error(
        `fetchAllPaged: ordering column "${orderBy}" is missing from the selected columns, so the keyset cursor cannot advance`,
      );
    }
    cursor = next;
  }

  return rows;
}

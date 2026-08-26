import i18n from "@/src/i18n";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** `YYYY-MM-DD` for a Date in the viewer's LOCAL timezone. */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * The viewer's IANA time-zone name (`"Europe/Sofia"`), for the server aggregates
 * that have to bucket rows into the same civil days `entryDayKey`/`localDateKey`
 * produce here. A zone name rather than a `getTimezoneOffset()` reading, because
 * only the name lets the server resolve each row's offset at that row's own
 * instant — a single current offset misbuckets everything across a DST boundary.
 *
 * `"UTC"` if the runtime has no zone to report. That is a degraded answer, not a
 * wrong one: it only affects rows whose own offset was never captured, and those
 * rows already have no better truth than the viewer's frame.
 */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * The LOCAL civil date an ISO timestamp falls on, as `YYYY-MM-DD`. Use this to
 * decide which day an entry belongs to, so it matches the date the user sees.
 */
export function toLocalDateKey(iso: string): string {
  return localDateKey(new Date(iso));
}

/** Today's date key in `YYYY-MM-DD`, in the viewer's local timezone. */
export function currentDateKey(): string {
  return localDateKey(new Date());
}

/**
 * The ISO instant of the LOCAL midnight starting the civil month `dateKey`
 * falls in. This is a server-comparable boundary for "this month" windows -
 * `created_at >= monthStartIsoOf(currentDateKey())` counts the rows the viewer
 * would call this month's (#1387).
 */
export function monthStartIsoOf(dateKey: string): string {
  return new Date(`${dateKey.slice(0, 7)}-01T00:00:00`).toISOString();
}

/**
 * The last `count` LOCAL day keys ending on `reference`'s day, oldest first
 * (today last). The shared "last N day keys" helper behind multi-day views
 * like the routines 7-day strip; anchored at local noon so stepping across a
 * DST change can't shift the civil date.
 */
export function lastNDayKeys(count: number, reference: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const day = new Date(reference);
    day.setHours(12, 0, 0, 0);
    day.setDate(day.getDate() - i);
    keys.push(localDateKey(day));
  }
  return keys;
}

/**
 * Parse a `YYYY-MM-DD` key into a Date at LOCAL noon. The `T12:00:00` (no `Z`)
 * suffix avoids DST/midnight rollovers that can shift the civil date by a day.
 */
export function parseLocalNoon(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`);
}

/**
 * Is this a `YYYY-MM-DD` key naming a real calendar day?
 *
 * For day keys that arrive from OUTSIDE the app - a route param, a deep link -
 * where the rest of the day-key helpers assume a well-formed one. An invalid
 * `Date` reaching `Intl.DateTimeFormat.format` throws a `RangeError`, which on
 * a screen means a crash rather than an error state; the same unchecked value
 * would also ride into a Supabase range filter.
 *
 * The round-trip through `localDateKey` is what rejects a well-shaped
 * impossible day: `new Date("2026-02-31T12:00:00")` rolls forward to 3 March
 * rather than failing, so the regex alone would pass it through.
 */
export function isValidDayKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseLocalNoon(value);
  return !Number.isNaN(parsed.getTime()) && localDateKey(parsed) === value;
}

// ── Day-key arithmetic ─────────────────────────────────────────────────────
// Day-scoped surfaces bucket entries by the civil day captured at logging time
// (`entryDayKey`), so their windows have to be walked in day keys too. Doing it
// in timestamps instead is what let a log count toward the "7-day average"
// while bucketing outside the 7 columns drawn above it (#250).

/** The day key `delta` days from `dateKey`. Noon-anchored, so DST cannot shift it. */
export function addDaysToKey(dateKey: string, delta: number): string {
  const day = parseLocalNoon(dateKey);
  day.setDate(day.getDate() + delta);
  return localDateKey(day);
}

/** The `count` day keys ending on `endKey`, oldest first. */
export function lastNDayKeysEndingAt(count: number, endKey: string): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) keys.push(addDaysToKey(endKey, -i));
  return keys;
}

/** The later of two day keys. `YYYY-MM-DD` sorts lexicographically, so this is a plain compare. */
export function maxDayKey(a: string, b: string): string {
  return a >= b ? a : b;
}

/**
 * The day key of the Monday on or before `dateKey`.
 *
 * Weeks start Monday everywhere in the app — the mood heatmap's columns and the
 * history screen's "Earlier this week"/"Last week" groups have to agree, or the
 * same entry sits in different weeks on two surfaces of the same tool.
 */
export function mondayKeyOf(dateKey: string): string {
  const day = parseLocalNoon(dateKey);
  return addDaysToKey(dateKey, -((day.getDay() + 6) % 7));
}

/** Whole days from `fromKey` to `toKey`; negative when `toKey` is earlier. */
export function dayKeyDiff(fromKey: string, toKey: string): number {
  return calendarDayDiff(parseLocalNoon(fromKey), parseLocalNoon(toKey));
}

/**
 * The last day a day-scoped range should cover: today, or a later day the user
 * already holds an entry on. Flying east-to-west leaves you holding an entry
 * keyed "tomorrow" relative to where you landed; clamping the range at today
 * would drop it from every chart and strip, which is the very "travel omits
 * entries" failure this work exists to remove (#250).
 */
export function dayRangeEndKey(dayKeys: Iterable<string>, now: Date = new Date()): string {
  let end = localDateKey(now);
  // A malformed key must not become the range end: every downstream day is
  // derived from it, so one bad row would otherwise blank the whole surface.
  for (const key of dayKeys) if (typeof key === "string" && key !== "") end = maxDayKey(end, key);
  return end;
}

// Format with the app's selected language (en/bg), not the device locale - the user
// picks the in-app language independently of the OS. Falls back to the device locale
// if i18n hasn't initialized.
export function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(i18n.language || undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * A `YYYY-MM-DD` day key as a sentence-ready date — `Tue, Sep 1, 2026`.
 *
 * For the day a user PICKED rather than a moment something happened: the CBT
 * goal target date and ACT's committed-action date. A day key names a civil day
 * and carries no instant, so there is no captured offset to honour here; the
 * noon anchoring is what keeps the rendered day equal to the key across DST.
 *
 * The weekday is part of the shape on purpose — a target date is something the
 * user plans around, and "Tue" is the half of it they act on.
 *
 * ⚠️ Fenced to those two surfaces. The other `parseLocalNoon` callers
 * (`insights.ts`, `history-groups.ts`) render denser formats deliberately, and
 * this must not be retrofitted onto them.
 */
export function formatDayKey(dateKey: string, lang: string = i18n.language): string {
  const date = parseLocalNoon(dateKey);
  if (Number.isNaN(date.getTime())) return dateKey;
  return new Intl.DateTimeFormat(lang || undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * A calendar day spelled out in full, for a screen reader rather than the eye:
 * "Monday, 8 September 2026".
 *
 * A sibling of `formatDayKey` rather than an option on it, because the two
 * serve opposite constraints. The visible trigger wants the SHORT form — it
 * sits in a field and the width is measured (#1231). An accessible name has no
 * width, and abbreviations are exactly what makes a date picker unusable by
 * ear: "Mon, 8 Sep 2026" is read out as a string of fragments.
 *
 * ⚠️ Fenced to the calendar grid's day labels (#1301). Nothing visible should
 * render this — a long date in a 42-cell grid is not a layout anyone wants.
 */
export function formatCalendarDayName(date: Date, lang: string = i18n.language): string {
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(lang || undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * An entry's timestamp rendered at the UTC offset captured with it, so it reads
 * as the time the user actually logged it — and agrees with the civil day it is
 * filed under. Showing a Tokyo 23:30 check-in as "14:30" under a heading for the
 * following day is the contradiction this avoids (#250).
 *
 * `null` (offset never captured) falls back to the viewer's zone, matching how
 * such entries are bucketed. Formats via a shifted instant read as UTC, because
 * Hermes' `Intl` does not accept a numeric offset as a `timeZone`.
 */
export function formatAtOffset(
  value: string,
  offsetMinutes: number | null,
  lang: string = i18n.language,
): string {
  return formatInstantAtOffset(
    value,
    offsetMinutes,
    { dateStyle: "medium", timeStyle: "short" },
    lang,
  );
}

/**
 * `formatAtOffset` with the caller choosing the Intl components.
 *
 * The captured-frame shift is the part that must not be re-invented — a surface
 * that wants only a time, or a weekday and a time, still has to read it in the
 * frame the entry was logged in. The all-history screen needs three different
 * shapes (time / weekday + time / date) depending on which group a row is in,
 * so the options are a parameter rather than three near-identical helpers.
 */
export function formatInstantAtOffset(
  value: string,
  offsetMinutes: number | null,
  options: Intl.DateTimeFormatOptions,
  lang: string = i18n.language,
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const known = offsetMinutes !== null && Number.isFinite(offsetMinutes);
  return new Intl.DateTimeFormat(lang || undefined, {
    ...options,
    ...(known ? { timeZone: "UTC" } : {}),
  }).format(known ? new Date(date.getTime() + offsetMinutes! * 60_000) : date);
}

/**
 * The compact "when" for stats and rows — `last logged 4:50 pm`, not
 * `last logged Aug 11, 2026, 4:00 PM` (#870). The shape follows how far back
 * the entry's CAPTURED civil day sits from the viewer's today:
 *
 * - today (or later — travel can leave a "tomorrow" entry): the time, `4:50 pm`
 * - within the last week: `Wed 7:40 pm` — a weekday is unambiguous under 7 days
 * - older: the date, `Jul 27`, gaining its year only when it isn't this year
 *
 * The same three shapes the all-history screens already render per group
 * (`history-groups.ts`), read in the entry's captured offset like every other
 * entry timestamp so the label agrees with the day the entry is filed under.
 */
export function formatCompactAtOffset(
  value: string,
  offsetMinutes: number | null,
  lang: string = i18n.language,
  now: Date = new Date(),
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const known = offsetMinutes !== null && Number.isFinite(offsetMinutes);
  // The captured-frame civil day, matching how the entry's dayKey was stamped:
  // shift by the captured offset and read the UTC calendar fields.
  const framed = known ? new Date(date.getTime() + offsetMinutes! * 60_000) : date;
  const dayKey = known
    ? `${framed.getUTCFullYear()}-${pad(framed.getUTCMonth() + 1)}-${pad(framed.getUTCDate())}`
    : localDateKey(framed);
  const todayKey = localDateKey(now);
  const daysAgo = dayKeyDiff(dayKey, todayKey);
  const options: Intl.DateTimeFormatOptions =
    daysAgo <= 0
      ? { hour: "numeric", minute: "2-digit" }
      : daysAgo < 7
        ? { weekday: "short", hour: "numeric", minute: "2-digit" }
        : dayKey.slice(0, 4) === todayKey.slice(0, 4)
          ? { day: "numeric", month: "short" }
          : { day: "numeric", month: "short", year: "numeric" };
  return formatInstantAtOffset(value, offsetMinutes, options, lang);
}

/**
 * A Date whose *device-local* wall clock reads as the wall clock at
 * `offsetMinutes` — the trick that lets a device-frame date picker edit in a
 * captured frame. `shiftToOffsetFrame`/`shiftFromOffsetFrame` are inverses.
 */
export function shiftToOffsetFrame(value: Date, offsetMinutes: number): Date {
  // Two passes, because the device offset has to be read at the SHIFTED instant,
  // not the source one. The shift can cross a device-zone DST boundary, and then
  // the source offset is the wrong one: under America/New_York, shifting
  // 2026-03-08T06:30:00Z (EST, -300) into offset 0 lands at 11:30Z, which is
  // already EDT (-240), so a single pass displays 07:30 instead of 06:30 and
  // `shiftFromOffsetFrame` no longer inverts it. The second pass re-resolves
  // against the instant we actually land on.
  //
  // The inverse needs no such pass: its input is already in the device frame, so
  // its own offset is the one to use.
  const firstPass = new Date(
    value.getTime() + (offsetMinutes + value.getTimezoneOffset()) * 60_000,
  );
  return new Date(value.getTime() + (offsetMinutes + firstPass.getTimezoneOffset()) * 60_000);
}

export function shiftFromOffsetFrame(displayed: Date, offsetMinutes: number): Date {
  return new Date(displayed.getTime() - (offsetMinutes + displayed.getTimezoneOffset()) * 60_000);
}

export function calendarDayDiff(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function startOfDayDaysAgo(days: number, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

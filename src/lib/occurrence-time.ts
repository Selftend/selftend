import { localDateKey } from "@/src/utils/date";

export interface OccurrenceTime {
  occurredAt: string;
  /** Minutes east of UTC at the place/device where the user chose the time. */
  occurredOffsetMinutes: number;
}

/**
 * Minutes east of UTC captured with an occurrence, or `null` when it was never
 * recorded — legacy rows, and writes from clients predating the column. Null
 * means "unknown", never "UTC"; see 20260726_occurrence_offset_nullable.
 */
export type CapturedOffsetMinutes = number | null;

const MIN_OFFSET_MINUTES = -14 * 60;
const MAX_OFFSET_MINUTES = 14 * 60;

export function occurrenceTimeFromDate(date: Date = new Date()): OccurrenceTime {
  if (Number.isNaN(date.getTime())) throw new Error("Occurrence time must be a valid date");

  return {
    occurredAt: date.toISOString(),
    occurredOffsetMinutes: -date.getTimezoneOffset(),
  };
}

export function validateOccurrenceTime(
  value: OccurrenceTime,
  now: Date = new Date(),
): OccurrenceTime {
  const occurred = new Date(value.occurredAt);
  if (Number.isNaN(occurred.getTime())) throw new Error("Occurrence time must be a valid date");
  if (occurred.getTime() > now.getTime())
    throw new Error("Occurrence time cannot be in the future");
  if (
    !Number.isInteger(value.occurredOffsetMinutes) ||
    value.occurredOffsetMinutes < MIN_OFFSET_MINUTES ||
    value.occurredOffsetMinutes > MAX_OFFSET_MINUTES
  ) {
    throw new Error("Occurrence UTC offset is invalid");
  }

  return { occurredAt: occurred.toISOString(), occurredOffsetMinutes: value.occurredOffsetMinutes };
}

function dateKeyAtOffset(occurredAt: string, offsetMinutes: number): string {
  return new Date(new Date(occurredAt).getTime() + offsetMinutes * 60_000)
    .toISOString()
    .slice(0, 10);
}

/** Local calendar key at the offset captured with the occurrence, independent of current travel. */
export function occurrenceDateKey(value: OccurrenceTime): string {
  const normalized = validateOccurrenceTime(value, new Date(8.64e15));
  return dateKeyAtOffset(normalized.occurredAt, normalized.occurredOffsetMinutes);
}

/**
 * The civil day an entry belongs to, as `YYYY-MM-DD` — the calendar day it was
 * at the place it was logged, so travel can never move an entry to another day.
 *
 * When the offset was never captured this falls back to the viewer's local day,
 * which is precisely where such entries have always rendered: a fallback, not a
 * guess that UTC was meant. Total by design — it runs while rendering lists, so
 * malformed input degrades exactly as `toLocalDateKey` always has rather than
 * throwing partway through a screen. Use `validateOccurrenceTime` on the write
 * path, where rejecting bad input is the point.
 */
export function entryDayKey(occurredAt: string, offsetMinutes: CapturedOffsetMinutes): string {
  const date = new Date(occurredAt);
  // `toISOString` throws on an invalid Date, and this runs mid-render over whole
  // lists - degrade like `toLocalDateKey` always has instead of blanking a screen.
  if (offsetMinutes === null || !Number.isFinite(offsetMinutes) || Number.isNaN(date.getTime())) {
    return localDateKey(date);
  }
  return dateKeyAtOffset(occurredAt, offsetMinutes);
}

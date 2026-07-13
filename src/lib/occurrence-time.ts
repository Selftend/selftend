export interface OccurrenceTime {
  occurredAt: string;
  /** Minutes east of UTC at the place/device where the user chose the time. */
  occurredOffsetMinutes: number;
}

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

/** Local calendar key at the offset captured with the occurrence, independent of current travel. */
export function occurrenceDateKey(value: OccurrenceTime): string {
  const normalized = validateOccurrenceTime(value, new Date(8.64e15));
  return new Date(
    new Date(normalized.occurredAt).getTime() + normalized.occurredOffsetMinutes * 60_000,
  )
    .toISOString()
    .slice(0, 10);
}

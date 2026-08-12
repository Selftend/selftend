/** Stable keyset for records ordered newest-first by timestamp and id. */
export interface RecordCursor {
  timestamp: string;
  id: string;
}

/**
 * Builds the inside of a PostgREST `or=(...)` filter for a descending page.
 *
 * Values come from database rows, but validate their narrow shapes before
 * interpolating them into PostgREST grammar. The current Supabase client owns
 * URL encoding; pre-encoding here double-encodes `%` and makes timestamps fail.
 */
function cursorFilter(
  timestampColumn: string,
  cursor: RecordCursor,
  comparison: "lt" | "gt",
): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(timestampColumn)) {
    throw new Error("Invalid cursor column");
  }

  if (Number.isNaN(Date.parse(cursor.timestamp))) {
    throw new Error("Invalid cursor timestamp");
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cursor.id)
  ) {
    throw new Error("Invalid cursor id");
  }
  return `${timestampColumn}.${comparison}.\"${cursor.timestamp}\",and(${timestampColumn}.eq.\"${cursor.timestamp}\",id.${comparison}.\"${cursor.id}\")`;
}

export function descendingCursorFilter(timestampColumn: string, cursor: RecordCursor): string {
  return cursorFilter(timestampColumn, cursor, "lt");
}

/** Stable keyset predicate for the rarer oldest-first drain. */
export function ascendingCursorFilter(timestampColumn: string, cursor: RecordCursor): string {
  return cursorFilter(timestampColumn, cursor, "gt");
}

/** The last row is the exclusive boundary for the next descending page. */
export function nextDescendingCursor<T extends { id: string }>(
  page: T[],
  timestamp: (row: T) => string,
): RecordCursor | undefined {
  const last = page.at(-1);
  return last ? { timestamp: timestamp(last), id: last.id } : undefined;
}

/**
 * Keyset for records ordered newest-first by a calendar day, then a timestamp,
 * then id — sleep's `entry_day, created_at, id` ordering (#800), where a user
 * back-filling an older day writes a row whose creation time alone would file
 * it under the wrong day.
 */
export interface DayRecordCursor {
  day: string;
  timestamp: string;
  id: string;
}

/** Three-level descending keyset predicate for a PostgREST `or=(...)` filter. */
export function descendingDayCursorFilter(
  dayColumn: string,
  timestampColumn: string,
  cursor: DayRecordCursor,
): string {
  for (const column of [dayColumn, timestampColumn]) {
    if (!/^[a-z_][a-z0-9_]*$/.test(column)) throw new Error("Invalid cursor column");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cursor.day)) throw new Error("Invalid cursor day");
  if (Number.isNaN(Date.parse(cursor.timestamp))) throw new Error("Invalid cursor timestamp");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cursor.id)
  ) {
    throw new Error("Invalid cursor id");
  }
  return (
    `${dayColumn}.lt.\"${cursor.day}\",` +
    `and(${dayColumn}.eq.\"${cursor.day}\",${timestampColumn}.lt.\"${cursor.timestamp}\"),` +
    `and(${dayColumn}.eq.\"${cursor.day}\",${timestampColumn}.eq.\"${cursor.timestamp}\",id.lt.\"${cursor.id}\")`
  );
}

/** The last row is the exclusive boundary for the next descending day-ordered page. */
export function nextDescendingDayCursor<T extends { id: string }>(
  page: T[],
  day: (row: T) => string,
  timestamp: (row: T) => string,
): DayRecordCursor | undefined {
  const last = page.at(-1);
  return last ? { day: day(last), timestamp: timestamp(last), id: last.id } : undefined;
}

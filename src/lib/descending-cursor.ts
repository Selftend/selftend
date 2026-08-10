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

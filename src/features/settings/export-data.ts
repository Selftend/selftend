/**
 * File name for a data export, e.g. `selftend-export-2026-07-11.json`.
 * `dateKey` is a `YYYY-MM-DD` day key (see `currentDateKey`).
 */
export function buildExportFileName(dateKey: string): string {
  return `selftend-export-${dateKey}.json`;
}

/** Pretty-print exported data as 2-space-indented JSON. */
export function serializeExport(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

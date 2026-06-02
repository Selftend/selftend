// The date bar appears only on day-scoped screens - ones that show or capture
// entries *for the selected day*. Every screen listed here MUST read
// `useSelectedDate()` and filter its content by it, or the bar would be inert.
//
// Intentionally excluded (no date bar): persistent "structure" screens that are
// not single-day views - Goals, Values, Core beliefs, Behavioural activation
// (activities), Exposure hierarchies, and Procrastination tasks. These manage
// long-lived records, so a per-day filter would not make sense.
//
// Per-entry detail/edit routes are also excluded - they show one entry with its
// own date.
const DATED_EXACT = new Set<string>([
  "/",
  "/modules/act",
  "/modules/act/defusion",
  "/modules/act/expansion",
  "/modules/act/connection",
  "/modules/act/observing-self",
  "/modules/act/choice-point",
  "/modules/cbt",
  "/tools/mood-tracker",
  "/tools/mood-tracker/new",
  "/tools/sleep",
  "/tools/sleep/new",
  "/tools/gratitude-log",
  "/tools/gratitude-log/new",
  "/tools/gratitude-log/entries",
  "/tools/journal",
  "/tools/journal/new",
  "/tools/habits",
  "/modules/cbt/self-care",
  "/modules/cbt/new",
  "/modules/cbt/history",
  "/modules/cbt/anger",
  "/modules/cbt/anger/new",
  "/modules/cbt/worry",
  "/modules/cbt/worry/new",
]);

// Dynamic dated routes (regex): the per-day habit log screen.
const DATED_PATTERNS: RegExp[] = [/^\/tools\/habits\/[^/]+\/log$/];

export function isDatedRoute(pathname: string): boolean {
  if (DATED_EXACT.has(pathname)) return true;
  return DATED_PATTERNS.some((re) => re.test(pathname));
}

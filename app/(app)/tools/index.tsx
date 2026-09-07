import { Redirect } from "expo-router";

/**
 * `/tools` stops being a page (#2114). The screen it headed listed the eight tools
 * over a description; Home lists the same eight through the same card (#1955), beside
 * the three modules and above Favourites — so the page was a subset of Home rather
 * than a different view of it, and deleting it removes a second place to keep in step.
 *
 * The file survives its screen because `tools` is still a real route DIRECTORY: every
 * tool lives under it, and a `/tools` that matched nothing would render `+not-found`
 * for a bookmark, a typed URL or an old share link. It lands on Home instead, which is
 * where the page's content now is.
 *
 * ☠️ No deeper URL moves. `/tools/mood-tracker` in particular is frozen in
 * `ALLOWED_REMINDER_ROUTES` (`src/lib/notifications.ts`) forever — the repo has no OTA
 * channel, so a reminder scheduled by an installed build outlives any route rename.
 *
 * The segment is transparent in the trail (`src/lib/breadcrumbs.ts`, #2096), so no
 * crumb names this stub as an ancestor and no Escape hops into it.
 */
export default function ToolsIndexRedirect() {
  return <Redirect href="/" />;
}

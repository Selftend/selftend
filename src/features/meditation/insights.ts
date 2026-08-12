import type { MeditationObstacleTag } from "@/src/features/meditation/types";

/** How many obstacle rows the card shows - the most-tagged few, not a league table. */
const TOP_OBSTACLES = 3;

/** The shape the card reduces over - the minutes-window rows, not full sessions. */
export interface WindowSit {
  dayKey: string;
  durationMinutes: number;
  obstacleTags: MeditationObstacleTag[];
}

export interface MeditationWindowInsights {
  /** Sits whose captured day falls inside the window. */
  sessionCount: number;
  totalMinutes: number;
  /** Most-tagged obstacles in the window, count descending. At most three. */
  topObstacles: { tag: MeditationObstacleTag; count: number }[];
}

/**
 * What the window held, plainly (#853).
 *
 * This replaced `computeMeditationInsights`, whose mood average and
 * mind-wandering trend read fields the redesigned reflection (#786) no longer
 * collects - they would have gone null for all new activity. Everything here
 * reduces over inputs that still accrue, and nothing compares one window to
 * another: the card is informational, not evaluative.
 *
 * Rows are filtered by the same day keys the minutes chart draws, so the two
 * surfaces never disagree about what "the last thirty days" contains - the
 * query behind them is padded a day wider than the window on purpose.
 */
export function computeWindowInsights(
  sits: readonly WindowSit[],
  windowDayKeys: readonly string[],
): MeditationWindowInsights {
  const inWindow = new Set(windowDayKeys);
  const rows = sits.filter((sit) => inWindow.has(sit.dayKey));

  const totalMinutes = rows.reduce((sum, sit) => sum + sit.durationMinutes, 0);

  const counts = new Map<MeditationObstacleTag, number>();
  for (const sit of rows) {
    for (const tag of sit.obstacleTags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const topObstacles = Array.from(counts, ([tag, count]) => ({ tag, count }))
    // Count descending; ties break alphabetically so the order is stable
    // between renders rather than following Map insertion order.
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, TOP_OBSTACLES);

  return { sessionCount: rows.length, totalMinutes, topObstacles };
}

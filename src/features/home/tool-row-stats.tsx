import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import type { ToolKey } from "@/src/features/favorites/items";
import { formatOneDecimal } from "@/src/lib/locale-format";
import { formatHours } from "@/src/features/sleep/format";
import { formatCompactAtOffset } from "@/src/utils/date";
import { roundTo1 } from "@/src/utils/number";

import { useHomeToolStats } from "@/src/features/home/tool-stats-queries";

/**
 * The stat line of the tool card (#975, S5a; rekeyed onto the favourites card by #1955).
 *
 * Two rules govern every stat here, and they are what keep home and the tool from
 * drifting:
 *
 * 1. **A stat quotes its tool and never invents a number.** Only figures the destination's
 *    own header already renders, from the same source. Since #2212 the eight stats
 *    arrive together from ONE query, `useHomeToolStats` - the `home_tool_stats` RPC
 *    calls each tool's own aggregate (`sleep_stats`, `journal_word_total`,
 *    `meditation_median_minutes`, `breathing_total_minutes`) and restates only the
 *    head counts, and an integration test pins every leg to the tool's own read. The
 *    hooks below take the figures and do what they always did: the rounding
 *    (`Math.round` / `roundTo1`, ADR-0001) and the wording. Before #2212 each stat
 *    mounted the cache entries its tool mounts, which cost Home fifteen requests for
 *    everyone; a stat may not go back to mounting its own query.
 * 2. **A catalogue constant is not a stat.** Grounding's "8 techniques" and meditation's
 *    "Stage N" are product-authored, so a tool's *first* header stat is sometimes the
 *    wrong one to quote. There is no mechanical "first two" rule.
 *
 * Grammar: `stat := clause ( " · " clause )?`. Two clauses is a **cap, not a target** — a
 * third overruns the 390dp frame's line in Bulgarian. Every windowed number names its
 * window; every lifetime number names none.
 *
 * Three states, not two:
 * - **loading** → `null`, an empty slot. Never a dash, never a skeleton. A loading surface
 *   never claims emptiness, and `undefined` from the query means "not loaded" — which
 *   includes a failed fetch with no cache, where "Nothing yet" would erase a real history.
 * - **loaded and empty** → the shared `home.rows.empty`. One key for every tool: the card's
 *   own name already supplies the noun.
 * - **nothing scheduled today** → its own string. A user with seven habits and none due
 *   has a full record and an empty day; those are different facts.
 *
 * `home.rows.*` keeps that path in navigation.json although the rows are gone (#1959):
 * every namespace is Weblate-tracked, so renaming the block would present its strings as
 * new and orphan the Bulgarian. Same ruling as `home.widgets.*` in snapshot-builder.ts.
 */

/**
 * A stat, resolved: `null` is the loading/empty slot (see the three states above), a
 * string is the line to draw.
 *
 * Each tool's figure is a HOOK, and `ToolStat` is the one component that draws it, keyed
 * by tool key (#1955). The widget-id-keyed Home rows that used to share these hooks went
 * with the dashboard (#1959). "No second stat implementation may exist" is the rule —
 * `/tools`' competing `statFor` was wrong three ways (claimed emptiness while loading,
 * capped a 7-day summary at 30 rows against ADR-0001, labelled a trailing window "this
 * week") and is gone.
 */
type StatHook = (userId: string | null) => string | null;

/**
 * Joins the row's clauses with the design's separator.
 *
 * Exactly two parameters, so the "two clauses is a cap, not a target" rule is enforced
 * by the type checker rather than by a runtime `slice` no test could ever reach. A third
 * clause overruns the 390dp frame's line in Bulgarian; adding one has to be a deliberate
 * edit here, not an extra argument that silently vanishes.
 */
function joinClauses(first: string | null, second: string | null): string | null {
  const kept = [first, second].filter((clause): clause is string => clause !== null);
  return kept.length > 0 ? kept.join(" · ") : null;
}

const emptyStat = (t: TFunction) => t("home.rows.empty");

// --- 1. mood-checkin -------------------------------------------------------
// The two clauses use DIFFERENT windows on purpose: `this week` is a calendar Mon-Sun
// week (#697 decided that deliberately, against a trailing one) and `7-day average` is
// trailing. Both are labelled, so both are honest; "harmonising" them reverts #697.
export function useMoodStat(userId: string | null): string | null {
  const { t, i18n } = useTranslation("navigation");
  /**
   * ADR-0001: neither clause may come from a capped list. The RPC counts the calendar
   * week and averages the trailing seven days over the same fortnight `useMoodWeek`
   * fetches, uncapped by row count, and the lifetime count is exact.
   *
   * Emptiness is the exact lifetime count, not "nothing in the window": a user whose
   * last check-in was ten days ago has a record, and `0 this week` is the honest clause
   * for them.
   */
  const { data } = useHomeToolStats(userId);
  const mood = data?.mood;

  let stat: string | null = null;
  if (mood !== undefined) {
    // `roundTo1` here, as `getMoodSummary` always applied it; the RPC hands back the
    // exact mean (ADR-0001's rounding rule).
    const average = mood.avg7 === null ? null : roundTo1(mood.avg7);
    stat =
      mood.lifetimeCount === 0
        ? emptyStat(t)
        : joinClauses(
            t("home.rows.thisWeek", { value: mood.thisWeekCount }),
            average === null
              ? null
              : t("home.rows.avg7", {
                  value: formatOneDecimal(average, i18n.language),
                }),
          );
  }
  return stat;
}

// --- 2. journal-week -------------------------------------------------------
// Lifetime figures, matching the journal hero: the id says "week", the tool does not.
export function useJournalStat(userId: string | null): string | null {
  const { t } = useTranslation("navigation");
  const { data } = useHomeToolStats(userId);
  const journal = data?.journal;

  let stat: string | null = null;
  if (journal !== undefined) {
    stat =
      journal.entries === 0
        ? emptyStat(t)
        : joinClauses(
            t("home.rows.entries", { count: journal.entries }),
            t("home.rows.words", { count: journal.words }),
          );
  }
  return stat;
}

// --- 3. gratitude-latest ---------------------------------------------------
// The week clause counts since the Monday of the day Home describes, by each entry's
// own captured civil day - the same rule `countGratitudeEntriesSinceDayKey` applies.
export function useGratitudeStat(userId: string | null): string | null {
  const { t } = useTranslation("navigation");
  const { data } = useHomeToolStats(userId);
  const gratitude = data?.gratitude;

  let stat: string | null = null;
  if (gratitude !== undefined) {
    stat =
      gratitude.entries === 0
        ? emptyStat(t)
        : joinClauses(
            t("home.rows.entries", { count: gratitude.entries }),
            t("home.rows.thisWeek", { value: gratitude.thisWeek }),
          );
  }
  return stat;
}

// --- 4. breathing-suggested ------------------------------------------------
export function useBreathingStat(userId: string | null): string | null {
  const { t } = useTranslation("navigation");
  const { data } = useHomeToolStats(userId);
  const breathing = data?.breathing;

  let stat: string | null = null;
  if (breathing !== undefined) {
    stat =
      breathing.sessions === 0
        ? emptyStat(t)
        : joinClauses(
            t("home.rows.sessions", { count: breathing.sessions }),
            t("home.rows.minutes", { count: breathing.minutes }),
          );
  }
  return stat;
}

// --- 5. grounding-log ------------------------------------------------------
// Recency is the newest session's own captured instant. `formatCompactAtOffset` never
// renders "N days ago": a column of `23 days ago · 41 days ago` implies lateness, and
// home does not tally days since you last opened a tool.
export function useGroundingStat(userId: string | null): string | null {
  const { t, i18n } = useTranslation("navigation");
  const { data } = useHomeToolStats(userId);
  const grounding = data?.grounding;

  let stat: string | null = null;
  if (grounding !== undefined) {
    stat =
      grounding.sessions === 0
        ? emptyStat(t)
        : joinClauses(
            t("home.rows.sessions", { count: grounding.sessions }),
            grounding.lastCompletedAt
              ? t("home.rows.last", {
                  when: formatCompactAtOffset(
                    grounding.lastCompletedAt,
                    grounding.lastCompletedOffsetMinutes,
                    i18n.language,
                  ),
                })
              : null,
          );
  }
  return stat;
}

// --- 6. meditation-pick ----------------------------------------------------
// ☠️ The design's drawn "30 sessions · 551 minutes" was the 30-row cache cap times a
// sum capped the same way. The sits figure is a real uncapped count, and the companion
// figure is the server's median, not a client sum.
export function useMeditationStat(userId: string | null): string | null {
  const { t } = useTranslation("navigation");
  const { data } = useHomeToolStats(userId);
  const meditation = data?.meditation;

  let stat: string | null = null;
  if (meditation !== undefined) {
    // `Math.round` here, as `medianMeditationMinutes` always applied it: the RPC hands
    // back the exact percentile so a `.5` tie rounds the way it always did (ADR-0001).
    const median = meditation.medianMinutes === null ? null : Math.round(meditation.medianMinutes);
    stat =
      meditation.sits === 0
        ? emptyStat(t)
        : joinClauses(
            t("home.rows.sits", { count: meditation.sits }),
            // null means no sessions at all, which the sits clause already said.
            median === null ? null : t("home.rows.typicalMinutes", { value: median }),
          );
  }
  return stat;
}

// --- 7. sleep-latest -------------------------------------------------------
// The RPC hands `sleep_stats` the viewer's zone, so the aggregate is windowed in the
// viewer's civil days. Duration comes back in MINUTES; `formatHours` does the /60 and
// the locale-aware decimal (#962).
export function useSleepStat(userId: string | null): string | null {
  const { t, i18n } = useTranslation("navigation");
  const { data } = useHomeToolStats(userId);
  const sleep = data?.sleep;

  let stat: string | null = null;
  if (sleep !== undefined) {
    // The same rounding `sleepStats()` in the sleep repository applies to these two
    // figures: `Math.round` on the minutes, `roundTo1` on the quality. `null` is a real
    // loaded value here, and it means the user has no nights rather than none loaded.
    const sevenDay =
      sleep.avgDurationMinutes7 === null ? null : Math.round(sleep.avgDurationMinutes7);
    const quality = sleep.avgQuality7 === null ? null : roundTo1(sleep.avgQuality7);
    stat =
      sevenDay === null && quality === null
        ? emptyStat(t)
        : joinClauses(
            sevenDay === null
              ? null
              : t("home.rows.avg7", { value: formatHours(sevenDay, i18n.language, t) }),
            quality === null
              ? null
              : t("home.rows.quality", { value: formatOneDecimal(quality, i18n.language) }),
          );
  }
  return stat;
}

// --- 8. habits-today -------------------------------------------------------
// ☠️ The id maps to `ActivitiesWidget` today, which reads CBT behavioural-activation
// data and no habit data at all. This row reads HABITS, which is what its name has
// always promised. CBT activities keep their own row in S5b, so nothing is lost.
//
// Uncapped: the fraction is over every habit due today, not a page of them. The RPC
// applies `isScheduledOn` and `isTickedOn` to the day Home describes.
export function useHabitsStat(userId: string | null): string | null {
  const { t } = useTranslation("navigation");
  const { data } = useHomeToolStats(userId);
  const habits = data?.habits;

  let stat: string | null = null;
  if (habits !== undefined) {
    stat =
      habits.active === 0
        ? emptyStat(t)
        : habits.dueToday === 0
          ? t("home.rows.nothingScheduled")
          : t("home.rows.doneToday", { done: habits.doneToday, total: habits.dueToday });
  }
  return stat;
}

/** The eight tool stats, keyed by TOOL KEY — the favourites card's lookup (#1955). */
const TOOL_STAT_HOOKS: Record<ToolKey, StatHook> = {
  mood: useMoodStat,
  journal: useJournalStat,
  gratitude: useGratitudeStat,
  breathing: useBreathingStat,
  grounding: useGroundingStat,
  meditation: useMeditationStat,
  sleep: useSleepStat,
  habits: useHabitsStat,
};

/**
 * The card's "what you have" line. Renders NOTHING (not an empty node, not a dash) until
 * the stat resolves — a loading surface never claims emptiness, and `null` from the hook
 * is exactly that state.
 *
 * `toolKey` never changes for a mounted card, so the hook picked from the table is
 * stable for the component's lifetime and the rules of hooks hold.
 */
export function ToolStat({ toolKey, userId }: { toolKey: ToolKey; userId: string | null }) {
  const useStat = TOOL_STAT_HOOKS[toolKey];
  const stat = useStat(userId);
  if (stat === null) return null;
  return (
    <Text variant="muted" testID={`card-stat-tool-${toolKey}`} className="mt-0.5 text-xs">
      {stat}
    </Text>
  );
}

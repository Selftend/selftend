import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import type { ToolKey } from "@/src/features/favorites/items";
import { formatOneDecimal } from "@/src/lib/locale-format";
import { formatHours } from "@/src/features/sleep/format";
import { addDaysToKey, formatCompactAtOffset, mondayKeyOf, parseLocalNoon } from "@/src/utils/date";
import { useSelectedDate } from "@/src/stores/selected-date-store";

import { useMoodLogCount, useMoodWeek } from "@/src/features/mood/queries";
import { countLogsInCurrentWeek, currentWeekStartKey } from "@/src/features/mood/week-window";
import { getMoodSummary } from "@/src/features/mood/summaries";
import { useJournalEntryCount, useJournalWordTotal } from "@/src/features/journal/queries";
import {
  useGratitudeEntryCount,
  useGratitudeEntryCountSinceDayKey,
} from "@/src/features/gratitude/queries";
import {
  useBreathingSessionCount,
  useBreathingTotalMinutes,
} from "@/src/features/breathing/queries";
import { useGroundingSessionCount, useGroundingSessions } from "@/src/features/grounding/queries";
import {
  useMeditationMedianMinutes,
  useMeditationSessionCount,
} from "@/src/features/meditation/queries";
import { useSleepStats } from "@/src/features/sleep/queries";
import { useHabits, useHabitLogs } from "@/src/features/habits/queries";
import { isScheduledOn, isTickedOn } from "@/src/features/habits/scheduling";
import type { MindfulnessSession } from "@/src/features/mindfulness/types";

/**
 * The stat line of the tool card (#975, S5a; rekeyed onto the favourites card by #1955).
 *
 * Two rules govern every stat here, and they are what keep home and the tool from drifting:
 *
 * 1. **A stat quotes its tool and never invents a number.** Only figures the destination's
 *    own header already renders, from the same source. That is why there are no new
 *    queries and no new RPCs — each stat mounts the cache entry its tool already mounts.
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
 *   never claims emptiness, and `undefined` from these hooks means "not loaded" — which
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

/** `undefined` from a query hook means not loaded — never "zero". */
const isLoaded = (...values: unknown[]) => values.every((value) => value !== undefined);

const emptyStat = (t: TFunction) => t("home.rows.empty");

// --- 1. mood-checkin -------------------------------------------------------
// The two clauses use DIFFERENT windows on purpose: `this week` is a calendar Mon-Sun
// week (#697 decided that deliberately, against a trailing one) and `7-day average` is
// trailing. Both are labelled, so both are honest; "harmonising" them reverts #697.
export function useMoodStat(userId: string | null): string | null {
  const { t, i18n } = useTranslation("navigation");
  /**
   * ADR-0001: neither clause may come from a capped list. `useMoodWeek` fetches a DAY
   * RANGE - [previous Monday, this Sunday] - and `listMoodLogsInDayRange` pages it with
   * a keyset cursor, so it is uncapped by row count. That 14-day span always contains
   * both windows this row quotes, which means there is no assumed logging-rate bound to
   * state and nothing to truncate. (The 30-row list this first used would have silently
   * undercounted a user checking in twice a day - well inside real behaviour, since the
   * tool itself invites more than one check-in a day.)
   *
   * Emptiness is the exact lifetime count, not "nothing in the window": a user whose
   * last check-in was ten days ago has a record, and `0 this week` is the honest clause
   * for them. An exact `head` count needs no function under ADR-0001.
   */
  const { data: logs } = useMoodWeek(userId, currentWeekStartKey());
  const { data: lifetimeCount } = useMoodLogCount(userId);

  let stat: string | null = null;
  if (isLoaded(logs, lifetimeCount)) {
    const summary = getMoodSummary(logs, 7);
    stat =
      lifetimeCount === 0
        ? emptyStat(t)
        : joinClauses(
            t("home.rows.thisWeek", { value: countLogsInCurrentWeek(logs) }),
            summary.average === null
              ? null
              : t("home.rows.avg7", {
                  value: formatOneDecimal(summary.average, i18n.language),
                }),
          );
  }
  return stat;
}

// --- 2. journal-week -------------------------------------------------------
// Lifetime figures, matching the journal hero: the id says "week", the tool does not.
export function useJournalStat(userId: string | null): string | null {
  const { t } = useTranslation("navigation");
  const { data: entries } = useJournalEntryCount(userId);
  const { data: words } = useJournalWordTotal(userId);

  let stat: string | null = null;
  if (isLoaded(entries, words)) {
    stat =
      entries === 0
        ? emptyStat(t)
        : joinClauses(
            t("home.rows.entries", { count: entries }),
            t("home.rows.words", { count: words }),
          );
  }
  return stat;
}

// --- 3. gratitude-latest ---------------------------------------------------
export function useGratitudeStat(userId: string | null): string | null {
  const { t } = useTranslation("navigation");
  const { selectedDate } = useSelectedDate();
  // `mondayKeyOf(todayKey)` is what the gratitude home screen passes, so this shares
  // its cache entry rather than opening a second one on a different key.
  const { data: total } = useGratitudeEntryCount(userId);
  const { data: thisWeek } = useGratitudeEntryCountSinceDayKey(userId, mondayKeyOf(selectedDate));

  let stat: string | null = null;
  if (isLoaded(total, thisWeek)) {
    stat =
      total === 0
        ? emptyStat(t)
        : joinClauses(
            t("home.rows.entries", { count: total }),
            t("home.rows.thisWeek", { value: thisWeek }),
          );
  }
  return stat;
}

// --- 4. breathing-suggested ------------------------------------------------
export function useBreathingStat(userId: string | null): string | null {
  const { t } = useTranslation("navigation");
  const { data: sessions } = useBreathingSessionCount(userId);
  const { data: minutes } = useBreathingTotalMinutes(userId);

  let stat: string | null = null;
  if (isLoaded(sessions, minutes)) {
    stat =
      sessions === 0
        ? emptyStat(t)
        : joinClauses(
            t("home.rows.sessions", { count: sessions }),
            t("home.rows.minutes", { count: minutes }),
          );
  }
  return stat;
}

// --- 5. grounding-log ------------------------------------------------------
// Recency reuses the tool's own capped list (limit 5, its cache key) and reads only
// `at(0)`, which every cap contains - no new query. `formatCompactAtOffset` never
// renders "N days ago": a column of `23 days ago · 41 days ago` implies lateness, and
// home does not tally days since you last opened a tool.
export function useGroundingStat(userId: string | null): string | null {
  const { t, i18n } = useTranslation("navigation");
  const { data: sessions } = useGroundingSessionCount(userId);
  const { data: recent } = useGroundingSessions(userId, 5);

  let stat: string | null = null;
  if (isLoaded(sessions, recent)) {
    const last = (recent ?? []).reduce<MindfulnessSession | null>(
      (latest, session) =>
        latest === null || session.completedAt > latest.completedAt ? session : latest,
      null,
    );
    stat =
      sessions === 0
        ? emptyStat(t)
        : joinClauses(
            t("home.rows.sessions", { count: sessions }),
            last
              ? t("home.rows.last", {
                  when: formatCompactAtOffset(
                    last.completedAt,
                    last.completedOffsetMinutes,
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
// sum capped the same way. `useMeditationSessionCount` is a real uncapped head count,
// and the companion figure is the server's median, not a client sum.
export function useMeditationStat(userId: string | null): string | null {
  const { t } = useTranslation("navigation");
  const { data: sits } = useMeditationSessionCount(userId);
  const { data: median } = useMeditationMedianMinutes(userId);

  let stat: string | null = null;
  if (isLoaded(sits, median)) {
    stat =
      sits === 0
        ? emptyStat(t)
        : joinClauses(
            t("home.rows.sits", { count: sits }),
            // null means no sessions at all, which the sits clause already said.
            median === null ? null : t("home.rows.typicalMinutes", { value: median }),
          );
  }
  return stat;
}

// --- 7. sleep-latest -------------------------------------------------------
// `useSleepStats` passes the viewer timezone itself (`deviceTimeZone()` rides its query
// key), so the server aggregate is windowed in the viewer's civil days. Duration comes
// back in MINUTES; `formatHours` does the /60 and the locale-aware decimal (#962).
export function useSleepStat(userId: string | null): string | null {
  const { t, i18n } = useTranslation("navigation");
  const { data: stats } = useSleepStats(userId);

  let stat: string | null = null;
  if (isLoaded(stats)) {
    // `null` is a real loaded value here (the RPC returned no row), distinct from
    // `undefined`, and it means the user has no nights rather than none loaded.
    const sevenDay = stats?.sevenDayDurationMinutes ?? null;
    const quality = stats?.sevenDayQuality ?? null;
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
// Uncapped: the fraction is over every habit due today, not a page of them.
export function useHabitsStat(userId: string | null): string | null {
  const { t } = useTranslation("navigation");
  const { selectedDate } = useSelectedDate();
  /**
   * The habits screen's own cache entries. `useHabitLogs`' scope is structural in the
   * query key, so the options object has to MATCH the screen's to share it - a narrower
   * `sinceDate` of just today would be a second query for a subset of rows this one
   * already holds, which is what rule 1 above exists to prevent.
   */
  const { data: habits } = useHabits(userId, { includeArchived: true });
  // The 30-day window is derived from `selectedDate` rather than a fresh `new Date()`:
  // both resolve to the same civil-day string (so the habits screen's cache entry is
  // still shared), but a clock read during render is impure and the React Compiler
  // rejects it outright inside a `useMemo`.
  const { data: logs } = useHabitLogs(userId, {
    sinceDate: addDaysToKey(selectedDate, -30),
  });

  let stat: string | null = null;
  if (isLoaded(habits, logs)) {
    const active = (habits ?? []).filter((habit) => !habit.archivedAt);
    const dueToday = active.filter((habit) => isScheduledOn(habit, parseLocalNoon(selectedDate)));
    const done = dueToday.filter((habit) => isTickedOn(logs ?? [], habit.id, selectedDate)).length;
    stat =
      active.length === 0
        ? emptyStat(t)
        : dueToday.length === 0
          ? t("home.rows.nothingScheduled")
          : t("home.rows.doneToday", { done, total: dueToday.length });
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

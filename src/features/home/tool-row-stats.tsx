import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { ToolRow } from "@/src/features/home/tool-row";
import { formatOneDecimal } from "@/src/lib/locale-format";
import { formatHours } from "@/src/features/sleep/format";
import { formatCompactAtOffset, mondayKeyOf, parseLocalNoon } from "@/src/utils/date";
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
import { addDays, isScheduledOn, isTickedOn, localDateKey } from "@/src/features/habits/scheduling";
import { useRoutinesToday } from "@/src/features/routines/use-routines-today";
import type { MindfulnessSession } from "@/src/features/mindfulness/types";

/**
 * The stat half of the `Your tools` tier (#975, S5a).
 *
 * Two rules govern every row here, and they are what keep home and the tool from drifting:
 *
 * 1. **A row quotes its tool and never invents a number.** Only figures the destination's
 *    own header already renders, from the same source. That is why there are no new
 *    queries and no new RPCs — each row mounts the cache entry its tool already mounts.
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
 * - **loaded and empty** → the shared `home.rows.empty`. One key for every row: the row's
 *   own name already supplies the noun.
 * - **nothing scheduled today** → its own string. A user with seven habits and none due
 *   has a full record and an empty day; those are different facts.
 *
 * `RoutinesRow` is the one row that cannot use the `isLoaded` idiom: `useRoutinesToday`
 * aggregates several queries and returns a fully-formed object rather than `undefined`,
 * so its loading signal is the `isLoading` flag it exposes.
 */

type StatRowProps = { userId: string | null };

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
function MoodCheckinRow({ userId }: StatRowProps) {
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
  return <ToolRow id="mood-checkin" stat={stat} />;
}

// --- 2. journal-week -------------------------------------------------------
// Lifetime figures, matching the journal hero: the id says "week", the tool does not.
function JournalRow({ userId }: StatRowProps) {
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
  return <ToolRow id="journal-week" stat={stat} />;
}

// --- 3. gratitude-latest ---------------------------------------------------
function GratitudeRow({ userId }: StatRowProps) {
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
  return <ToolRow id="gratitude-latest" stat={stat} />;
}

// --- 4. breathing-suggested ------------------------------------------------
function BreathingRow({ userId }: StatRowProps) {
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
  return <ToolRow id="breathing-suggested" stat={stat} />;
}

// --- 5. grounding-log ------------------------------------------------------
// Recency reuses the tool's own capped list (limit 5, its cache key) and reads only
// `at(0)`, which every cap contains - no new query. `formatCompactAtOffset` never
// renders "N days ago": a column of `23 days ago · 41 days ago` implies lateness, and
// home does not tally days since you last opened a tool.
function GroundingRow({ userId }: StatRowProps) {
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
  return <ToolRow id="grounding-log" stat={stat} />;
}

// --- 6. meditation-pick ----------------------------------------------------
// ☠️ The design's drawn "30 sessions · 551 minutes" was the 30-row cache cap times a
// sum capped the same way. `useMeditationSessionCount` is a real uncapped head count,
// and the companion figure is the server's median, not a client sum.
function MeditationRow({ userId }: StatRowProps) {
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
  return <ToolRow id="meditation-pick" stat={stat} />;
}

// --- 7. sleep-latest -------------------------------------------------------
// `useSleepStats` passes the viewer timezone itself (`deviceTimeZone()` rides its query
// key), so the server aggregate is windowed in the viewer's civil days. Duration comes
// back in MINUTES; `formatHours` does the /60 and the locale-aware decimal (#962).
function SleepRow({ userId }: StatRowProps) {
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
  return <ToolRow id="sleep-latest" stat={stat} />;
}

// --- 8. habits-today -------------------------------------------------------
// ☠️ The id maps to `ActivitiesWidget` today, which reads CBT behavioural-activation
// data and no habit data at all. This row reads HABITS, which is what its name has
// always promised. CBT activities keep their own row in S5b, so nothing is lost.
//
// Uncapped: the fraction is over every habit due today, not a page of them.
function HabitsRow({ userId }: StatRowProps) {
  const { t } = useTranslation("navigation");
  const { selectedDate } = useSelectedDate();
  /**
   * The habits screen's own cache entries. `useHabitLogs`' scope is structural in the
   * query key, so the options object has to MATCH the screen's to share it - a narrower
   * `sinceDate` of just today would be a second query for a subset of rows this one
   * already holds, which is what rule 1 above exists to prevent.
   */
  const { data: habits } = useHabits(userId, { includeArchived: true });
  const { data: logs } = useHabitLogs(userId, {
    sinceDate: localDateKey(addDays(new Date(), -30)),
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
  return <ToolRow id="habits-today" stat={stat} />;
}

// --- 9. routines-today -----------------------------------------------------
// The counts are STEP-level and cover only routines scheduled today, which is why
// `hasRoutines` is what separates "no routines at all" from "none due".
function RoutinesRow({ userId }: StatRowProps) {
  const { t } = useTranslation("navigation");
  const { isLoading, hasRoutines, doneSteps, totalSteps } = useRoutinesToday(userId);

  let stat: string | null = null;
  if (!isLoading) {
    stat = !hasRoutines
      ? emptyStat(t)
      : totalSteps === 0
        ? t("home.rows.nothingScheduled")
        : t("home.rows.doneToday", { done: doneSteps, total: totalSteps });
  }
  return <ToolRow id="routines-today" stat={stat} />;
}

/** The nine ids this slice gives a stat. S5b (#976) adds the remaining fourteen. */
const STAT_ROWS: Record<string, ComponentType<StatRowProps>> = {
  "mood-checkin": MoodCheckinRow,
  "journal-week": JournalRow,
  "gratitude-latest": GratitudeRow,
  "breathing-suggested": BreathingRow,
  "grounding-log": GroundingRow,
  "meditation-pick": MeditationRow,
  "sleep-latest": SleepRow,
  "habits-today": HabitsRow,
  "routines-today": RoutinesRow,
};

/**
 * One row of the tool tier. Ids without a stat yet render the same empty slot a loading
 * row does — deliberately identical, because "we haven't built this" and "we don't know
 * yet" should both decline to make a claim.
 */
export function ToolTierRow({ id, userId }: { id: string } & StatRowProps) {
  const WithStat = STAT_ROWS[id];
  if (WithStat) return <WithStat userId={userId} />;
  return <ToolRow id={id} stat={null} />;
}

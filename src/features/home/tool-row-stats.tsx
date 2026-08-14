import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { ToolRow } from "@/src/features/home/tool-row";
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
import { useRoutinesToday } from "@/src/features/routines/use-routines-today";
import { useThoughtRecordCount, useThoughtRecords } from "@/src/features/cbt/queries";
import { useSelfCareLogs } from "@/src/features/self-care/queries";
import { useWorryEntries } from "@/src/features/worry/queries";
import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import { useActivities } from "@/src/features/activities/queries";
import { useRecentExposureSessions } from "@/src/features/exposure/queries";
import { useGoals } from "@/src/features/goals/queries";
import { useConnectionLogs } from "@/src/features/act/queries/connection";
import { useObservingSelfSessions } from "@/src/features/act/queries/observing-self";
import { useChoicePoints } from "@/src/features/act/queries/choice-points";
import { useDefusionLogs } from "@/src/features/act/queries/defusion";
import { useExpansionLogs } from "@/src/features/act/queries/expansion";
import { useCommittedActions } from "@/src/features/act/queries/committed-action";
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

// ===========================================================================
// S5b (#976): the fourteen module and shortcut rows.
//
// Eleven are pure recency, and each reuses the list its own tool already mounts, reading
// only the newest entry - which every cap contains. Recency renders through
// `formatCompactAtOffset`, which never says "N days ago".
//
// ☠️ NO ACT table carries a captured UTC offset. Checked against every `*_offset_minutes`
// column in supabase/migrations: only mood, gratitude, sleep, journal, meditation,
// mindfulness, activity_logs and thought_records have one. So all six ACT rows - and
// self-care, worry, beliefs and exposure - pass `null` and fall back to the viewer's
// current zone. A log written in another timezone renders in this one; that is the
// honest limit of what those tables recorded, not something to paper over.
// ===========================================================================

/** Newest ISO timestamp in a list, for the lists that are not already recency-ordered. */
function latestOf<T>(rows: T[] | undefined, at: (row: T) => string | null): string | null {
  return (rows ?? []).reduce<string | null>((latest, row) => {
    const value = at(row);
    if (value === null) return latest;
    return latest === null || value > latest ? value : latest;
  }, null);
}

/** The shared shape of the eleven recency rows. */
function RecencyRow({
  id,
  loaded,
  at,
  offsetMinutes = null,
}: {
  id: string;
  loaded: boolean;
  at: string | null;
  offsetMinutes?: number | null;
}) {
  const { t, i18n } = useTranslation("navigation");
  let stat: string | null = null;
  if (loaded) {
    stat =
      at === null
        ? emptyStat(t)
        : t("home.rows.last", { when: formatCompactAtOffset(at, offsetMinutes, i18n.language) });
  }
  return <ToolRow id={id} stat={stat} />;
}

function SelfCareRow({ userId }: StatRowProps) {
  const { data: logs } = useSelfCareLogs(userId);
  // `createdAt`, not the `logDate` day key the list is sorted by: a bare "2026-07-27"
  // parses as UTC midnight and renders as the previous day for any viewer west of UTC.
  return (
    <RecencyRow
      id="self-care"
      loaded={isLoaded(logs)}
      at={latestOf(logs, (log) => log.createdAt)}
    />
  );
}

// The one row of the fourteen with two clauses.
function CbtOpenRecordRow({ userId }: StatRowProps) {
  const { t, i18n } = useTranslation("navigation");
  const { data: records } = useThoughtRecords(userId);
  /**
   * An exact head count, not `records.length`. That list is capped at 500 AND ordered by
   * `updated_at`, so its length is a lifetime figure derived from a capped query -
   * precisely what ADR-0001 forbids, and it would stay plausible while truncating.
   *
   * ⚠️ Unlike the other thirteen rows this does not quote a figure the destination already
   * renders, because there is none: `/modules/cbt/new` is the record form and the CBT
   * home shows no record count. Raised on the ticket rather than assumed.
   */
  const { data: count } = useThoughtRecordCount(userId);

  let stat: string | null = null;
  if (isLoaded(records, count)) {
    // Ordered by `updated_at`, so `.at(0)` is the most recently EDITED record rather than
    // the most recent one written. Reduce for the real maximum.
    const last = latestOf(records, (record) => record.createdAt);
    const lastOffset =
      records?.find((record) => record.createdAt === last)?.createdOffsetMinutes ?? null;
    stat =
      count === 0
        ? emptyStat(t)
        : joinClauses(
            t("home.rows.records", { count }),
            last === null
              ? null
              : t("home.rows.last", {
                  when: formatCompactAtOffset(last, lastOffset, i18n.language),
                }),
          );
  }
  return <ToolRow id="cbt-open-record" stat={stat} />;
}

function CbtWorryRow({ userId }: StatRowProps) {
  const { data: entries } = useWorryEntries(userId);
  return (
    <RecencyRow id="cbt-worry" loaded={isLoaded(entries)} at={entries?.[0]?.createdAt ?? null} />
  );
}

function CbtBeliefsRow({ userId }: StatRowProps) {
  const { data: beliefs } = useCoreBeliefs(userId);
  return (
    <RecencyRow id="cbt-beliefs" loaded={isLoaded(beliefs)} at={beliefs?.[0]?.createdAt ?? null} />
  );
}

function CbtActivitiesRow({ userId }: StatRowProps) {
  const { data: activities } = useActivities(userId);
  // Ordered by `scheduled_at` ascending, so neither end of the list is the newest
  // completion - and a scheduled activity may never have been completed at all.
  const last = latestOf(activities, (activity) => activity.completedAt);
  const offset =
    activities?.find((activity) => activity.completedAt === last)?.completedOffsetMinutes ?? null;
  return (
    <RecencyRow
      id="cbt-activities"
      loaded={isLoaded(activities)}
      at={last}
      offsetMinutes={offset}
    />
  );
}

function CbtExposureRow({ userId }: StatRowProps) {
  /**
   * Sessions, never hierarchies - a hierarchy is a plan, and the row reports what was
   * done. ⚠️ This is the one row whose tool screen mounts neither list: the exposure index
   * mounts `useHierarchies`, so there is no session cache entry to share. The limit rides
   * this hook's query key, so 250 matches `use-routine-tool-records`' constant and shares
   * with it whenever the user has an exposure routine step.
   */
  const { data: sessions } = useRecentExposureSessions(userId, 250);
  return (
    <RecencyRow
      id="cbt-exposure"
      loaded={isLoaded(sessions)}
      at={sessions?.[0]?.completedAt ?? null}
    />
  );
}

function CbtGoalsRow({ userId }: StatRowProps) {
  const { t } = useTranslation("navigation");
  const { data: goals } = useGoals(userId);
  // A count, not recency: a goal is a current thing, not an event that happened.
  let stat: string | null = null;
  if (isLoaded(goals)) {
    const active = (goals ?? []).filter((goal) => goal.status === "active").length;
    stat = active === 0 ? emptyStat(t) : t("home.rows.activeGoals", { count: active });
  }
  return <ToolRow id="cbt-goals" stat={stat} />;
}

function ActDropAnchorRow({ userId }: StatRowProps) {
  /**
   * Drop-anchor is a SUBSET of connection, not its own table: filter on `technique`
   * before taking the newest. ⚠️ The list is capped at 30, so a user with 30 newer
   * connection logs of other techniques reads as having no drop anchor. Accepted - 30 is
   * the entry the connection list screen and the ACT programme already mount, and a
   * second uncapped query for one row's recency is the cost this slice refuses.
   */
  const { data: logs } = useConnectionLogs(userId, 30);
  const dropAnchor = (logs ?? []).filter((log) => log.technique === "dropAnchor");
  return (
    <RecencyRow
      id="act-drop-anchor"
      loaded={isLoaded(logs)}
      at={dropAnchor[0]?.createdAt ?? null}
    />
  );
}

function ActObservingSelfRow({ userId }: StatRowProps) {
  // Limit deliberately omitted: it is NOT part of this hook's query key, so passing a
  // different one would not open a new entry - it would just race whichever mounts first.
  const { data: sessions } = useObservingSelfSessions(userId);
  return (
    <RecencyRow
      id="act-observing-self"
      loaded={isLoaded(sessions)}
      at={sessions?.[0]?.createdAt ?? null}
    />
  );
}

function ActChoicePointRow({ userId }: StatRowProps) {
  // Limit omitted for the same reason as observing-self: not in the query key.
  const { data: points } = useChoicePoints(userId);
  return (
    <RecencyRow
      id="act-choice-point"
      loaded={isLoaded(points)}
      at={points?.[0]?.createdAt ?? null}
    />
  );
}

function ActDefusionRow({ userId }: StatRowProps) {
  const { data: logs } = useDefusionLogs(userId, 30);
  return <RecencyRow id="act-defusion" loaded={isLoaded(logs)} at={logs?.[0]?.createdAt ?? null} />;
}

function ActAcceptancePromptRow({ userId }: StatRowProps) {
  const { data: logs } = useExpansionLogs(userId, 30);
  return (
    <RecencyRow
      id="act-acceptance-prompt"
      loaded={isLoaded(logs)}
      at={logs?.[0]?.createdAt ?? null}
    />
  );
}

function ActCommittedActionsRow({ userId }: StatRowProps) {
  const { t } = useTranslation("navigation");
  // The status rides the query key, so "active" is its own entry - shared with the
  // Android snapshot builder rather than with the list screen, which mounts unfiltered.
  const { data: actions } = useCommittedActions(userId, "active");
  let stat: string | null = null;
  if (isLoaded(actions)) {
    const count = (actions ?? []).length;
    stat = count === 0 ? emptyStat(t) : t("home.rows.active", { count });
  }
  return <ToolRow id="act-committed-actions" stat={stat} />;
}

/** Every id that renders a stat. */
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
  "self-care": SelfCareRow,
  "cbt-open-record": CbtOpenRecordRow,
  "cbt-worry": CbtWorryRow,
  "cbt-beliefs": CbtBeliefsRow,
  "cbt-activities": CbtActivitiesRow,
  "cbt-exposure": CbtExposureRow,
  "cbt-goals": CbtGoalsRow,
  "act-drop-anchor": ActDropAnchorRow,
  "act-observing-self": ActObservingSelfRow,
  "act-choice-point": ActChoicePointRow,
  "act-defusion": ActDefusionRow,
  "act-acceptance-prompt": ActAcceptancePromptRow,
  "act-committed-actions": ActCommittedActionsRow,
  // `cbt-distortion-guide` is deliberately ABSENT, and it is the one documented exception
  // to the empty-slot rule. It is reference content: it holds no record of yours, so
  // "Nothing yet" would be false, and its description is not a stat - a column that
  // sometimes holds copy teaches the reader it cannot be trusted.
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

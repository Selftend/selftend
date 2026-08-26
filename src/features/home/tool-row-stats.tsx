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
import { useLatestThoughtRecordAt, useThoughtRecordCount } from "@/src/features/cbt/queries";
import { useLatestSelfCareLogAt } from "@/src/features/self-care/queries";
import { useLatestWorryEntryAt } from "@/src/features/worry/queries";
import { useLatestCoreBeliefAt } from "@/src/features/beliefs/queries";
import { useLatestCompletedActivityAt } from "@/src/features/activities/queries";
import { useLatestExposureSessionAt } from "@/src/features/exposure/queries";
import { useActiveGoalCount } from "@/src/features/goals/queries";
import { useLatestConnectionLogAt } from "@/src/features/act/queries/connection";
import { useLatestObservingSelfSessionAt } from "@/src/features/act/queries/observing-self";
import { useLatestChoicePointAt } from "@/src/features/act/queries/choice-points";
import { useLatestDefusionLogAt } from "@/src/features/act/queries/defusion";
import { useLatestExpansionLogAt } from "@/src/features/act/queries/expansion";
import { useCommittedActionCount } from "@/src/features/act/queries/committed-action";
import type { LatestActivity } from "@/src/lib/latest-activity";
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
// Eleven are pure recency and two are counts. Recency renders through
// `formatCompactAtOffset`, which never says "N days ago".
//
// ☠️ Each of these used to read its tool's full list hook, on S5b's reasoning that the
// cache is shared with the tool screen. #990 measured what that costs: sharing only
// begins once the user has VISITED that screen, so a cold home load - the first screen a
// signed-in user sees - paid for fourteen list fetches itself, several of them
// `select("*")` at limit 500 over a decrypting view, to read one timestamp each. Every
// row here now reads exactly what it renders: one row, or an exact `head` count.
//
// ☠️ NO ACT table carries a captured UTC offset. Checked against every `*_offset_minutes`
// column in supabase/migrations: only mood, gratitude, sleep, journal, meditation,
// mindfulness, activity_logs and thought_records have one. So all six ACT rows - and
// self-care, worry, beliefs and exposure - come back with `offsetMinutes: null` and fall
// back to the viewer's current zone. A log written in another timezone renders in this
// one; that is the honest limit of what those tables recorded, not something to paper over.
// ===========================================================================

/**
 * The shared shape of the eleven recency rows.
 *
 * `undefined` is "not loaded" and `null` is "loaded and empty" - the same distinction
 * `isLoaded` draws for every other row, carried by one value instead of two props.
 */
function RecencyRow({ id, latest }: { id: string; latest: LatestActivity | null | undefined }) {
  const { t, i18n } = useTranslation("navigation");
  let stat: string | null = null;
  if (isLoaded(latest)) {
    stat = !latest
      ? emptyStat(t)
      : t("home.rows.last", {
          when: formatCompactAtOffset(latest.at, latest.offsetMinutes, i18n.language),
        });
  }
  return <ToolRow id={id} stat={stat} />;
}

function SelfCareRow({ userId }: StatRowProps) {
  // Dated by `created_at`, not the `log_date` day key the tool's list is sorted by: a bare
  // "2026-07-27" parses as UTC midnight and renders as the previous day for any viewer
  // west of UTC.
  const { data: latest } = useLatestSelfCareLogAt(userId);
  return <RecencyRow id="self-care" latest={latest} />;
}

// The one row of the fourteen with two clauses.
function CbtOpenRecordRow({ userId }: StatRowProps) {
  const { t, i18n } = useTranslation("navigation");
  /**
   * An exact head count, never a list's length. A lifetime figure derived from a capped
   * query is precisely what ADR-0001 forbids, and it would stay plausible while truncating.
   *
   * The destination itself (`/modules/cbt/new`) is the record form and renders no
   * figure, but the CBT home's header now quotes this same lifetime head count as its
   * first stat (#1387), so the row and the module home read off one query.
   */
  const { data: count } = useThoughtRecordCount(userId);
  // Newest by `created_at`, not the `updated_at` the record list is ordered by: this
  // clause reports the last record WRITTEN, not the last one edited.
  const { data: latest } = useLatestThoughtRecordAt(userId);

  let stat: string | null = null;
  if (isLoaded(latest, count)) {
    stat =
      count === 0
        ? emptyStat(t)
        : joinClauses(
            t("home.rows.records", { count }),
            !latest
              ? null
              : t("home.rows.last", {
                  when: formatCompactAtOffset(latest.at, latest.offsetMinutes, i18n.language),
                }),
          );
  }
  return <ToolRow id="cbt-open-record" stat={stat} />;
}

function CbtWorryRow({ userId }: StatRowProps) {
  const { data: latest } = useLatestWorryEntryAt(userId);
  return <RecencyRow id="cbt-worry" latest={latest} />;
}

function CbtBeliefsRow({ userId }: StatRowProps) {
  const { data: latest } = useLatestCoreBeliefAt(userId);
  return <RecencyRow id="cbt-beliefs" latest={latest} />;
}

function CbtActivitiesRow({ userId }: StatRowProps) {
  // `completed_at`, never `scheduled_at`: the row reports what was done, and a scheduled
  // activity may never have been completed at all.
  const { data: latest } = useLatestCompletedActivityAt(userId);
  return <RecencyRow id="cbt-activities" latest={latest} />;
}

function CbtExposureRow({ userId }: StatRowProps) {
  // Sessions, never hierarchies - a hierarchy is a plan, and the row reports what was done.
  const { data: latest } = useLatestExposureSessionAt(userId);
  return <RecencyRow id="cbt-exposure" latest={latest} />;
}

function CbtGoalsRow({ userId }: StatRowProps) {
  const { t } = useTranslation("navigation");
  // A count, not recency: a goal is a current thing, not an event that happened.
  const { data: active } = useActiveGoalCount(userId);
  let stat: string | null = null;
  if (isLoaded(active)) {
    stat = active === 0 ? emptyStat(t) : t("home.rows.activeGoals", { count: active });
  }
  return <ToolRow id="cbt-goals" stat={stat} />;
}

function ActDropAnchorRow({ userId }: StatRowProps) {
  // Drop-anchor is a SUBSET of connection, not its own table, so the technique is a
  // filter on the read rather than a filter over a fetched page - which is what let a
  // user with 30 newer connection logs of other techniques read as never having dropped
  // anchor (#990).
  const { data: latest } = useLatestConnectionLogAt(userId, "dropAnchor");
  return <RecencyRow id="act-drop-anchor" latest={latest} />;
}

function ActObservingSelfRow({ userId }: StatRowProps) {
  const { data: latest } = useLatestObservingSelfSessionAt(userId);
  return <RecencyRow id="act-observing-self" latest={latest} />;
}

function ActChoicePointRow({ userId }: StatRowProps) {
  const { data: latest } = useLatestChoicePointAt(userId);
  return <RecencyRow id="act-choice-point" latest={latest} />;
}

function ActDefusionRow({ userId }: StatRowProps) {
  const { data: latest } = useLatestDefusionLogAt(userId);
  return <RecencyRow id="act-defusion" latest={latest} />;
}

function ActAcceptancePromptRow({ userId }: StatRowProps) {
  const { data: latest } = useLatestExpansionLogAt(userId);
  return <RecencyRow id="act-acceptance-prompt" latest={latest} />;
}

function ActCommittedActionsRow({ userId }: StatRowProps) {
  const { t } = useTranslation("navigation");
  // The status rides the query key, so "active" is its own entry under the list prefix
  // every committed-action mutation already invalidates.
  const { data: count } = useCommittedActionCount(userId, "active");
  let stat: string | null = null;
  if (isLoaded(count)) {
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

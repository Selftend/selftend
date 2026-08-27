import type { TFunction } from "i18next";

import { buildInsightCards, type InsightCardModel } from "./build-insight-cards";
import type { HeaderStat } from "@/src/components/app/module-home-header";
import type { CbtProgramView } from "@/src/features/cbt/derive-cbt-program";
import { resolveHotThought } from "@/src/features/cbt/thought-record-form";
import type { ThoughtRecord } from "@/src/features/cbt/types";
import type {
  CbtInsights,
  DistortionCount,
  RecurringThoughtSuggestion,
} from "@/src/features/cbt/use-cbt-insights";
import { instantOnOrAfter } from "@/src/utils/date";
import type { Goal } from "@/src/features/goals/types";
import type { RecoveryPlan } from "@/src/features/recovery/types";

/** How many recent records the overview shows. Three, matching ACT's home (#1219). */
export const RECENT_RECORD_COUNT = 3;

export interface DeriveCbtHomeViewInputs {
  goals: Goal[] | undefined;
  thoughtRecords: ThoughtRecord[] | undefined;
  recoveryPlan: RecoveryPlan | null | undefined;
  insights: CbtInsights;
  program: Pick<CbtProgramView, "status">;
  promptDismissedAt: string | null;
  /** Lifetime head count of records; undefined while the query is in flight. */
  lifetimeRecordCount: number | undefined;
  /** Head count of records created since `monthStartIso`; undefined in flight. */
  monthRecordCount: number | undefined;
  /** Local start of the current civil month, as an ISO instant. */
  monthStartIso: string;
  t: TFunction<"cbt">;
}

/**
 * Whether each `Section` on the overview draws its top hairline, in render
 * order. See `deriveSectionRules`.
 */
export interface CbtHomeSectionRules {
  goals: boolean;
  records: boolean;
  insights: boolean;
  framework: boolean;
  review: boolean;
}

export interface CbtHomeView {
  activeGoals: Goal[];
  recentRecords: ThoughtRecord[];
  personalSlogan: string;
  topRecurringThought: RecurringThoughtSuggestion | null;
  headerStats: HeaderStat[];
  distortionBars: DistortionCount[];
  insightCards: InsightCardModel[];
  hasInsights: boolean;
  showProgramCard: boolean;
  sectionRules: CbtHomeSectionRules;
}

/**
 * The header's stat run (#1387): lifetime records, this month's records, and -
 * only when at least one of this month's records carries BOTH belief numbers -
 * the signed mean belief shift.
 *
 * The number stays in `value` and the noun in a count-pluralised `label`
 * (#749's pattern B, which is also what the stat-shape guard enforces). An
 * unresolved count renders an em dash, never a zero: `?? 0` would tell a user
 * with 200 records they had none while the query was in flight (#1378's
 * lesson, verbatim from ACT home).
 *
 * Stat 3 is a SHIFT, not a "drop" (SR-4): `after − before`, so a fall is
 * negative. A label asserting a drop is false whenever the mean is zero or
 * positive - the same defect as the "stayed at" family this redesign removed -
 * and omitting the stat when it is unflattering would be worse, so it renders
 * at every value including 0 and positive means. It is OMITTED from the array,
 * never dashed, when no record in the window carries both numbers:
 * `belief_after` is new (#1376), so every legacy record is null there.
 *
 * The mean is a client-side reduction over the 500-row list, which is safe for
 * a month and would not be for a lifetime - a record created this month can
 * only leave the top 500 when 500 others were touched later, which puts them
 * in the month too (ADR-0001; the same argument carries the insights bars).
 * The "before" number is the hot thought's own rating via `resolveHotThought`,
 * the chain the detail screen's belief pair already reads (#1384).
 */
function deriveHeaderStats(
  thoughtRecords: ThoughtRecord[] | undefined,
  lifetimeRecordCount: number | undefined,
  monthRecordCount: number | undefined,
  monthStartIso: string,
  t: TFunction<"cbt">,
): HeaderStat[] {
  const statValue = (count: number | undefined) =>
    count === undefined ? t("home.statLoadingValue") : String(count);

  const stats: HeaderStat[] = [
    {
      value: statValue(lifetimeRecordCount),
      label: t("home.statRecords", { count: lifetimeRecordCount ?? 0 }),
    },
    {
      value: statValue(monthRecordCount),
      label: t("home.statThisMonth"),
    },
  ];

  const shifts = (thoughtRecords ?? []).flatMap((record) => {
    if (!instantOnOrAfter(record.createdAt, monthStartIso)) {
      return [];
    }
    const before = resolveHotThought(record.nats)?.beliefRating ?? null;
    // The denominator is records that filled in BOTH numbers, never "records".
    return before !== null && record.beliefAfter !== null ? [record.beliefAfter - before] : [];
  });

  if (shifts.length > 0) {
    const mean = Math.round(shifts.reduce((sum, shift) => sum + shift, 0) / shifts.length);
    stats.push({
      // The sign is the value's job - the label stays direction-neutral. An
      // explicit "+" keeps a positive mean from reading as a drop by habit.
      value: mean > 0 ? `+${mean}` : String(mean),
      label: t("home.statBeliefShift", { count: Math.abs(mean) }),
    });
  }

  return stats;
}

/**
 * The hairline above a section is a divider between two sections, so the FIRST
 * visible one must not draw it - there is nothing above it to divide it from,
 * and the rule then reads as an underline for the header rather than as a
 * separator.
 *
 * ☠️ "The first section" is a RUNTIME fact on this screen, not a source
 * position: three of the four sections hide themselves when they have nothing
 * to show. Hardcoding `ruled={false}` on the topmost one in the file gives a
 * user with no goals a stray hairline above whichever section is actually
 * first. So the flags are accumulated in render order - a section is ruled iff
 * some earlier section is visible - which is what `journal-list-screen.tsx`
 * already does with its single `ruled={hasAnyEntry}`.
 *
 * **Any "first" or "last" prop is a lie on a screen whose earlier siblings are
 * conditional.**
 */
export function deriveSectionRules(visible: boolean[]): boolean[] {
  let anyEarlierVisible = false;
  return visible.map((isVisible) => {
    const ruled = anyEarlierVisible;
    anyEarlierVisible = anyEarlierVisible || isVisible;
    return ruled;
  });
}

/**
 * Pure view-model derivation for the CBT home screen.
 *
 * ☠️ `personalSlogan` reads ONE source. It used to be
 * `recoveryPlan?.personalSlogan.trim() || insights.slogan`, and
 * `use-cbt-insights` set `slogan` to `recoveryPlan?.personalSlogan.trim() ?? ""`
 * off the same `useRecoveryPlan` query - the same expression, so the right-hand
 * side could only ever be reached when the left was already empty, and it was
 * empty too. An `||` between two readings of one query is dead code wearing a
 * fallback's clothes; `insights.slogan` retired with it (#1386).
 */
export function deriveCbtHomeView({
  goals,
  thoughtRecords,
  recoveryPlan,
  insights,
  program,
  promptDismissedAt,
  lifetimeRecordCount,
  monthRecordCount,
  monthStartIso,
  t,
}: DeriveCbtHomeViewInputs): CbtHomeView {
  const activeGoals = goals?.filter((g) => g.status === "active").slice(0, 2) ?? [];
  const recentRecords = thoughtRecords?.slice(0, RECENT_RECORD_COUNT) ?? [];
  const personalSlogan = recoveryPlan?.personalSlogan.trim() ?? "";
  const topRecurringThought = insights.recurringThoughtSuggestions[0] ?? null;
  const headerStats = deriveHeaderStats(
    thoughtRecords,
    lifetimeRecordCount,
    monthRecordCount,
    monthStartIso,
    t,
  );
  const distortionBars = insights.distortionCounts;
  const insightCards = buildInsightCards(insights, t);
  // Bars OR cards: with the bars replacing the top-distortion card, a gate on
  // the card list alone would hide the bars whenever the other seven kinds are
  // silent - the common case at five to ten records (#1387).
  const hasInsights = distortionBars.length > 0 || insightCards.length > 0;
  const showProgramCard = program.status !== "not_started" || !promptDismissedAt;

  // Render order of every ruled block: active goals, recent records, insights,
  // the framework, review. The first three hide themselves; the last two always
  // render, which is why a user with nothing logged still sees the rule land on
  // the framework rather than floating above it.
  //
  // ⚠️ This array's order MUST match the JSX order in `cbt-home-screen.tsx`, and
  // nothing in the type system says so. What catches a mismatch is that screen's
  // own block-order test: reordering two blocks in the JSX without reordering
  // them here fails it, which was verified by doing exactly that.
  //
  // The programme card and the slogan card are deliberately absent. They sit
  // above the first ruled block but are CARDS - they carry their own border and
  // their own spacing, so they neither draw a rule nor make the block beneath
  // them draw one.
  const [goalsRuled, recordsRuled, insightsRuled, frameworkRuled, reviewRuled] = deriveSectionRules(
    [activeGoals.length > 0, recentRecords.length > 0, hasInsights, true, true],
  );

  return {
    activeGoals,
    recentRecords,
    personalSlogan,
    topRecurringThought,
    headerStats,
    distortionBars,
    insightCards,
    hasInsights,
    showProgramCard,
    sectionRules: {
      goals: goalsRuled,
      records: recordsRuled,
      insights: insightsRuled,
      framework: frameworkRuled,
      review: reviewRuled,
    },
  };
}

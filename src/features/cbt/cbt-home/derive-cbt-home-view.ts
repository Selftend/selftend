import type { TFunction } from "i18next";

import { buildInsightCards, type InsightCardModel } from "./build-insight-cards";
import type { CbtProgramView } from "@/src/features/cbt/derive-cbt-program";
import type { ThoughtRecord } from "@/src/features/cbt/types";
import type {
  CbtInsights,
  RecurringThoughtSuggestion,
  TopDistortion,
} from "@/src/features/cbt/use-cbt-insights";
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
  topDistortion: TopDistortion | null;
  otherDistortions: TopDistortion[];
  topRecurringThought: RecurringThoughtSuggestion | null;
  insightCards: InsightCardModel[];
  hasInsights: boolean;
  showProgramCard: boolean;
  sectionRules: CbtHomeSectionRules;
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
  t,
}: DeriveCbtHomeViewInputs): CbtHomeView {
  const activeGoals = goals?.filter((g) => g.status === "active").slice(0, 2) ?? [];
  const recentRecords = thoughtRecords?.slice(0, RECENT_RECORD_COUNT) ?? [];
  const personalSlogan = recoveryPlan?.personalSlogan.trim() ?? "";
  const topDistortion = insights.topDistortions[0] ?? null;
  const otherDistortions = insights.topDistortions.slice(1);
  const topRecurringThought = insights.recurringThoughtSuggestions[0] ?? null;
  const insightCards = buildInsightCards(insights, t);
  const hasInsights = insightCards.length > 0;
  const showProgramCard = program.status !== "not_started" || !promptDismissedAt;

  // Render order of every ruled block: active goals, recent records, insights,
  // the framework, review. The first three hide themselves; the last two always
  // render, which is why a user with nothing logged still sees the rule land on
  // the framework rather than floating above it.
  const [goalsRuled, recordsRuled, insightsRuled, frameworkRuled, reviewRuled] = deriveSectionRules(
    [activeGoals.length > 0, recentRecords.length > 0, hasInsights, true, true],
  );

  return {
    activeGoals,
    recentRecords,
    personalSlogan,
    topDistortion,
    otherDistortions,
    topRecurringThought,
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

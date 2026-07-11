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

export interface DeriveCbtHomeViewInputs {
  goals: Goal[] | undefined;
  thoughtRecords: ThoughtRecord[] | undefined;
  recoveryPlan: RecoveryPlan | null | undefined;
  insights: CbtInsights;
  program: Pick<CbtProgramView, "status">;
  promptDismissedAt: string | null;
  t: TFunction<"cbt">;
}

export interface CbtHomeView {
  activeGoals: Goal[];
  latestRecord: ThoughtRecord | null;
  personalSlogan: string;
  topDistortion: TopDistortion | null;
  otherDistortions: TopDistortion[];
  topRecurringThought: RecurringThoughtSuggestion | null;
  insightCards: InsightCardModel[];
  hasInsights: boolean;
  showProgramCard: boolean;
}

/**
 * Pure view-model derivation for the CBT home screen. Mirrors the former inline
 * block verbatim, with one deliberate hardening: `hasInsights` is derived from
 * the built insight cards (`insightCards.length > 0`) rather than a parallel
 * hand-maintained OR-gate, so the gate can no longer drift from what renders.
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
  const latestRecord = thoughtRecords?.[0] ?? null;
  const personalSlogan = recoveryPlan?.personalSlogan.trim() || insights.slogan;
  const topDistortion = insights.topDistortions[0] ?? null;
  const otherDistortions = insights.topDistortions.slice(1);
  const topRecurringThought = insights.recurringThoughtSuggestions[0] ?? null;
  const insightCards = buildInsightCards(insights, t);
  const hasInsights = insightCards.length > 0;
  const showProgramCard = program.status !== "not_started" || !promptDismissedAt;

  return {
    activeGoals,
    latestRecord,
    personalSlogan,
    topDistortion,
    otherDistortions,
    topRecurringThought,
    insightCards,
    hasInsights,
    showProgramCard,
  };
}

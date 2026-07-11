import { useTranslation } from "react-i18next";

import { CbtProgramCard } from "@/src/components/app/cbt-program-card";
import { ProgramGraduation } from "@/src/components/app/program-graduation";
import type { CbtProgramView } from "@/src/features/cbt/derive-cbt-program";

interface CbtProgramSectionProps {
  program: CbtProgramView;
  isPending: boolean;
  showProgramCard: boolean;
  graduationDismissedAt: string | null;
  onStart: () => void;
  onAdvance: () => void;
  onRequestAbandon: () => void;
  onDismissStart: () => void;
  onDismissGraduation: () => void;
  onReplay: () => void;
}

export function CbtProgramSection({
  program,
  isPending,
  showProgramCard,
  graduationDismissedAt,
  onStart,
  onAdvance,
  onRequestAbandon,
  onDismissStart,
  onDismissGraduation,
  onReplay,
}: CbtProgramSectionProps) {
  const { t } = useTranslation("cbt");

  if (program.status === "graduated") {
    return (
      <ProgramGraduation
        namespace="cbt"
        lines={[
          { n: program.summaryStats.thoughtRecords, key: "program.statThoughtRecords" },
          { n: program.summaryStats.activitiesCompleted, key: "program.statActivities" },
          { n: program.summaryStats.goalsSet, key: "program.statGoals" },
          { n: program.summaryStats.beliefsExamined, key: "program.statBeliefs" },
        ]
          .filter((stat) => stat.n > 0)
          .map((stat) => t(stat.key, { count: stat.n }))}
        dismissed={graduationDismissedAt != null}
        onDismiss={onDismissGraduation}
        onReplay={onReplay}
      />
    );
  }

  if (showProgramCard) {
    return (
      <CbtProgramCard
        program={program}
        isPending={isPending}
        onStart={onStart}
        onAdvance={onAdvance}
        onAbandon={program.status === "in_progress" ? onRequestAbandon : undefined}
        onDismissStart={program.status === "not_started" ? onDismissStart : undefined}
      />
    );
  }

  return null;
}

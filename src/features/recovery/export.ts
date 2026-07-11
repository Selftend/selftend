import type { TFunction } from "i18next";

import type { sanitizeRecoveryValues } from "@/src/features/recovery/form-values";
import type { RecoveryStat } from "@/src/features/recovery/stats";
import { formatDate, getTimelineLabel, type TimelineItem } from "@/src/features/recovery/timeline";
import type { ChallengePlan } from "@/src/features/recovery/types";
import { isStrategyKey } from "@/src/features/cbt/strategies";

function appendExportList(lines: string[], title: string, values: string[], emptyLabel: string) {
  lines.push("", `## ${title}`);
  if (values.length === 0) {
    lines.push(emptyLabel);
    return;
  }

  for (const value of values) {
    lines.push(`- ${value}`);
  }
}

export function buildRecoveryPlanExport({
  challengePlans,
  lang,
  recoveryValues,
  stats,
  t,
  timelineItems,
}: {
  challengePlans: ChallengePlan[];
  lang: string;
  recoveryValues: ReturnType<typeof sanitizeRecoveryValues>;
  stats: RecoveryStat[];
  t: TFunction<"cbt">;
  timelineItems: TimelineItem[];
}) {
  const emptyLabel = t("recovery.export.empty");
  const lines = [
    `# ${t("recovery.export.fileTitle")}`,
    "",
    t("recovery.export.generatedAt", { date: formatDate(new Date().toISOString(), lang) }),
  ];

  lines.push("", `## ${t("recovery.stats.title")}`);
  for (const stat of stats) {
    lines.push(`- ${t(`recovery.stats.${stat.key}`, { count: stat.value })}: ${stat.value}`);
  }

  lines.push("", `## ${t("recovery.timeline.title")}`);
  if (timelineItems.length === 0) {
    lines.push(emptyLabel);
  } else {
    for (const item of timelineItems) {
      lines.push(
        `- ${formatDate(item.date, lang)}: ${getTimelineLabel(t, item.key)} (${t(
          "recovery.timeline.count",
          {
            count: item.count,
          },
        )})`,
      );
    }
  }

  appendExportList(lines, t("recovery.recoveryKeys"), recoveryValues.recoveryKeys, emptyLabel);

  lines.push("", `## ${t("recovery.personalSlogan")}`);
  lines.push(recoveryValues.personalSlogan || emptyLabel);

  lines.push("", `## ${t("recovery.strategyNotes")}`);
  const strategyNotes = Object.entries(recoveryValues.strategyIntegrationNotes);
  if (strategyNotes.length === 0) {
    lines.push(emptyLabel);
  } else {
    for (const [strategyKey, note] of strategyNotes) {
      const label = isStrategyKey(strategyKey)
        ? t(`dashboard.strategies.${strategyKey}`)
        : strategyKey;
      lines.push(`- ${label}: ${note}`);
    }
  }

  lines.push("", `## ${t("recovery.challengePlans")}`);
  if (challengePlans.length === 0) {
    lines.push(emptyLabel);
  } else {
    for (const plan of challengePlans) {
      lines.push(`- ${plan.challengeDescription}`);
      for (const step of plan.copingSteps) {
        lines.push(`  - ${step}`);
      }
    }
  }

  appendExportList(
    lines,
    t("recovery.maintenanceCommitments"),
    recoveryValues.maintenanceCommitments,
    emptyLabel,
  );

  return lines.join("\n");
}

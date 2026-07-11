import type { TFunction } from "i18next";

import type { RecoverySources } from "@/src/features/recovery/sources";
import type { StrategyKey } from "@/src/features/cbt/strategies";

export type TimelineKey = StrategyKey | "mood" | "recovery";

export interface TimelineItem {
  key: TimelineKey;
  date: string;
  count: number;
}

export function formatDate(value: string, lang: string) {
  return new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(new Date(value));
}

function earliestDate<T>(
  records: readonly T[] | undefined,
  getDate: (record: T) => string | null | undefined,
) {
  const dates = records?.map(getDate).filter((value): value is string => Boolean(value)) ?? [];
  return dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;
}

function createTimelineItem<T>(
  key: TimelineKey,
  records: readonly T[] | undefined,
  getDate: (record: T) => string | null | undefined,
): TimelineItem | null {
  if (!records || records.length === 0) {
    return null;
  }

  const date = earliestDate(records, getDate);
  return date ? { key, date, count: records.length } : null;
}

export function getTimelineLabel(t: TFunction<"cbt">, key: TimelineKey) {
  if (key === "mood" || key === "recovery") {
    return t(`recovery.timeline.${key}`);
  }

  return t(`dashboard.strategies.${key}`);
}

export function buildTimeline(
  sources: RecoverySources,
  recoveryPlan: { createdAt: string } | null | undefined,
): TimelineItem[] {
  const {
    activities,
    angerLogs,
    beliefs,
    goals,
    hierarchies,
    mindfulnessSessions,
    moodLogs,
    selfCareLogs,
    tasks,
    thoughtRecords,
    valuesProfile,
    worries,
  } = sources;

  const items = [
    createTimelineItem("mood", moodLogs, (log) => log.loggedAt),
    createTimelineItem("goals", goals, (goal) => goal.createdAt),
    createTimelineItem("activities", activities, (activity) => activity.createdAt),
    createTimelineItem("thoughts", thoughtRecords, (record) => record.createdAt),
    createTimelineItem(
      "values",
      valuesProfile ? [valuesProfile] : undefined,
      (profile) => profile.updatedAt,
    ),
    createTimelineItem("beliefs", beliefs, (belief) => belief.createdAt),
    createTimelineItem("exposure", hierarchies, (hierarchy) => hierarchy.createdAt),
    createTimelineItem("worry", worries, (worry) => worry.createdAt),
    createTimelineItem("mindfulness", mindfulnessSessions, (session) => session.completedAt),
    createTimelineItem("tasks", tasks, (task) => task.createdAt),
    createTimelineItem("anger", angerLogs, (log) => log.createdAt),
    createTimelineItem("selfCare", selfCareLogs, (log) => log.createdAt),
    recoveryPlan ? { key: "recovery" as const, date: recoveryPlan.createdAt, count: 1 } : null,
  ];

  return items
    .filter((item): item is TimelineItem => Boolean(item))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

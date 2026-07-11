import type { RecoverySources } from "@/src/features/recovery/sources";
import { toLocalDateKey } from "@/src/stores/selected-date-store";

export interface RecoveryStat {
  key:
    | "thoughtRecords"
    | "exposuresCompleted"
    | "moodDays"
    | "goalsAchieved"
    | "activitiesCompleted";
  value: number;
}

export function computeRecoveryStats(sources: RecoverySources): RecoveryStat[] {
  const { activities, exposureItems, goals, moodLogs, thoughtRecords } = sources;
  const moodDays = new Set((moodLogs ?? []).map((log) => toLocalDateKey(log.loggedAt)));

  return [
    { key: "thoughtRecords", value: thoughtRecords?.length ?? 0 },
    {
      key: "exposuresCompleted",
      value: exposureItems?.filter((item) => item.completedAt).length ?? 0,
    },
    { key: "moodDays", value: moodDays.size },
    {
      key: "goalsAchieved",
      value: goals?.filter((goal) => goal.status === "completed").length ?? 0,
    },
    {
      key: "activitiesCompleted",
      value: activities?.filter((activity) => activity.completedAt).length ?? 0,
    },
  ];
}

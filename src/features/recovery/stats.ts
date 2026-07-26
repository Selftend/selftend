import type { RecoverySources } from "@/src/features/recovery/sources";

export interface RecoveryStat {
  key:
    "thoughtRecords" | "exposuresCompleted" | "moodDays" | "goalsAchieved" | "activitiesCompleted";
  value: number;
}

export function computeRecoveryStats(sources: RecoverySources): RecoveryStat[] {
  const { activities, exposureItems, goals, moodLogs, thoughtRecords } = sources;
  // Distinct days the user checked in on, counted by the civil day captured with
  // each log — travel must not merge two days into one or split one into two.
  const moodDays = new Set((moodLogs ?? []).map((log) => log.dayKey));

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

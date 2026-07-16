import { useLocalSearchParams } from "expo-router";

import { RoutineDetailScreen } from "@/src/features/routines/routine-detail-screen";

export default function RoutineDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (typeof id !== "string" || !id) return null;
  return <RoutineDetailScreen routineId={id} />;
}

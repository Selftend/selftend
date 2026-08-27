import { useLocalSearchParams } from "expo-router";

import NotFoundScreen from "@/src/components/app/not-found-screen";
import { RoutineDetailScreen } from "@/src/features/routines/routine-detail-screen";

export default function RoutineDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // A segment naming no routine is a URL that matched no record, which is what
  // this screen says - and it says it with chrome. Returning null rendered a
  // blank screen with nothing on it to press (#1328).
  if (typeof id !== "string" || !id) return <NotFoundScreen />;
  return <RoutineDetailScreen routineId={id} />;
}

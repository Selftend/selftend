import { useLocalSearchParams } from "expo-router";

import NotFoundScreen from "@/src/components/app/not-found-screen";
import { HabitDetailScreen } from "@/src/features/habits/habit-detail-screen";

export default function HabitDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // A segment naming no habit is a URL that matched no record, which is what
  // this screen says - and it says it with chrome. Returning null rendered a
  // blank screen with nothing on it to press (#1328).
  if (typeof id !== "string" || !id) return <NotFoundScreen />;
  return <HabitDetailScreen habitId={id} />;
}

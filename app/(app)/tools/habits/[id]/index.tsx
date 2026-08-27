import { useLocalSearchParams } from "expo-router";

import NotFoundScreen from "@/src/components/app/not-found-screen";
import { HabitDetailScreen } from "@/src/features/habits/habit-detail-screen";

export default function HabitDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Not `null`: a segment naming no habit used to render a blank screen with
  // nothing on it to press (#1328).
  if (typeof id !== "string" || !id) return <NotFoundScreen />;
  return <HabitDetailScreen habitId={id} />;
}

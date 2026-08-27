import { useLocalSearchParams } from "expo-router";

import NotFoundScreen from "@/src/components/app/not-found-screen";
import { HabitsLearnDetailScreen } from "@/src/features/habits/habits-learn-screen";

export default function HabitsLearnDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  // A segment naming no article is a URL that matched no record, which is what
  // this screen says - and it says it with chrome. Returning null rendered a
  // blank screen with nothing on it to press (#1328).
  if (typeof slug !== "string" || !slug) return <NotFoundScreen />;
  return <HabitsLearnDetailScreen slug={slug} />;
}

import { useLocalSearchParams } from "expo-router";

import NotFoundScreen from "@/src/components/app/not-found-screen";
import DbtScriptDetailScreen from "@/src/features/dbt/dbt-script-detail-screen";

export default function DbtScriptDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Not `null`: a missing id would otherwise render a blank screen with nothing
  // on it to press (#1328). A malformed id still reaches the screen, where the
  // repository's uuid check turns it into the not-found state.
  if (typeof id !== "string" || !id) return <NotFoundScreen />;
  return <DbtScriptDetailScreen id={id} />;
}

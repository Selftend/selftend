import { Redirect } from "expo-router";

import { LoadingState } from "@/src/components/loading-state";
import { Screen } from "@/src/components/screen";
import { useSession } from "@/src/providers/session-provider";

export default function IndexScreen() {
  const { session, status } = useSession();

  if (status === "loading") {
    return (
      <Screen scroll={false} title="Loading">
        <LoadingState label="Preparing your workspace..." />
      </Screen>
    );
  }

  if (session) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}

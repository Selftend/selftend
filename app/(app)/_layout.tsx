import { Redirect, Stack } from "expo-router";

import { LoadingState } from "@/src/components/loading-state";
import { Screen } from "@/src/components/screen";
import { useSession } from "@/src/providers/session-provider";

export default function ProtectedLayout() {
  const { session, status } = useSession();

  if (status === "loading") {
    return (
      <Screen scroll={false} title="Loading">
        <LoadingState label="Restoring your session..." />
      </Screen>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: "#f7f3ea" },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#f7f3ea" },
        headerTintColor: "#20312c",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="cbt/index" options={{ title: "CBT" }} />
      <Stack.Screen name="cbt/learn" options={{ title: "Learn distortions" }} />
      <Stack.Screen name="cbt/new" options={{ title: "Thought record" }} />
      <Stack.Screen name="cbt/[id]" options={{ title: "Record details" }} />
      <Stack.Screen name="support" options={{ title: "Support" }} />
      <Stack.Screen name="legal" options={{ title: "Legal and boundaries" }} />
    </Stack>
  );
}

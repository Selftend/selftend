import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { useSession } from "@/src/providers/session-provider";

export default function ProtectedLayout() {
  const { session, status } = useSession();

  if (status === "loading") {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Text variant="h1">Loading</Text>
          <ActivityIndicator />
          <Text variant="muted">Restoring your session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
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

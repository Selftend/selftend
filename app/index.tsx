import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { useSession } from "@/src/providers/session-provider";

export default function IndexScreen() {
  const { session, status } = useSession();

  if (status === "loading") {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Text variant="h1">Loading</Text>
          <ActivityIndicator />
          <Text variant="muted">Preparing your workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (session) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}

import { Redirect } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { AuthLandingBlock } from "@/src/components/auth-landing-block";
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="grow items-center justify-center p-6"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-sm">
          <AuthLandingBlock />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

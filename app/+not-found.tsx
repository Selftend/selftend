import { Link } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";

export default function NotFoundScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-4 p-6">
        <Text variant="h1">Page not found</Text>
        <Link href="/" replace>
          <Text>Home</Text>
        </Link>
      </View>
    </SafeAreaView>
  );
}

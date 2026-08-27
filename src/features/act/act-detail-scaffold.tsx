import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { Text } from "@/src/components/react-native-reusables/text";

/**
 * ☠️ Delegates to `ScreenLoading` rather than rolling its own `SafeAreaView`,
 * so it inherits the Escape instead of dropping it. This helper looked safe and
 * was the reason six ACT detail screens had no way out while loading (#1328).
 */
export function ActDetailLoading({ title }: { title: string }) {
  return <ScreenLoading title={title} />;
}

export function ActDetailNotFound({ title, message }: { title: string; message: string }) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <ScreenHeader title={title} />
          <Text variant="muted">{message}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

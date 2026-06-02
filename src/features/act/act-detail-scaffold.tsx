import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { LoadingState } from "@/src/components/app/screen-state";
import { Text } from "@/src/components/react-native-reusables/text";

export function ActDetailLoading({ title }: { title: string }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center">
        <LoadingState title={title} />
      </View>
    </SafeAreaView>
  );
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

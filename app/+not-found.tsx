import { router } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/src/components/button";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";

export default function NotFoundScreen() {
  return (
    <Screen
      footer={<Button onPress={() => router.replace("/")} text="Go to the app" />}
      scroll={false}
      subtitle="The screen you requested does not exist in the current build."
      title="Not found"
    >
      <NoticeCard
        body="This repository is still early. If you followed an old route or an unfinished link, go back to the app shell."
        title="Early scaffold"
      />
      <View className="gap-2">
        <Text className="text-lg font-semibold text-ink">What is available now</Text>
        <Text className="text-sm leading-6 text-ink/70">
          The first complete section is CBT, alongside auth, settings, support, and history.
        </Text>
      </View>
    </Screen>
  );
}

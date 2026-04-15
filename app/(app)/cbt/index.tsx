import { router } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/src/components/button";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";
import { SectionLinkCard } from "@/src/components/section-link-card";

export default function CbtHomeScreen() {
  return (
    <Screen
      subtitle="A focused CBT section built around thought records, distortion awareness, and quiet review."
      title="CBT"
    >
      <NoticeCard
        body="The first build stays narrow on purpose: one practical tool, a small learn surface, and a private history."
        title="Why the scope is narrow"
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button onPress={() => router.push("/cbt/new")} text="New record" />
        </View>
        <View className="flex-1">
          <Button onPress={() => router.push("/cbt/learn")} text="Learn" variant="secondary" />
        </View>
      </View>

      <SectionLinkCard
        description="See the core thinking patterns this section currently focuses on."
        icon="book-outline"
        onPress={() => router.push("/cbt/learn")}
        title="Distortion guide"
      />
      <SectionLinkCard
        description="Review the records you have already saved without mixing CBT with unrelated modules."
        icon="reader-outline"
        onPress={() => router.push("/(app)/(tabs)/history")}
        title="Record history"
      />

      <View className="gap-2">
        <Text className="text-lg font-semibold text-ink">The current flow</Text>
        <Text className="text-sm leading-6 text-ink/70">
          Capture the situation, name the first thought, choose emotions, notice distortions, and respond with a more
          balanced thought.
        </Text>
      </View>
    </Screen>
  );
}

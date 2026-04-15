import { Text, View } from "react-native";

import { Card } from "@/src/components/card";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";
import { distortionDefinitions } from "@/src/constants/distortions";

export default function LearnScreen() {
  return (
    <Screen
      subtitle="Short, app-owned explanations of the distortion patterns the first CBT slice supports."
      title="Distortion guide"
    >
      <NoticeCard
        body="These patterns are prompts for reflection, not labels to pin on yourself."
        title="Use gently"
      />

      {distortionDefinitions.map((distortion) => (
        <Card key={distortion.key}>
          <View className="gap-3">
            <Text className="text-xl font-semibold text-ink">{distortion.title}</Text>
            <Text className="text-sm leading-6 text-ink/70">{distortion.shortDescription}</Text>
            <View className="rounded-2xl bg-mist px-4 py-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-ink/50">Reflection prompt</Text>
              <Text className="mt-1 text-sm leading-6 text-ink">{distortion.reflectionPrompt}</Text>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

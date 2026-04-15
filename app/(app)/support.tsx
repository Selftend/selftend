import * as Linking from "expo-linking";
import { Text, View } from "react-native";

import { Button } from "@/src/components/button";
import { Card } from "@/src/components/card";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";
import { appEnv } from "@/src/lib/env";

export default function SupportScreen() {
  return (
    <Screen
      subtitle="The support surface stays practical: project links, contribution entry points, and scope boundaries."
      title="Support"
    >
      <NoticeCard
        body="This app is built as guided self-help. If you need urgent help or crisis support, use your local emergency and crisis resources instead of relying on the app."
        title="Important boundary"
        tone="warning"
      />

      <Card>
        <View className="gap-4">
          <Text className="text-lg font-semibold text-ink">Project links</Text>
          <Button onPress={() => void Linking.openURL(appEnv.githubRepoUrl)} text="Open repository" />
          <Button
            onPress={() => void Linking.openURL(`${appEnv.githubRepoUrl}/blob/main/CONTRIBUTING.md`)}
            text="Open contribution guide"
            variant="secondary"
          />
        </View>
      </Card>

      <Card>
        <View className="gap-3">
          <Text className="text-lg font-semibold text-ink">What belongs here</Text>
          <Text className="text-sm leading-6 text-ink/70">
            GitHub, contribution guidance, gratitude, legal docs, and calm explanations of what the product is and is
            not.
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

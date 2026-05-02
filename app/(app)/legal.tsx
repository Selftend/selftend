import { router } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/src/components/button";
import { Card } from "@/src/components/card";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";

export default function LegalScreen() {
  return (
    <Screen
      subtitle="Product boundaries, public policy pages, and launch-review reminders."
      title="Legal and boundaries"
    >
      <NoticeCard
        body="Policy text is in place for implementation review, but final organization details, contact details, and legal approval are still required before public launch."
        title="Launch review required"
        tone="warning"
      />
      <Card>
        <View className="gap-3">
          <Text className="text-lg font-semibold text-ink">Product boundary</Text>
          <Text className="text-sm leading-6 text-ink/70">
            This app is for wellness and guided self-help. It does not diagnose, prescribe, replace therapy, or act as
            emergency support.
          </Text>
        </View>
      </Card>
      <Card>
        <View className="gap-4">
          <Text className="text-lg font-semibold text-ink">Public pages</Text>
          <Button onPress={() => router.push("/privacy")} text="Open privacy policy" variant="secondary" />
          <Button onPress={() => router.push("/terms")} text="Open terms and boundaries" variant="ghost" />
          <Button onPress={() => router.push("/crisis")} text="Open crisis guidance" variant="ghost" />
          <Button onPress={() => router.push("/account-deletion")} text="Open account deletion" variant="ghost" />
        </View>
      </Card>
      <Card>
        <View className="gap-3">
          <Text className="text-lg font-semibold text-ink">License direction</Text>
          <Text className="text-sm leading-6 text-ink/70">
            The repository is planned under AGPL-3.0-only. Reference repos and curated resource lists may inform design
            decisions, but their code, text, and assets are not copied casually into this project.
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

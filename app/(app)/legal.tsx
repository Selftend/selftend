import { Text, View } from "react-native";

import { Card } from "@/src/components/card";
import { Screen } from "@/src/components/screen";

export default function LegalScreen() {
  return (
    <Screen
      subtitle="A short in-app stub until the hosted privacy policy, terms, and crisis guidance are finalized."
      title="Legal and boundaries"
    >
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
        <View className="gap-3">
          <Text className="text-lg font-semibold text-ink">Privacy posture</Text>
          <Text className="text-sm leading-6 text-ink/70">
            The MVP keeps data collection narrow: account access, preferences, and private CBT records. Additional
            tracking or social features require explicit review.
          </Text>
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

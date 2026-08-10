import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { GlowBackdrop } from "@/src/features/grounding/glow-backdrop";
import { HueButton } from "@/src/features/grounding/hue-button";
import { HueIconBadge } from "@/src/features/grounding/hue-icon-badge";

interface GroundingDoneProps {
  onDone: () => void;
}

export function GroundingDone({ onDone }: GroundingDoneProps) {
  const { t } = useTranslation("cbt");
  return (
    <SafeAreaView className="flex-1 bg-background">
      <GlowBackdrop />
      <ScrollView contentContainerClassName="grow" showsVerticalScrollIndicator={false}>
        <View className="flex-1 items-center justify-center gap-4 px-8 py-8">
          <HueIconBadge icon="spa" size={96} iconSize={46} shape="circle" />
          <Text variant="h1" className="text-center">
            {t("grounding.complete")}
          </Text>
          <Text variant="muted" className="max-w-[28ch] text-center">
            {t("grounding.doneMessage")}
          </Text>
        </View>
        <View className="px-6 pb-8">
          <HueButton label={t("common:done")} onPress={onDone} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

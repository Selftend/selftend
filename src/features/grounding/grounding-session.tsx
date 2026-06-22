import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { GlowBackdrop } from "@/src/features/grounding/glow-backdrop";
import { HueButton } from "@/src/features/grounding/hue-button";
import { HueIconBadge } from "@/src/features/grounding/hue-icon-badge";
import { ProgressSegments } from "@/src/features/grounding/progress-segments";
import type { GroundingTechnique } from "@/src/constants/grounding";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface GroundingSessionProps {
  technique: GroundingTechnique;
  techniqueTitle: string;
  stepText: string;
  stepLabel: string;
  stepIndex: number; // 0-based
  total: number;
  isLast: boolean;
  onNext: () => void;
  onExit: () => void;
}

export function GroundingSession({
  technique,
  techniqueTitle,
  stepText,
  stepLabel,
  stepIndex,
  total,
  isLast,
  onNext,
  onExit,
}: GroundingSessionProps) {
  const { t } = useTranslation("cbt");
  const stepConfig = technique.steps[stepIndex];
  const hue = stepConfig.hue;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <GlowBackdrop hue={hue} />

      <ScrollView contentContainerClassName="grow" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between px-4 pt-2">
          <Pressable
            accessibilityLabel={t("common:actions.close", "Close")}
            accessibilityRole="button"
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={onExit}
            role="button"
          >
            <Icon name="close" size={22} className="text-foreground" />
          </Pressable>
          <Text variant="eyebrow" tint={hue}>
            {techniqueTitle}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <View className="px-6 pt-4">
          <ProgressSegments total={total} current={stepIndex} hue={hue} />
        </View>

        <View className="flex-1 items-center justify-center gap-3 px-8 py-8">
          <HueIconBadge icon={stepConfig.icon} hue={hue} size={108} iconSize={48} shape="circle" />
          <Text variant="eyebrow" tint={hue} className="mt-4">
            {t("grounding.stepCounter", { label: stepLabel, current: stepIndex + 1, total })}
          </Text>
          <Text className="text-center text-2xl font-semibold leading-relaxed">{stepText}</Text>
        </View>

        <View className="px-6 pb-8">
          <HueButton
            hue={hue}
            label={isLast ? t("grounding.finish") : t("grounding.next")}
            onPress={onNext}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

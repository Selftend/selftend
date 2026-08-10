import { Animated, Pressable, ScrollView, View } from "react-native";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { GlowBackdrop } from "@/src/features/grounding/glow-backdrop";
import { HueButton } from "@/src/features/grounding/hue-button";
import { HueIconBadge } from "@/src/features/grounding/hue-icon-badge";
import { ProgressSegments } from "@/src/features/grounding/progress-segments";
import type { GroundingTechnique } from "@/src/constants/grounding";
import { DEFAULT_INTERACTIVE_HIT_SLOP, useReduceMotionEnabled } from "@/src/lib/accessibility";
import { Button } from "@/src/components/react-native-reusables/button";

interface GroundingSessionProps {
  technique: GroundingTechnique;
  techniqueTitle: string;
  stepText: string;
  stepLabel: string;
  stepIndex: number; // 0-based
  total: number;
  isLast: boolean;
  onNext: () => void;
  onBack: () => void;
  onStepSelect: (index: number) => void;
  onExit: () => void;
  saving?: boolean;
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
  onBack,
  onStepSelect,
  onExit,
  saving = false,
}: GroundingSessionProps) {
  const { t } = useTranslation("cbt");
  const stepConfig = technique.steps[stepIndex];
  const reduceMotion = useReduceMotionEnabled();
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <GlowBackdrop />

      <ScrollView contentContainerClassName="grow" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between px-4 pt-2">
          <Pressable
            accessibilityLabel={t("common:close", "Close")}
            accessibilityRole="button"
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={onExit}
            role="button"
          >
            <Icon name="close" size={22} className="text-foreground" />
          </Pressable>
          <Text variant="eyebrow">{techniqueTitle}</Text>
          <Text variant="muted" className="min-w-[48px] text-right text-xs tabular-nums">
            {t("grounding.stepShort", { current: stepIndex + 1, total })}
          </Text>
        </View>

        <View className="px-6 pt-4">
          <ProgressSegments total={total} current={stepIndex} onSelect={onStepSelect} />
        </View>

        <View className="flex-1 items-center justify-center gap-3 px-8 py-8">
          <Animated.View
            testID="grounding-pulse"
            style={{
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }),
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
              ],
            }}
          >
            <HueIconBadge icon={stepConfig.icon} size={92} iconSize={42} shape="circle" />
          </Animated.View>
          <Text variant="eyebrow" className="mt-4">
            {t("grounding.stepCounter", { label: stepLabel, current: stepIndex + 1, total })}
          </Text>
          <Text className="max-w-[22ch] text-center text-[26px] font-semibold leading-relaxed">
            {stepText}
          </Text>
        </View>

        <View className="gap-3 px-6 pb-8">
          <View className="flex-row items-center gap-3">
            <Button
              className="min-h-12 min-w-24"
              disabled={stepIndex === 0 || saving}
              onPress={onBack}
              variant="outline"
            >
              <Text>{t("grounding.back")}</Text>
            </Button>
            <View className="flex-1">
              <HueButton
                label={isLast ? t("grounding.finish") : t("grounding.next")}
                loading={saving}
                onPress={onNext}
              />
            </View>
          </View>
          <Text variant="muted" className="text-center text-sm">
            {t("grounding.takeYourTime")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

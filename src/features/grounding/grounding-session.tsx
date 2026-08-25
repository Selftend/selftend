import { Animated, useWindowDimensions, View } from "react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { Button } from "@/src/components/react-native-reusables/button";
import { FocusSessionShell } from "@/src/components/app/focus-session-shell";
import { HueIconBadge } from "@/src/features/grounding/hue-icon-badge";
import { ProgressSegments } from "@/src/components/app/progress-segments";
import type { GroundingTechnique } from "@/src/constants/grounding";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

interface GroundingSessionProps {
  technique: GroundingTechnique;
  techniqueTitle: string;
  stepText: string;
  stepLabel: string;
  /** The quiet line under the prompt (design 5b + #783's AC); "" renders none. */
  stepHint: string;
  stepIndex: number; // 0-based
  total: number;
  isLast: boolean;
  onNext: () => void;
  onBack: () => void;
  onStepSelect: (index: number) => void;
  onFinishEarly: () => void;
  saving?: boolean;
}

/**
 * The live step screen, on `FocusSessionShell` like breathing and meditation
 * (#874 — #777 decided one surface for all three session tools; grounding
 * merely shipped two days before the shell existed). The shell brings the
 * measured focus wash and the eyebrow/progress top row; there is still no
 * close glyph, but the session is no longer exitless (#928 reversed #874's
 * stance): the same inline "Finish early" ghost button breathing and
 * meditation carry is the invited way out, saving and landing on the done
 * screen. The OS/web back action stays the uninvited exit, answered by the
 * flow's finish-or-continue dialog.
 */
export function GroundingSession({
  technique,
  techniqueTitle,
  stepText,
  stepLabel,
  stepHint,
  stepIndex,
  total,
  isLast,
  onNext,
  onBack,
  onStepSelect,
  onFinishEarly,
  saving = false,
}: GroundingSessionProps) {
  const { t } = useTranslation("cbt");
  const stepConfig = technique.steps[stepIndex];
  const reduceMotion = useReduceMotionEnabled();
  const [pulse] = useState(() => new Animated.Value(0));
  // The design's desktop footer is three-part (Back · caption · Next); the
  // phone footer stacks the caption above a Back + full-width Next row.
  const { width: windowWidth } = useWindowDimensions();
  const wideFooter = windowWidth >= 640;

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

  const backButton = (
    <Button
      disabled={stepIndex === 0 || saving}
      onPress={onBack}
      variant={wideFooter ? "ghost" : "outline"}
    >
      <Text>{t("grounding.back")}</Text>
    </Button>
  );
  // A normal button, never a full-bleed bar — the design annotation says so in
  // as many words (#874). On a phone it widens inside the footer row instead.
  const nextButton = (
    <Button disabled={saving} onPress={onNext}>
      <Text>{isLast ? t("grounding.finish") : t("grounding.next")}</Text>
    </Button>
  );

  return (
    <FocusSessionShell
      eyebrow={techniqueTitle}
      trailing={t("grounding.stepShort", { current: stepIndex + 1, total })}
    >
      <View className="pt-4">
        <ProgressSegments total={total} current={stepIndex} onSelect={onStepSelect} />
      </View>

      <View className="grow items-center justify-center gap-3 px-2 py-8">
        <Animated.View
          testID="grounding-pulse"
          style={{
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }),
            transform: [
              { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
            ],
          }}
        >
          <HueIconBadge icon={stepConfig.icon} size={92} iconSize={34} shape="circle" />
        </Animated.View>
        <Text variant="eyebrow" className="mt-4">
          {t("grounding.stepCounter", { label: stepLabel, current: stepIndex + 1, total })}
        </Text>
        <Text className="max-w-[22ch] text-center text-[26px] font-bold leading-[1.25] tracking-tight">
          {stepText}
        </Text>
        {stepHint ? (
          <Text variant="muted" className="max-w-[34ch] text-center text-sm leading-relaxed">
            {stepHint}
          </Text>
        ) : null}
      </View>

      {wideFooter ? (
        <View className="flex-row items-center justify-between gap-4 border-t border-border pt-5">
          {backButton}
          <Text variant="muted" className="shrink text-center text-[12.5px]">
            {t("grounding.takeYourTime")}
          </Text>
          {nextButton}
        </View>
      ) : (
        <View className="gap-3 border-t border-border pt-4">
          <Text variant="muted" className="text-center text-[12.5px]">
            {t("grounding.takeYourTime")}
          </Text>
          <View className="flex-row gap-2.5">
            {backButton}
            <View className="flex-1">{nextButton}</View>
          </View>
        </View>
      )}

      {/* The siblings' bottom-centred ghost exit (breathing/meditation carry it
          next to Pause; grounding has no clock, so it stands alone). */}
      <View className="flex-row items-center justify-center pb-1 pt-3">
        <Button disabled={saving} onPress={onFinishEarly} variant="ghost">
          <Text>{t("grounding.finishEarly.label")}</Text>
        </Button>
      </View>
    </FocusSessionShell>
  );
}

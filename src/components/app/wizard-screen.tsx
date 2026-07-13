import { type ReactNode, useState } from "react";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";

import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { NARROW_STEP_INDICATOR_BREAKPOINT } from "@/src/constants/layout";
import { currentStateProps } from "@/src/lib/accessibility";

interface WizardStep {
  title: string;
}

interface WizardScreenProps {
  title: string;
  description?: string;
  steps: readonly WizardStep[];
  stepIndex: number;
  numberedSteps?: boolean;
  onJumpToStep: (index: number) => void;
  onBack: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  pendingLabel: string;
  backLabel: string;
  discardLabel?: string;
  onDiscard?: () => void;
  isPending: boolean;
  headerSlot?: ReactNode;
  titleAction?: ReactNode;
  children: ReactNode;
}

export function WizardScreen({
  title,
  description,
  steps,
  stepIndex,
  numberedSteps = false,
  onJumpToStep,
  onBack,
  onPrimary,
  primaryLabel,
  pendingLabel,
  backLabel,
  discardLabel,
  onDiscard,
  isPending,
  headerSlot,
  titleAction,
  children,
}: WizardScreenProps) {
  const { t } = useTranslation("navigation");
  const { width } = useWindowDimensions();
  const isNarrow = width < NARROW_STEP_INDICATOR_BREAKPOINT;
  const [stepsOpen, setStepsOpen] = useState(false);
  const showStepList = !isNarrow || stepsOpen;
  const currentStep = steps[stepIndex];
  const summary = t("wizard.stepSummary", {
    current: stepIndex + 1,
    total: steps.length,
    name: currentStep?.title ?? "",
  });

  return (
    <MobileFormScreen
      footer={
        <View className="gap-2">
          {onDiscard && discardLabel ? (
            <Button disabled={isPending} onPress={onDiscard} variant="ghost">
              <Text className="text-destructive">{discardLabel}</Text>
            </Button>
          ) : null}
          <View className="flex-row gap-3">
            {stepIndex > 0 ? (
              <View className="flex-1">
                <Button onPress={onBack} variant="ghost">
                  <Text>{backLabel}</Text>
                </Button>
              </View>
            ) : null}
            <View className="flex-1">
              <Button disabled={isPending} onPress={onPrimary}>
                {isPending ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{isPending ? pendingLabel : primaryLabel}</Text>
              </Button>
            </View>
          </View>
        </View>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader title={title} right={titleAction} />
          {description ? <Text variant="muted">{description}</Text> : null}
        </View>

        {headerSlot}

        <View className="gap-2">
          {isNarrow ? (
            <Button
              accessibilityLabel={`${summary}. ${t(stepsOpen ? "wizard.hideSteps" : "wizard.showAllSteps")}`}
              aria-expanded={stepsOpen}
              className="justify-between"
              onPress={() => setStepsOpen((open) => !open)}
              variant="outline"
            >
              <Text className="flex-1 text-left font-medium" numberOfLines={1}>
                {summary}
              </Text>
              <Icon
                className="text-muted-foreground"
                name={stepsOpen ? "expand-less" : "expand-more"}
              />
            </Button>
          ) : null}

          {showStepList ? (
            <View className="flex-row flex-wrap gap-2">
              {steps.map((step, index) => {
                const isActive = stepIndex === index;
                const label = numberedSteps ? `${index + 1}. ${step.title}` : step.title;
                return (
                  <Button
                    key={step.title}
                    {...currentStateProps(isActive, "step")}
                    disabled={index > stepIndex}
                    onPress={() => onJumpToStep(index)}
                    size="sm"
                    variant={isActive ? "secondary" : "ghost"}
                  >
                    <Text>{label}</Text>
                  </Button>
                );
              })}
            </View>
          ) : null}
        </View>

        {children}
      </View>
    </MobileFormScreen>
  );
}

import { type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

import { BackButton } from "@/src/components/app/back-button";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";

export interface WizardStep {
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
  isPending,
  headerSlot,
  titleAction,
  children,
}: WizardScreenProps) {
  return (
    <MobileFormScreen
      footer={
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
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <BackButton showLabel={false} className="-ml-2" />
            <Text variant="h1" className="flex-1">
              {title}
            </Text>
            {titleAction}
          </View>
          {description ? <Text variant="muted">{description}</Text> : null}
        </View>

        {headerSlot}

        <View className="flex-row flex-wrap gap-2">
          {steps.map((step, index) => {
            const isActive = stepIndex === index;
            const label = numberedSteps ? `${index + 1}. ${step.title}` : step.title;
            return (
              <Button
                key={step.title}
                accessibilityState={{ disabled: index > stepIndex, selected: isActive }}
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

        {children}
      </View>
    </MobileFormScreen>
  );
}

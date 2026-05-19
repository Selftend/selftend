import { type ReactNode } from "react";
import { ActivityIndicator, Modal, ScrollView, View, type ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OnboardingIllustration } from "@/src/components/app/onboarding-illustration";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

interface RichOnboardingShellProps {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  ctaLabel: string;
  /** When true, the CTA always fires onComplete and the back gesture is a no-op (used by ActInfo). */
  ctaAlwaysCompletes?: boolean;
  onComplete: () => void;
  onDismiss?: () => void;
  children: ReactNode;
  footerSlot?: ReactNode;
}

export function RichOnboardingShell({
  visible,
  isPending = false,
  errorMessage,
  ctaLabel,
  ctaAlwaysCompletes = false,
  onComplete,
  onDismiss,
  children,
  footerSlot,
}: RichOnboardingShellProps) {
  const reduceMotionEnabled = useReduceMotionEnabled();
  const ctaOnPress = ctaAlwaysCompletes ? onComplete : (onDismiss ?? onComplete);

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onDismiss ?? (() => undefined)}
      visible={visible}
    >
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-8 p-6 pb-12">
          {children}

          <View className="gap-3">
            <Button disabled={isPending} onPress={ctaOnPress}>
              {isPending ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>{ctaLabel}</Text>
            </Button>
            {errorMessage ? <Text className="text-sm text-destructive">{errorMessage}</Text> : null}
            {footerSlot}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

interface OnboardingHeroProps {
  illustration: ImageSourcePropType;
  title: string;
  subtitle?: string;
}

export function OnboardingHero({ illustration, title, subtitle }: OnboardingHeroProps) {
  return (
    <View className="items-center gap-3">
      <OnboardingIllustration accessibilityLabel={title} source={illustration} />
      <Text variant="h2" className="text-center">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="muted" className="text-center">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

interface OnboardingInfoRowProps {
  icon: MaterialIconName;
  title: string;
  body: string;
}

export function OnboardingInfoRow({ icon, title, body }: OnboardingInfoRowProps) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="mt-0.5 size-8 items-center justify-center rounded-lg bg-be/15">
        <Icon name={icon} className="size-4 text-be" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-semibold">{title}</Text>
        <Text variant="muted" className="text-sm">
          {body}
        </Text>
      </View>
    </View>
  );
}

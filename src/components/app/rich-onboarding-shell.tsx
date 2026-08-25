import { type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  View,
  type ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressShieldModal } from "@/src/components/app/press-shield-modal";
import { KeyboardAwareScrollView } from "@/src/components/app/keyboard-aware-scroll-view";
import { OnboardingIllustration } from "@/src/components/app/onboarding-illustration";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { KEYBOARD_AVOIDING_BEHAVIOR } from "@/src/lib/keyboard-avoiding";

interface RichOnboardingShellProps {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  ctaLabel: string;
  /** Accessible name for the dialog, usually the onboarding title. */
  accessibilityLabel?: string;
  /**
   * When true the CTA fires `onComplete` instead of `onDismiss`. Passed by
   * `ActInfo` and `AppOnboardingWizard` — on the wizard the CTA advances a
   * panel while `onDismiss` steps back, so a CTA wired to the dismiss would
   * move the wizard the wrong way. It never touches `onRequestClose`; the
   * system close request (Android back, the web Escape key) always goes to
   * `onDismiss`.
   */
  ctaAlwaysCompletes?: boolean;
  onComplete: () => void;
  onDismiss: () => void;
  children: ReactNode;
  footerSlot?: ReactNode;
}

export function RichOnboardingShell({
  visible,
  isPending = false,
  errorMessage,
  ctaLabel,
  accessibilityLabel,
  ctaAlwaysCompletes = false,
  onComplete,
  onDismiss,
  children,
  footerSlot,
}: RichOnboardingShellProps) {
  const ctaOnPress = ctaAlwaysCompletes ? onComplete : onDismiss;

  return (
    <PressShieldModal
      accessibilityLabel={accessibilityLabel}
      // The Escape is the dismiss, not the CTA. On the Guides that is the
      // same callback the CTA fires (M3), except on `AppOnboardingWizard`,
      // where `ctaAlwaysCompletes` makes the CTA advance a panel — an X wired
      // to it would move the wizard forward. The wizard's row is the one
      // surface that ends up wearing a word instead of a glyph; W18 (#1258)
      // promotes its footer "Skip" up here.
      onEscape={onDismiss}
      onRequestClose={onDismiss}
      visible={visible}
    >
      {/* No "top": the wrapper's escape row already sits in the top inset. */}
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-background">
        {/* The starter-routine panel has a name input near the bottom; without
            avoidance the keyboard covers it (edge-to-edge Android especially). */}
        <KeyboardAvoidingView behavior={KEYBOARD_AVOIDING_BEHAVIOR} className="flex-1">
          <KeyboardAwareScrollView contentContainerClassName="mx-auto w-full max-w-2xl gap-8 p-6 pb-12">
            {children}

            <View className="gap-3">
              <Button disabled={isPending} onPress={ctaOnPress}>
                {isPending ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{ctaLabel}</Text>
              </Button>
              {errorMessage ? (
                <Text className="text-sm text-destructive">{errorMessage}</Text>
              ) : null}
              {footerSlot}
            </View>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </PressShieldModal>
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
      <View className="mt-0.5 size-8 items-center justify-center rounded-lg bg-muted">
        <Icon name={icon} className="size-4 text-muted-foreground" />
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

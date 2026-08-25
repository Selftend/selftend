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
  /** When true, the CTA always fires onComplete and the back gesture is a no-op (used by ActInfo). */
  ctaAlwaysCompletes?: boolean;
  onComplete: () => void;
  onDismiss?: () => void;
  /**
   * Overrides what the pinned Escape fires. Without it the Escape is the
   * dismiss (`onDismiss ?? onComplete`) — right on the guides, where dismiss
   * and complete are the same callback. `AppOnboardingWizard` passes its skip
   * path here, because its `onDismiss` is a step-Back and an X wired to it
   * would mean "previous panel" (#1258).
   */
  onEscape?: () => void;
  /**
   * The word the pinned Escape wears in place of the bare X (M2, #1258).
   * Only for a close that decides something that sticks — the first-run
   * gate's skip. Leave off wherever closing is free.
   */
  escapeLabel?: string;
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
  onEscape,
  escapeLabel,
  children,
  footerSlot,
}: RichOnboardingShellProps) {
  const ctaOnPress = ctaAlwaysCompletes ? onComplete : (onDismiss ?? onComplete);

  return (
    <PressShieldModal
      accessibilityLabel={accessibilityLabel}
      // The Escape defaults to the dismiss, not the CTA. On the eight guides
      // that is the same callback the CTA fires (M3). `AppOnboardingWizard`
      // overrides it with its skip path — its dismiss is a step-Back, and its
      // `ctaAlwaysCompletes` CTA advances a panel, so wiring the X to either
      // would make it navigate instead of leave (#1258). `onRequestClose`
      // stays on the dismiss regardless: the system gesture keeps stepping a
      // wizard backwards (M4).
      onEscape={onEscape ?? onDismiss ?? onComplete}
      escapeLabel={escapeLabel}
      onRequestClose={onDismiss ?? (() => undefined)}
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

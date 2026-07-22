import { KeyboardAvoidingView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { KeyboardAwareScrollView } from "@/src/components/app/keyboard-aware-scroll-view";
import { LoadingState } from "@/src/components/app/screen-state";
import { useUserPreferences } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";
import { AccountCard } from "@/src/features/settings/components/account-card";
import { OnboardingCard } from "@/src/features/settings/components/onboarding-card";
import { ProfilePictureCard } from "@/src/features/settings/components/profile-picture-card";
import { RemindersCard } from "@/src/features/settings/components/reminders-card";
import { SecuritySection } from "@/src/features/settings/components/security-section";
import { SettingsFeedbackBanner } from "@/src/features/settings/components/settings-feedback-banner";
import { SettingsHero } from "@/src/features/settings/components/settings-hero";
import { SupportCard } from "@/src/features/settings/components/support-card";
import { useResetOnboarding } from "@/src/features/settings/use-reset-onboarding";
import { useSignOut } from "@/src/features/settings/use-sign-out";
import { KEYBOARD_AVOIDING_BEHAVIOR } from "@/src/lib/keyboard-avoiding";

export default function SettingsScreen() {
  const { t } = useTranslation("settings");
  const { user } = useSession();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { data, isLoading } = useUserPreferences(user?.id ?? null);

  // useSignOut + useResetOnboarding stay at screen level and share the single
  // errorMessage/successMessage banner pair (R7).
  const handleSignOut = useSignOut(user?.id ?? null, setErrorMessage);
  const { reset, isPending: resetPending } = useResetOnboarding(
    user,
    data?.appOnboardingCompletedVia,
    setErrorMessage,
    setSuccessMessage,
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      {/* Keyboard avoidance for the display-name field (edge-to-edge Android
          gets no window resize, so the screen must pad itself). */}
      <KeyboardAvoidingView behavior={KEYBOARD_AVOIDING_BEHAVIOR} className="flex-1">
        <KeyboardAwareScrollView contentContainerClassName="grow p-4">
          <View className="mx-auto w-full max-w-2xl gap-6">
            <SettingsHero />

            {isLoading ? <LoadingState title={t("loading")} /> : null}
            {errorMessage ? (
              <SettingsFeedbackBanner title={t("problem")} message={errorMessage} />
            ) : null}
            {successMessage ? (
              <SettingsFeedbackBanner title={t("saved")} message={successMessage} />
            ) : null}

            <ProfilePictureCard user={user} />

            <RemindersCard />

            <SecuritySection />

            <OnboardingCard
              disabled={!data || resetPending}
              isPending={resetPending}
              onReset={() => void reset()}
            />

            <SupportCard />

            <AccountCard user={user} onSignOut={() => void handleSignOut()} />
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

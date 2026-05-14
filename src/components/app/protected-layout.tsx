import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, Platform, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SidebarNav } from "@/src/components/app/sidebar-nav";
import { Text } from "@/src/components/react-native-reusables/text";
import { AuthLandingScreen } from "@/src/components/app/auth-landing-screen";
import { ConsentModal } from "@/src/components/app/consent-modal";
import { OnboardingModal } from "@/src/components/app/onboarding-modal";
import { DESKTOP_BREAKPOINT } from "@/src/constants/layout";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { policyVersion } from "@/src/features/policies/policy-content";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useLanguageSync } from "@/src/features/settings/use-language-sync";
import { useSession } from "@/src/providers/session-provider";

export default function ProtectedLayout() {
  const { t } = useTranslation("settings");
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const { session, status, user } = useSession();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(user?.id ?? null);
  const appOnboardingMutation = useUpdateUserPreferences(user?.id ?? null);
  const [consentDismissed, setConsentDismissed] = useState(false);

  useLanguageSync(user?.id ?? null, preferences);

  if (status === "loading") {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Text variant="h1">Loading</Text>
          <ActivityIndicator />
          <Text variant="muted">Restoring your session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = "/";
      return null;
    }
    return <AuthLandingScreen />;
  }

  if (!user?.email_confirmed_at) {
    return <Redirect href="/(auth)/verify-email" />;
  }

  const needsConsent =
    !consentDismissed && !prefsLoading && preferences?.policyVersionAccepted !== policyVersion;
  const needsAppOnboarding =
    !needsConsent && !prefsLoading && Boolean(preferences) && !preferences?.appOnboardingCompleted;

  const completeAppOnboarding = async () => {
    if (!preferences) {
      return;
    }

    try {
      await appOnboardingMutation.mutateAsync(
        mergeUserPreferences(preferences, { appOnboardingCompleted: true }),
      );
    } catch {
      // Error state is shown inside the modal.
    }
  };

  return (
    <>
      <ConsentModal visible={needsConsent} onAccepted={() => setConsentDismissed(true)} />
      <OnboardingModal
        actionLabel={t("onboarding.appContinue")}
        body={[t("onboarding.appBody1"), t("onboarding.appBody2"), t("onboarding.appBody3")]}
        errorMessage={appOnboardingMutation.isError ? t("onboarding.appSaveError") : undefined}
        isPending={appOnboardingMutation.isPending}
        onComplete={() => void completeAppOnboarding()}
        title={t("onboarding.appTitle")}
        visible={needsAppOnboarding}
      />
      <View className="flex-1 flex-row bg-background">
        {isDesktop ? <SidebarNav /> : null}
        <View className="flex-1">
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="cbt/index" />
            <Stack.Screen name="cbt/learn" />
            <Stack.Screen name="cbt/history" />
            <Stack.Screen name="cbt/new" />
            <Stack.Screen name="cbt/[id]" />
            <Stack.Screen name="cbt/goals/index" />
            <Stack.Screen name="cbt/goals/new" />
            <Stack.Screen name="cbt/goals/[id]" />
            <Stack.Screen name="cbt/activities/index" />
            <Stack.Screen name="cbt/activities/new" />
            <Stack.Screen name="cbt/activities/[id]" />
            <Stack.Screen name="cbt/values" />
            <Stack.Screen name="cbt/weekly-review" />
            <Stack.Screen name="tools/mood-tracker" />
            <Stack.Screen name="tools/meditation" />
            <Stack.Screen name="tools/act" />
            <Stack.Screen name="tools/gratitude-log" />
            <Stack.Screen name="history" />
            <Stack.Screen name="support" />
            <Stack.Screen name="legal" />
          </Stack>
        </View>
      </View>
    </>
  );
}

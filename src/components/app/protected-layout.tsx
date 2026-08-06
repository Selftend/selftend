import { Stack, usePathname } from "expo-router";
import { ActivityIndicator, Platform, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { OfflineBanner } from "@/src/components/app/offline-banner";
import { VerifyEmailBanner } from "@/src/components/app/verify-email-banner";
import { UpdateBanner } from "@/src/components/app/update-banner";
import { RoutineFab } from "@/src/components/app/routine-fab";
import { Text } from "@/src/components/react-native-reusables/text";
import { AuthLandingScreen } from "@/src/components/app/auth-landing-screen";
import { ConsentGate } from "@/src/components/app/consent-gate";
import {
  AppOnboardingWizard,
  type AppOnboardingResult,
} from "@/src/components/app/app-onboarding-wizard";
import { policyVersion } from "@/src/features/policies/policy-content";
import {
  useUpdateOnboardingPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
import { useCompleteAppOnboarding } from "@/src/features/onboarding/queries";
import { useNotificationDeepLink } from "@/src/features/notifications/use-notification-deep-link";
import { useNotificationSync } from "@/src/features/notifications/use-notification-sync";
import { useRoutines } from "@/src/features/routines/queries";
import { useSettingsSync } from "@/src/features/settings/use-settings-sync";
import { useSession } from "@/src/providers/session-provider";
import { useBannerInsetStore } from "@/src/stores/banner-inset-store";
import { WidgetSnapshotSync } from "@/src/features/widgets/widget-snapshot-sync";
import { AppLockGate } from "@/src/features/security/app-lock-gate";
import { useAppLockStore } from "@/src/features/security/app-lock-store";

export default function ProtectedLayout() {
  const { t } = useTranslation("settings");
  const { session, status, user } = useSession();
  const {
    data: preferences,
    isLoading: prefsLoading,
    isError: prefsError,
  } = useUserPreferences(user?.id ?? null);
  const completeOnboarding = useCompleteAppOnboarding(user?.id ?? null);
  const completeIntroduction = useUpdateOnboardingPreferences(user?.id ?? null);
  const [consentDismissed, setConsentDismissed] = useState(false);
  const pathname = usePathname();

  const hydrateAppLock = useAppLockStore((s) => s.hydrate);
  const setBannerInset = useBannerInsetStore((s) => s.setHeight);
  const insets = useSafeAreaInsets();
  // Measured height of the banner strip's CONTENT (the strip's safe-area
  // padding excluded); 0 while no banner renders. Drives both the store and
  // the conditional padding below.
  const [bannerContentHeight, setBannerContentHeight] = useState(0);

  // A stale inset must not outlive the strip that measured it (sign-out
  // unmounts this layout while the store persists).
  useEffect(() => () => useBannerInsetStore.getState().setHeight(0), []);

  useSettingsSync(user?.id ?? null, preferences);
  // Routine reminders live on routines rows (not user_preferences), so fold them into
  // the sync hook's "any reminder enabled" condition. Native-only fetch: the hook is a
  // no-op on web (the routine editor registers the web push channel at enable time).
  const { data: routines } = useRoutines(Platform.OS === "web" ? null : (user?.id ?? null));
  useNotificationSync(
    user?.id ?? null,
    preferences,
    routines?.some((routine) => routine.reminderEnabled) ?? false,
  );
  useNotificationDeepLink();

  useEffect(() => {
    // Read the device-local app-lock preference. Swallow storage-read failures so a
    // rejected hydrate isn't an unhandled rejection (mirrors useColorSchemeDriver).
    void hydrateAppLock().catch(() => {});
  }, [hydrateAppLock]);

  // Web signed-out redirect: mutating window.location is a side effect, so it
  // lives in an effect (the compiler's immutability rule forbids it in render);
  // the render below returns null for this state while the redirect kicks in.
  const signedOutOnWeb = status !== "loading" && !session && Platform.OS === "web";
  useEffect(() => {
    if (signedOutOnWeb && typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, [signedOutOnWeb]);

  if (status === "loading") {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Text variant="h1">{t("common:loading")}</Text>
          <ActivityIndicator />
          <Text variant="muted">{t("common:restoringSession")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return null;
    }
    return <AuthLandingScreen />;
  }

  // No verification wall here any more (#489): under mailer_autoconfirm every
  // session arrives confirmed, and mailbox ownership is handled by the
  // VerifyEmailBanner below - sign-in is never blocked on it. Pre-flip
  // environments can't mint an unconfirmed session at all (GoTrue rejects
  // the sign-in), so nothing slips through while configs differ.

  // A failed preferences fetch WITH nothing cached leaves the acceptance state
  // UNKNOWN — gating on it would re-prompt users who already accepted (#164:
  // transient network errors flashed the gate). Fail open only then; TanStack's
  // retry/refocus refetch re-evaluates once a load succeeds. When cached data
  // exists the state is known even if the latest refetch errored, so a stale
  // acceptance still gates.
  const prefsUnknown = prefsError && !preferences;
  const needsConsent =
    !consentDismissed &&
    !prefsLoading &&
    !prefsUnknown &&
    preferences?.policyVersionAccepted !== policyVersion;
  const needsAppOnboarding =
    !needsConsent &&
    !prefsLoading &&
    Boolean(preferences) &&
    !preferences?.appOnboardingCompleted &&
    pathname === "/";
  const isIntroductionReplay = Boolean(preferences?.appOnboardingCompletedVia);

  const finishAppOnboarding = async (result: AppOnboardingResult | null) => {
    if (!preferences) return;
    try {
      if (isIntroductionReplay) {
        await completeIntroduction.mutateAsync({ appOnboardingCompleted: true });
        return;
      }
      await completeOnboarding.mutateAsync(result ?? { selectedConcerns: null, widgetIds: [] });
    } catch {
      // Error state is shown inside the wizard.
    }
  };

  if (needsConsent) {
    return <ConsentGate onAccepted={() => setConsentDismissed(true)} />;
  }

  return (
    <AppLockGate>
      <WidgetSnapshotSync userId={user?.id ?? null} preferences={preferences} />
      {needsAppOnboarding ? (
        <AppOnboardingWizard
          visible
          introductionOnly={isIntroductionReplay}
          initialConcerns={preferences?.selectedConcerns ?? []}
          isPending={completeOnboarding.isPending || completeIntroduction.isPending}
          errorMessage={
            completeOnboarding.isError || completeIntroduction.isError
              ? t("onboarding.appSaveError")
              : undefined
          }
          onFinish={(result) => void finishAppOnboarding(result)}
          onSkip={() => void finishAppOnboarding(null)}
        />
      ) : null}
      <View className="flex-1 flex-row bg-background">
        <View className="flex-1">
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
              animationDuration: 220,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="modules/index" />
            <Stack.Screen name="modules/cbt/index" />
            <Stack.Screen name="modules/cbt/learn" />
            <Stack.Screen name="modules/cbt/history/index" />
            <Stack.Screen name="modules/cbt/history/[id]" />
            <Stack.Screen name="modules/cbt/new" />
            <Stack.Screen name="modules/cbt/[id]" />
            <Stack.Screen name="modules/cbt/goals/index" />
            <Stack.Screen name="modules/cbt/goals/new" />
            <Stack.Screen name="modules/cbt/goals/[id]" />
            <Stack.Screen name="modules/cbt/activities/index" />
            <Stack.Screen name="modules/cbt/activities/new" />
            <Stack.Screen name="modules/cbt/activities/[id]" />
            <Stack.Screen name="modules/cbt/values" />
            <Stack.Screen name="modules/cbt/weekly-review" />
            <Stack.Screen name="modules/cbt/beliefs/index" />
            <Stack.Screen name="modules/cbt/beliefs/new" />
            <Stack.Screen name="modules/cbt/beliefs/[id]" />
            <Stack.Screen name="modules/cbt/exposure/index" />
            <Stack.Screen name="modules/cbt/exposure/new" />
            <Stack.Screen name="modules/cbt/exposure/[id]" />
            <Stack.Screen name="modules/cbt/worry/index" />
            <Stack.Screen name="modules/cbt/worry/new" />
            <Stack.Screen name="modules/cbt/tasks/index" />
            <Stack.Screen name="modules/cbt/tasks/new" />
            <Stack.Screen name="modules/cbt/tasks/[id]" />
            <Stack.Screen name="modules/cbt/anger/index" />
            <Stack.Screen name="modules/cbt/anger/new" />
            <Stack.Screen name="modules/cbt/anger/[id]" />
            <Stack.Screen name="modules/cbt/self-care" />
            <Stack.Screen name="modules/cbt/recovery" />
            <Stack.Screen name="modules/act/index" />
            <Stack.Screen name="modules/dbt" />
            <Stack.Screen name="tools/index" />
            <Stack.Screen name="tools/mood-tracker/index" />
            <Stack.Screen name="tools/meditation/index" />
            <Stack.Screen name="tools/act" />
            <Stack.Screen name="tools/gratitude-log/index" />
            <Stack.Screen name="support" />
            <Stack.Screen name="legal" />
            <Stack.Screen name="progress" />
          </Stack>
          {/* Banner strips anchor at the bottom of the content column (#660):
              the top of the screen belongs to the invisible header. Their
              measured height feeds the banner-inset store so bottom-floating
              widgets (reminder prompt card; RoutineFab, #670) ride above
              visible banners instead of covering their controls.

              The home-indicator inset is reserved only while a banner is
              actually visible (#670): a blanket paddingBottom would hold
              empty inset-height space under the content column at all times.
              The store gets the CONTENT height only — the floating widgets'
              base offset already includes insets.bottom, so adding the
              padded strip's total would double-count it. */}
          <View
            testID="bottom-banner-strip"
            style={{ paddingBottom: bannerContentHeight > 0 ? insets.bottom : 0 }}
          >
            <View
              testID="bottom-banner-strip-content"
              onLayout={(event) => {
                const { height } = event.nativeEvent.layout;
                setBannerContentHeight(height);
                setBannerInset(height);
              }}
            >
              <OfflineBanner />
              <VerifyEmailBanner />
              <UpdateBanner />
            </View>
          </View>
          {/* Corner-floating routine-progress handle: authenticated shell only,
              bottom-right so it coexists with the bottom-center reminder prompt
              card by construction. Renders nothing while no routine step is open. */}
          <RoutineFab />
        </View>
      </View>
    </AppLockGate>
  );
}

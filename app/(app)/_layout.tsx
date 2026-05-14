import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, Platform, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

import { SidebarNav } from "@/components/sidebar-nav";
import { Text } from "@/components/ui/text";
import { AuthLandingScreen } from "@/src/components/auth-landing-screen";
import { ConsentModal } from "@/src/components/consent-modal";
import { DESKTOP_BREAKPOINT } from "@/src/constants/layout";
import { policyVersion } from "@/src/features/policies/policy-content";
import { useUserPreferences } from "@/src/features/settings/queries";
import { useLanguageSync } from "@/src/features/settings/use-language-sync";
import { useSession } from "@/src/providers/session-provider";

export default function ProtectedLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const { session, status, user } = useSession();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(user?.id ?? null);
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

  return (
    <>
      <ConsentModal visible={needsConsent} onAccepted={() => setConsentDismissed(true)} />
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

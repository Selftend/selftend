import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ActivityIndicator, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { LoadingState } from "@/src/components/app/screen-state";
import { signOut } from "@/src/features/auth/api";
import { cancelAllReminders } from "@/src/lib/notifications";
import {
  useUpdateOnboardingPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
import { appEnv } from "@/src/lib/env";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { RESET_ONBOARDING_PREFERENCES } from "@/src/features/settings/onboarding-reset";
import { DeleteAccountButton } from "@/src/features/settings/components/delete-account-button";
import { ExportDataButton } from "@/src/features/settings/components/export-data-button";
import { ProfilePictureCard } from "@/src/features/settings/components/profile-picture-card";
import { SecuritySection } from "@/src/features/settings/components/security-section";

export default function SettingsScreen() {
  const { t } = useTranslation("settings");
  const { user } = useSession();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { data, isLoading } = useUserPreferences(user?.id ?? null);
  const resetOnboardingMutation = useUpdateOnboardingPreferences(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  const handleSignOut = async () => {
    try {
      // Deregister this device's push channel BEFORE sign-out (RLS context still valid)
      // so server-driven reminders stop firing for a device the user has left.
      await cancelAllReminders(user?.id ?? null);
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("account.signOutError");
      setErrorMessage(message);
      showToast({
        title: t("problem"),
        description: message,
        tone: "error",
      });
    }
  };

  const resetOnboarding = async () => {
    if (!user) {
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");

      await resetOnboardingMutation.mutateAsync(RESET_ONBOARDING_PREFERENCES);

      setSuccessMessage(t("onboarding.resetSaved"));
      showToast({
        title: t("common:feedback.saved"),
        description: t("onboarding.resetSaved"),
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("onboarding.resetError");
      setErrorMessage(message);
      showToast({
        title: t("problem"),
        description: message,
        tone: "error",
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-4">
        <View className="mx-auto w-full max-w-2xl gap-6">
          {/* Hero */}
          <View className="mt-2">
            <Text variant="eyebrow">{t("account.eyebrow")}</Text>
            <Text
              variant="h1"
              className="mt-2 text-[36px] font-extrabold leading-[1.1] tracking-tight"
            >
              {t("title")}
            </Text>
            <Text className="mt-2.5 text-[15px] leading-[1.55] text-muted-foreground max-w-[60ch]">
              {t("account.intro")}
            </Text>
          </View>

          {isLoading ? <LoadingState title={t("loading")} /> : null}
          {errorMessage ? (
            <Card className="gap-4 p-5">
              <View className="gap-1">
                <Text className="text-base font-semibold">{t("problem")}</Text>
                <Text className="text-xs leading-snug text-muted-foreground">{errorMessage}</Text>
              </View>
            </Card>
          ) : null}
          {successMessage ? (
            <Card className="gap-4 p-5">
              <View className="gap-1">
                <Text className="text-base font-semibold">{t("saved")}</Text>
                <Text className="text-xs leading-snug text-muted-foreground">{successMessage}</Text>
              </View>
            </Card>
          ) : null}

          <ProfilePictureCard user={user} />

          {/* Reminders section */}
          <Card className="gap-4 p-5">
            <View className="flex-row items-start gap-3">
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                className="h-9 w-9 items-center justify-center rounded-[10px] bg-[hsl(var(--be)/0.10)]"
              >
                <Icon name="notifications-active" size={20} className="text-be" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-base font-semibold">{t("reminders.title")}</Text>
                <Text className="mt-1 text-xs leading-snug text-muted-foreground">
                  {t("reminders.description")}
                </Text>
              </View>
            </View>
            <Button
              variant="outline"
              className="justify-start"
              onPress={() => router.push("/notifications")}
            >
              <Icon name="tune" size={18} />
              <Text className="flex-1">{t("reminders.openNotifications")}</Text>
              <Icon name="chevron-right" size={18} className="text-muted-foreground" />
            </Button>
          </Card>

          <SecuritySection />

          {/* Onboarding section */}
          <Card className="gap-4 p-5">
            <View className="flex-row items-start gap-3">
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                className="h-9 w-9 items-center justify-center rounded-[10px] bg-[hsl(var(--iris)/0.10)]"
              >
                <Icon name="auto-stories" size={20} className="text-iris" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-base font-semibold">{t("onboardingSection.title")}</Text>
                <Text className="mt-1 text-xs leading-snug text-muted-foreground">
                  {t("onboardingSection.description")}
                </Text>
              </View>
            </View>
            <Button
              variant="outline"
              className="justify-start"
              disabled={!data || resetOnboardingMutation.isPending}
              onPress={() => void resetOnboarding()}
            >
              {resetOnboardingMutation.isPending ? <ActivityIndicator /> : null}
              <Icon name="replay" size={18} />
              <Text className="flex-1">
                {resetOnboardingMutation.isPending
                  ? t("onboarding.resetting")
                  : t("onboardingSection.reset")}
              </Text>
            </Button>
          </Card>

          {/* Support section */}
          <Card className="gap-4 p-5">
            <View className="flex-row items-start gap-3">
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                className="h-9 w-9 items-center justify-center rounded-[10px] bg-[hsl(var(--aqua)/0.10)]"
              >
                <Icon name="help-outline" size={20} className="text-aqua" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-base font-semibold">{t("support.title")}</Text>
              </View>
            </View>
            <View className="gap-3">
              <Button
                variant="outline"
                className="justify-start"
                onPress={() => router.push("/support")}
              >
                <Icon name="support-agent" size={18} />
                <Text className="flex-1">{t("support.openSupport")}</Text>
                <Icon name="chevron-right" size={18} className="text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onPress={() => router.push("/legal")}
              >
                <Icon name="gavel" size={18} />
                <Text className="flex-1">{t("support.openLegal")}</Text>
                <Icon name="chevron-right" size={18} className="text-muted-foreground" />
              </Button>
              {Platform.OS === "web" ? (
                <Button
                  variant="outline"
                  className="justify-start"
                  onPress={() => router.push("/cookies")}
                >
                  <Icon name="cookie" size={18} />
                  <Text className="flex-1">{t("support.cookiePreferences")}</Text>
                  <Icon name="chevron-right" size={18} className="text-muted-foreground" />
                </Button>
              ) : null}
              <Button
                variant="ghost"
                className="justify-start"
                onPress={() => void Linking.openURL(appEnv.githubRepoUrl)}
              >
                <Icon name="code" size={18} />
                <Text className="flex-1">{t("support.openGithub")}</Text>
              </Button>
            </View>
          </Card>

          {/* Account section */}
          <Card className="gap-4 p-5">
            <View className="flex-row items-start gap-3">
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                className="h-9 w-9 items-center justify-center rounded-[10px] bg-[hsl(var(--clay)/0.10)]"
              >
                <Icon name="manage-accounts" size={20} className="text-clay" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-base font-semibold">{t("account.title")}</Text>
                <Text className="mt-1 text-xs leading-snug text-muted-foreground">
                  {user?.email ?? t("account.signedIn")}
                </Text>
              </View>
            </View>
            <View className="gap-3">
              <ExportDataButton />
              <Button
                variant="outline"
                className="justify-start"
                onPress={() => void handleSignOut()}
              >
                <Icon name="logout" size={18} />
                <Text>{t("account.signOut")}</Text>
              </Button>
              {/* Destructive action stays last - and stays the only red element. */}
              <DeleteAccountButton />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

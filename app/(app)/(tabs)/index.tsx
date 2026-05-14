import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useIsFocused } from "@react-navigation/native";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { AccessibleCardLink } from "@/src/components/accessible-card-link";
import { AppOnboarding } from "@/src/components/onboarding/app-onboarding";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";
import { formatTimestamp } from "@/src/utils/date";

export default function HomeScreen() {
  const { t } = useTranslation("settings");
  const { user } = useSession();
  const isFocused = useIsFocused();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(user?.id ?? null);
  const appOnboardingMutation = useUpdateUserPreferences(user?.id ?? null);
  const { data } = useThoughtRecords(user?.id ?? null);
  const latestRecord = data?.[0];

  const showAppOnboarding =
    isFocused && !prefsLoading && Boolean(preferences) && !preferences?.appOnboardingCompleted;

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
      <AppOnboarding
        actionLabel={t("onboarding.appContinue")}
        body={[t("onboarding.appBody1"), t("onboarding.appBody2"), t("onboarding.appBody3")]}
        errorMessage={appOnboardingMutation.isError ? t("onboarding.appSaveError") : undefined}
        isPending={appOnboardingMutation.isPending}
        onComplete={() => void completeAppOnboarding()}
        title={t("onboarding.appTitle")}
        visible={showAppOnboarding}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <Text variant="h1">{t("home.title")}</Text>
              <Text variant="muted">{t("home.description")}</Text>
            </View>

            <Card>
              <CardHeader>
                <CardTitle>{t("home.scopeBoundary")}</CardTitle>
                <CardDescription>{t("home.scopeBoundaryDescription")}</CardDescription>
              </CardHeader>
            </Card>

            <AccessibleCardLink
              description={t("home.cbtSectionDescription")}
              onPress={() => router.push("/cbt")}
              title={t("home.cbtSection")}
            />

            <AccessibleCardLink
              description={t("home.thoughtHistoryDescription")}
              onPress={() => router.push("/cbt/history")}
              title={t("home.thoughtHistory")}
            />

            <AccessibleCardLink
              description={t("home.settingsAndSupportDescription")}
              onPress={() => router.push("/(app)/(tabs)/settings")}
              title={t("home.settingsAndSupport")}
            />

            <View className="gap-2">
              <Text variant="h3">{t("home.recentActivity")}</Text>
              {latestRecord ? (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t("home.lastUpdated", { timestamp: formatTimestamp(latestRecord.updatedAt) })}
                    </CardTitle>
                    <CardDescription>{latestRecord.automaticThought}</CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("home.noRecords")}</CardTitle>
                    <CardDescription>{t("home.noRecordsDescription")}</CardDescription>
                  </CardHeader>
                </Card>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

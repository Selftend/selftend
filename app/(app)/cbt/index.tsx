import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useIsFocused } from "@react-navigation/native";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { AccessibleCardLink } from "@/src/components/accessible-card-link";
import { CbtOnboarding } from "@/src/components/onboarding/cbt-onboarding";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";

export default function CbtHomeScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(user?.id ?? null);
  const cbtOnboardingMutation = useUpdateUserPreferences(user?.id ?? null);
  const isFocused = useIsFocused();
  const showCbtOnboarding =
    isFocused && !prefsLoading && Boolean(preferences) && !preferences?.cbtOnboardingCompleted;

  const completeCbtOnboarding = async () => {
    if (!preferences) {
      return;
    }

    try {
      await cbtOnboardingMutation.mutateAsync(
        mergeUserPreferences(preferences, { cbtOnboardingCompleted: true }),
      );
    } catch {
      // Error state is shown inside the modal.
    }
  };

  return (
    <>
      <CbtOnboarding
        errorMessage={cbtOnboardingMutation.isError ? t("onboarding.error") : undefined}
        isPending={cbtOnboardingMutation.isPending}
        onComplete={() => void completeCbtOnboarding()}
        visible={showCbtOnboarding}
      />
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <Text variant="h1">{t("home.title")}</Text>
              <Text variant="muted">{t("home.description")}</Text>
            </View>

            <Card>
              <CardHeader>
                <CardTitle>{t("home.whyNarrow")}</CardTitle>
                <CardDescription>{t("home.whyNarrowDescription")}</CardDescription>
              </CardHeader>
            </Card>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button onPress={() => router.push("/cbt/new")}>
                  <Text>{t("home.newRecord")}</Text>
                </Button>
              </View>
              <View className="flex-1">
                <Button onPress={() => router.push("/cbt/learn")} variant="secondary">
                  <Text>{t("home.learn")}</Text>
                </Button>
              </View>
            </View>

            <AccessibleCardLink
              description={t("home.distortionGuideDescription")}
              onPress={() => router.push("/cbt/learn")}
              title={t("home.distortionGuide")}
            />
            <AccessibleCardLink
              description={t("home.recordHistoryDescription")}
              onPress={() => router.push("/cbt/history")}
              title={t("home.recordHistory")}
            />

            <View className="gap-2">
              <Text variant="h3">{t("home.currentFlow")}</Text>
              <Text variant="muted">{t("home.currentFlowDescription")}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

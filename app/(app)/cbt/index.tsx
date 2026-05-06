import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { OnboardingModal } from "@/src/components/onboarding-modal";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";

export default function CbtHomeScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(user?.id ?? null);
  const cbtOnboardingMutation = useUpdateUserPreferences(user?.id ?? null);
  const showCbtOnboarding =
    !prefsLoading && Boolean(preferences) && !preferences?.cbtOnboardingCompleted;

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
      <OnboardingModal
        actionLabel={t("onboarding.continue")}
        body={[t("onboarding.body1"), t("onboarding.body2"), t("onboarding.body3")]}
        errorMessage={cbtOnboardingMutation.isError ? t("onboarding.error") : undefined}
        isPending={cbtOnboardingMutation.isPending}
        onComplete={() => void completeCbtOnboarding()}
        title={t("onboarding.title")}
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

            <Pressable onPress={() => router.push("/cbt/learn")}>
              <Card>
                <CardHeader>
                  <CardTitle>{t("home.distortionGuide")}</CardTitle>
                  <CardDescription>{t("home.distortionGuideDescription")}</CardDescription>
                </CardHeader>
              </Card>
            </Pressable>
            <Pressable onPress={() => router.push("/cbt/history")}>
              <Card>
                <CardHeader>
                  <CardTitle>{t("home.recordHistory")}</CardTitle>
                  <CardDescription>{t("home.recordHistoryDescription")}</CardDescription>
                </CardHeader>
              </Card>
            </Pressable>

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

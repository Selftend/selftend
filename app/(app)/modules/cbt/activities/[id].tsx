import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { MoodLogSheet } from "@/src/components/app/mood-log-sheet";
import { LoadingState } from "@/src/components/app/screen-state";
import { useActivity, useCompleteActivity } from "@/src/features/activities/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { BackButton } from "@/src/components/app/back-button";

export default function ActivityDetailScreen() {
  const { t } = useTranslation("cbt");
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const [showMoodSheet, setShowMoodSheet] = useState(false);

  const { data: activity, isLoading } = useActivity(user?.id ?? null, id ?? null);
  const completeMutation = useCompleteActivity(user?.id ?? null);

  const handleComplete = async (moodAfter: number | null) => {
    if (!activity) return;
    try {
      await completeMutation.mutateAsync({ activityId: activity.id, moodAfter });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("activities.loading")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!activity) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center p-6">
          <Text variant="h2">{t("activities.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const moodLift =
    activity.moodBefore !== null && activity.moodAfter !== null
      ? activity.moodAfter - activity.moodBefore
      : null;

  return (
    <>
      <MoodLogSheet
        linkedStrategy="behavioral-activation"
        onClose={() => setShowMoodSheet(false)}
        onSaved={(score) => void handleComplete(score)}
        visible={showMoodSheet}
      />
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <BackButton showLabel={false} className="-ml-2" />
                <Text variant="h1">{activity.activityName}</Text>
              </View>
              <View className="flex-row gap-2">
                <View className="rounded-full bg-muted px-3 py-1">
                  <Text className="text-xs">{t(`activities.category.${activity.category}`)}</Text>
                </View>
                {activity.completedAt ? (
                  <View className="rounded-full bg-muted px-3 py-1">
                    <Text className="text-xs">{t("activities.completedLabel")}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {activity.scheduledAt ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("activities.scheduledAt")}</CardTitle>
                  <CardDescription>{activity.scheduledAt}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {activity.notes ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("activities.notes")}</CardTitle>
                  <CardDescription>{activity.notes}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {activity.moodBefore !== null || activity.moodAfter !== null ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("activities.moodTitle")}</CardTitle>
                </CardHeader>
                <View className="flex-row px-6 pb-6 gap-4">
                  {activity.moodBefore !== null ? (
                    <View className="flex-1 gap-1">
                      <Text className="text-xs text-muted-foreground">
                        {t("activities.moodBefore")}
                      </Text>
                      <Text className="text-2xl font-bold">{activity.moodBefore}</Text>
                    </View>
                  ) : null}
                  {activity.moodAfter !== null ? (
                    <View className="flex-1 gap-1">
                      <Text className="text-xs text-muted-foreground">
                        {t("activities.moodAfter")}
                      </Text>
                      <Text className="text-2xl font-bold">{activity.moodAfter}</Text>
                    </View>
                  ) : null}
                  {moodLift !== null ? (
                    <View className="flex-1 gap-1">
                      <Text className="text-xs text-muted-foreground">
                        {t("activities.moodLiftLabel")}
                      </Text>
                      <Text
                        className={`text-2xl font-bold ${moodLift >= 0 ? "text-primary" : "text-destructive"}`}
                      >
                        {moodLift >= 0 ? "+" : ""}
                        {moodLift}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            ) : null}

            {!activity.completedAt ? (
              <View className="gap-3">
                <Button onPress={() => setShowMoodSheet(true)}>
                  <Text>{t("activities.markComplete")}</Text>
                </Button>
                <Button
                  onPress={() => router.push(`/cbt/activities/new?activityId=${activity.id}`)}
                  variant="secondary"
                >
                  <Text>{t("activities.edit")}</Text>
                </Button>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

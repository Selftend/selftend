import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import { LoadingState } from "@/src/components/app/screen-state";
import { useActivities } from "@/src/features/activities/queries";
import { useSession } from "@/src/providers/session-provider";
import type { ActivityLog } from "@/src/features/activities/types";
import { BackButton } from "@/src/components/app/back-button";

function groupActivities(activities: ActivityLog[]) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const today: ActivityLog[] = [];
  const upcoming: ActivityLog[] = [];
  const completed: ActivityLog[] = [];

  for (const a of activities) {
    if (a.completedAt) {
      completed.push(a);
    } else if (a.scheduledAt) {
      const dateStr = a.scheduledAt.slice(0, 10);
      if (dateStr === todayStr) {
        today.push(a);
      } else {
        upcoming.push(a);
      }
    } else {
      upcoming.push(a);
    }
  }

  return { today, upcoming, completed };
}

export default function ActivitiesScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: activities, isLoading } = useActivities(user?.id ?? null);

  const { today, upcoming, completed } = groupActivities(activities ?? []);

  const renderActivity = (activity: ActivityLog) => (
    <AccessibleCardLink
      key={activity.id}
      title={activity.activityName}
      description={`${t(`activities.category.${activity.category}`)}${
        activity.moodBefore && activity.moodAfter
          ? ` Â· ${t("activities.moodLift", { lift: activity.moodAfter - activity.moodBefore })}`
          : ""
      }`}
      onPress={() =>
        router.push(`/modules/cbt/activities/${activity.id}` as Parameters<typeof router.push>[0])
      }
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1 gap-2">
              <View className="flex-row items-center gap-2">
                <BackButton showLabel={false} className="-ml-2" />
                <Text variant="h1">{t("activities.title")}</Text>
              </View>
              <Text variant="muted">{t("activities.description")}</Text>
            </View>
            <Button onPress={() => router.push("/modules/cbt/activities/new")} size="sm">
              <Text>{t("activities.new")}</Text>
            </Button>
          </View>

          {isLoading ? (
            <LoadingState title={t("activities.loading")} />
          ) : (activities?.length ?? 0) === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("activities.empty")}</CardTitle>
                <CardDescription>{t("activities.emptyDescription")}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              {today.length > 0 ? (
                <View className="gap-3">
                  <Text variant="h3">{t("activities.today")}</Text>
                  {today.map(renderActivity)}
                </View>
              ) : null}

              {upcoming.length > 0 ? (
                <View className="gap-3">
                  <Text variant="h3">{t("activities.upcoming")}</Text>
                  {upcoming.map(renderActivity)}
                </View>
              ) : null}

              {completed.length > 0 ? (
                <View className="gap-3">
                  <Text variant="h3">{t("activities.completed")}</Text>
                  {completed.map(renderActivity)}
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

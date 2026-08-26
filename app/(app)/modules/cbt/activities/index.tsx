import { usePushWithOrigin } from "@/src/lib/escape-origin";
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
import { groupActivities } from "@/src/features/activities/grouping";
import { useActivities } from "@/src/features/activities/queries";
import { useSession } from "@/src/providers/session-provider";
import type { ActivityLog } from "@/src/features/activities/types";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { AddToHomeButton } from "@/src/components/app/add-to-home-button";
import { HelpButton } from "@/src/components/app/help-button";

export default function ActivitiesScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: activities, isLoading } = useActivities(user?.id ?? null);

  const { today, upcoming, completed } = groupActivities(activities ?? []);

  const renderActivity = (activity: ActivityLog) => (
    <AccessibleCardLink
      key={activity.id}
      title={activity.activityName}
      description={[
        t(`activities.category.${activity.category}`),
        activity.paceCategory ? t(`activities.pace.${activity.paceCategory}`) : null,
        activity.moodBefore && activity.moodAfter
          ? t("activities.moodLift", { lift: activity.moodAfter - activity.moodBefore })
          : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      onPress={() => pushWithOrigin(`/modules/cbt/activities/${activity.id}`)}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1 gap-2">
              <ScreenHeader
                title={t("activities.title")}
                right={
                  <View className="flex-row items-center gap-3">
                    <AddToHomeButton widgetId="cbt-activities" />
                    <HelpButton helpKey="activities" />
                  </View>
                }
              />
              <Text variant="muted">{t("activities.description")}</Text>
            </View>
            <Button onPress={() => pushWithOrigin("/modules/cbt/activities/new")} size="sm">
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

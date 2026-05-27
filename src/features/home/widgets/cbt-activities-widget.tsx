import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useActivities } from "@/src/features/activities/queries";

export function CbtActivitiesWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data } = useActivities(userId);
  const upcoming = (data ?? [])
    .filter((a) => a.scheduledAt !== null && a.completedAt === null)
    .sort((a, b) => (a.scheduledAt! < b.scheduledAt! ? -1 : 1));
  const next = upcoming[0] ?? null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="directions-run" className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.cbtActivities.title")}</Text>
        </View>
        {next ? (
          <>
            <Text variant="muted" className="text-xs">
              {t("home.widgets.cbtActivities.stat", { count: upcoming.length })}
            </Text>
            <Text className="text-xs" numberOfLines={2}>
              {next.activityName}
            </Text>
          </>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.cbtActivities.empty")}
          </Text>
        )}
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onPress={() =>
            router.push(next ? "/modules/cbt/activities" : "/modules/cbt/activities/new")
          }
        >
          <Text>
            {next ? t("home.widgets.cbtActivities.view") : t("home.widgets.cbtActivities.plan")}
          </Text>
        </Button>
      </CardContent>
    </Card>
  );
}

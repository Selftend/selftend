import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { TwoStatBody } from "@/src/features/home/widgets/two-stat-body";

export function GratitudeWeekWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: entries } = useGratitudeEntries(userId);

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const week = (entries ?? []).filter((e) => new Date(e.loggedAt).getTime() >= cutoff);
  const items = week.reduce((sum, e) => sum + e.items.length, 0);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-think/10">
            <Icon name="date-range" className="size-5 text-think" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.gratitudeWeek.title")}</Text>
        </View>
        {week.length > 0 ? (
          <TwoStatBody
            stats={[
              { value: week.length, label: t("home.widgets.gratitudeWeek.entriesLabel") },
              { value: items, label: t("home.widgets.gratitudeWeek.itemsLabel") },
            ]}
          />
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.gratitudeWeek.empty")}
          </Text>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="self-end"
          onPress={() => router.push("/tools/gratitude-log")}
        >
          <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}

import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useSleepLogs } from "@/src/features/sleep/queries";
import type { SleepLog } from "@/src/features/sleep/types";

export function SleepLastNightWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: logs } = useSleepLogs(userId, 30);

  const latest = (logs ?? []).reduce<SleepLog | null>(
    (best, l) => (best === null || l.loggedAt > best.loggedAt ? l : best),
    null,
  );
  const hours = latest ? Math.floor(latest.durationMinutes / 60) : 0;
  const mins = latest ? latest.durationMinutes % 60 : 0;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-ink/10">
            <Icon name="bedtime" className="size-5 text-ink" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.sleepLastNight.title")}</Text>
        </View>
        {latest ? (
          <Text className="text-2xl font-semibold">
            {t("home.widgets.sleepLastNight.hoursValue", { hours, mins })}
          </Text>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.sleepLastNight.empty")}
          </Text>
        )}
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onPress={() => router.push("/tools/sleep")}
        >
          <Text>{t("home.widgets.sleepLastNight.cta")}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

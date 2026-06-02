import { router, type Href } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { TwoStatBody } from "@/src/features/home/widgets/two-stat-body";

// Shared presentational body for the breathing/grounding/mindfulness "session log" home
// widgets. Each wrapper owns its own session hook and passes the resolved list. Accent
// classes are complete literal strings so NativeWind keeps them.
export function SessionLogWidget({
  sessions,
  accentBgClass,
  accentTextClass,
  i18nPrefix,
  route,
}: {
  sessions: { durationMinutes: number }[] | undefined;
  accentBgClass: string;
  accentTextClass: string;
  i18nPrefix: string;
  route: Href;
}) {
  const { t } = useTranslation("navigation");

  const list = sessions ?? [];
  const minutes = list.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className={`size-8 items-center justify-center rounded-lg ${accentBgClass}`}>
            <Icon name="history" className={`size-5 ${accentTextClass}`} />
          </View>
          <Text className="text-sm font-semibold">{t(`${i18nPrefix}.title`)}</Text>
        </View>
        {list.length > 0 ? (
          <TwoStatBody
            stats={[
              { value: list.length, label: t(`${i18nPrefix}.sessionsLabel`) },
              { value: minutes, label: t(`${i18nPrefix}.minutesLabel`) },
            ]}
          />
        ) : (
          <Text variant="muted" className="text-xs">
            {t(`${i18nPrefix}.empty`)}
          </Text>
        )}
        <Button size="sm" variant="ghost" className="self-end" onPress={() => router.push(route)}>
          <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}

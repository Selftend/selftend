import { router, type Href } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

// Shared presentational body for the breathing/grounding/mindfulness "library" home
// widgets. Accent classes are passed as complete literal strings (e.g. "bg-aqua/10") so
// NativeWind's compiler keeps them - never build them via template interpolation.
export function LibraryWidget({
  accentBgClass,
  accentTextClass,
  i18nPrefix,
  count,
  route,
}: {
  accentBgClass: string;
  accentTextClass: string;
  i18nPrefix: string;
  count: number;
  route: Href;
}) {
  const { t } = useTranslation("navigation");

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className={`size-8 items-center justify-center rounded-lg ${accentBgClass}`}>
            <Icon name="format-list-bulleted" className={`size-5 ${accentTextClass}`} />
          </View>
          <Text className="text-sm font-semibold">{t(`${i18nPrefix}.title`)}</Text>
        </View>
        <Text variant="muted" className="text-xs">
          {t(`${i18nPrefix}.count`, { count })}
        </Text>
        <Button size="sm" variant="ghost" className="self-end" onPress={() => router.push(route)}>
          <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}

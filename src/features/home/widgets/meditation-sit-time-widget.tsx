import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { TwoStatBody } from "@/src/features/home/widgets/two-stat-body";

export function MeditationSitTimeWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: sessions } = useMeditationSessions(userId);

  const list = sessions ?? [];
  const minutes = list.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-iris/10">
            <Icon name="timer" className="size-5 text-iris" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.meditationSitTime.title")}</Text>
        </View>
        {list.length > 0 ? (
          <TwoStatBody
            stats={[
              { value: list.length, label: t("home.widgets.meditationSitTime.sessionsLabel") },
              { value: minutes, label: t("home.widgets.meditationSitTime.minutesLabel") },
            ]}
          />
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.meditationSitTime.empty")}
          </Text>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="self-end"
          onPress={() => router.push("/tools/meditation")}
        >
          <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}

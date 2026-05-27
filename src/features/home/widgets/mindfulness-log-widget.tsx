import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";

export function MindfulnessLogWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: sessions } = useMindfulnessSessions(userId);

  const list = sessions ?? [];
  const minutes = list.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-mist/10">
            <Icon name="history" className="size-5 text-mist" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.mindfulnessLog.title")}</Text>
        </View>
        {list.length > 0 ? (
          <View className="flex-row gap-6">
            <View className="gap-0.5">
              <Text className="text-base font-semibold">{list.length}</Text>
              <Text variant="muted" className="text-[11px]">
                {t("home.widgets.mindfulnessLog.sessionsLabel")}
              </Text>
            </View>
            <View className="gap-0.5">
              <Text className="text-base font-semibold">{minutes}</Text>
              <Text variant="muted" className="text-[11px]">
                {t("home.widgets.mindfulnessLog.minutesLabel")}
              </Text>
            </View>
          </View>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.mindfulnessLog.empty")}
          </Text>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="self-end"
          onPress={() => router.push("/tools/mindfulness")}
        >
          <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}

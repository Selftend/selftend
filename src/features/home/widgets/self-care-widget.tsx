import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useSelfCareLog } from "@/src/features/self-care/queries";

export function SelfCareWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const todayKey = new Date().toISOString().slice(0, 10);
  const { data: log } = useSelfCareLog(userId, todayKey);
  const done = Boolean(log);

  return (
    <Card>
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
              <Icon name="spa" className="size-5 text-primary" />
            </View>
            <Text className="text-sm font-semibold">{t("today.dashboard.selfCareTitle")}</Text>
          </View>
          {done ? (
            <View className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-primary">
                {t("today.dashboard.doneToday")}
              </Text>
            </View>
          ) : null}
        </View>

        <Text variant="muted" className="text-xs">
          {done ? t("today.dashboard.selfCareDoneHint") : t("today.dashboard.selfCareDesc")}
        </Text>

        <View className="flex-row items-center justify-between">
          <Button size="sm" variant="outline" onPress={() => router.push("/modules/cbt/self-care")}>
            <Icon name="spa" className="size-4" />
            <Text>{done ? t("today.dashboard.viewLog") : t("today.dashboard.logSelfCare")}</Text>
          </Button>
          <Button size="sm" variant="ghost" onPress={() => router.push("/modules/cbt/self-care")}>
            <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

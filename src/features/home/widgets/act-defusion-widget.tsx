import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useDefusionLogs } from "@/src/features/act/queries";

export function ActDefusionWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { t: ta } = useTranslation("act");
  const { data: logs } = useDefusionLogs(userId, 30);

  const last = [...(logs ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] ?? null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-act/10">
            <Icon name="filter-drama" className="size-5 text-act" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.actDefusion.title")}</Text>
        </View>
        {last ? (
          <View className="gap-0.5">
            <Text variant="muted" className="text-[11px]">
              {t("home.widgets.actDefusion.last")}
            </Text>
            <Text className="text-sm font-medium" numberOfLines={1}>
              {ta(`defusion.techniques.${last.techniqueUsed}`, {
                defaultValue: last.techniqueUsed,
              })}
            </Text>
          </View>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.actDefusion.tryIt")}
          </Text>
        )}
        <Button
          size="sm"
          variant={last ? "ghost" : "outline"}
          className={last ? "self-end" : "self-start"}
          onPress={() => router.push("/modules/act/defusion")}
        >
          <Text className={last ? "text-muted-foreground" : undefined}>
            {last ? t("home.widgets.actDefusion.again") : t("home.widgets.actDefusion.start")}
          </Text>
          {last ? <Icon name="arrow-forward" className="size-4 text-muted-foreground" /> : null}
        </Button>
      </CardContent>
    </Card>
  );
}

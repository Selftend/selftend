import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useCbtInsights } from "@/src/features/cbt/use-cbt-insights";

export function CbtDistortionPatternsWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { t: tc } = useTranslation("cbt");
  const { topDistortions } = useCbtInsights(userId);

  const top = topDistortions[0] ?? null;
  const rest = topDistortions.slice(1, 3);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="insights" className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">
            {t("home.widgets.cbtDistortionPatterns.title")}
          </Text>
        </View>
        {top ? (
          <View className="gap-1.5">
            <View className="flex-row items-baseline justify-between gap-2">
              <Text className="flex-1 text-sm font-medium" numberOfLines={1}>
                {tc(`distortions.${top.key}.title`, { defaultValue: top.key })}
              </Text>
              <Text variant="muted" className="text-xs">
                {t("home.widgets.cbtDistortionPatterns.count", { count: top.count })}
              </Text>
            </View>
            {rest.map((d) => (
              <View key={d.key} className="flex-row items-baseline justify-between gap-2">
                <Text variant="muted" className="flex-1 text-xs" numberOfLines={1}>
                  {tc(`distortions.${d.key}.title`, { defaultValue: d.key })}
                </Text>
                <Text variant="muted" className="text-[11px]">
                  {t("home.widgets.cbtDistortionPatterns.count", { count: d.count })}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.cbtDistortionPatterns.empty")}
          </Text>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="self-end"
          onPress={() => router.push("/modules/cbt/learn")}
        >
          <Text className="text-muted-foreground">
            {t("home.widgets.cbtDistortionPatterns.learnMore")}
          </Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}

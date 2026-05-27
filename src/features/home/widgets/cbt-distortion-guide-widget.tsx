import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { distortionDefinitions } from "@/src/constants/distortions";

export function CbtDistortionGuideWidget({ userId: _userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { t: tc } = useTranslation("cbt");

  const examples = distortionDefinitions.slice(0, 2);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="menu-book" className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">
            {t("home.widgets.cbtDistortionGuide.title")}
          </Text>
        </View>
        <Text variant="muted" className="text-xs">
          {t("home.widgets.cbtDistortionGuide.count", { count: distortionDefinitions.length })}
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          {examples.map((d) => (
            <View key={d.key} className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-[11px] text-primary">
                {tc(`distortions.${d.key}.title`, { defaultValue: d.key })}
              </Text>
            </View>
          ))}
        </View>
        <Button
          size="sm"
          variant="ghost"
          className="self-end"
          onPress={() => router.push("/modules/cbt/learn")}
        >
          <Text className="text-muted-foreground">
            {t("home.widgets.cbtDistortionGuide.explore")}
          </Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}

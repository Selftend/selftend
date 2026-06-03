import { router, type Href } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

export function CbtShortcutWidget({
  icon,
  title,
  description,
  cta,
  route,
}: {
  icon: MaterialIconName;
  title: string;
  description: string;
  cta: string;
  route: Href;
}) {
  const { t } = useTranslation("cbt");
  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2 flex-1">
            <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
              <Icon name={icon} className="size-5 text-primary" />
            </View>
            <Text className="text-sm font-semibold flex-1" numberOfLines={1}>
              {title}
            </Text>
          </View>
          <View className="rounded-full bg-primary/10 px-2 py-0.5">
            <Text className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              {t("module.label")}
            </Text>
          </View>
        </View>
        <Text variant="muted" className="text-xs" numberOfLines={2}>
          {description}
        </Text>
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onPress={() => router.push(route)}
        >
          <Text>{cta}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

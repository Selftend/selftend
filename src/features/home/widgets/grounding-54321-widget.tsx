import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

export function Grounding54321Widget(_props: { userId: string }) {
  const { t } = useTranslation("navigation");
  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-clay/10">
            <Icon name="anchor" className="size-5 text-clay" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.grounding54321.title")}</Text>
        </View>
        <Text variant="muted" className="text-xs">
          {t("home.widgets.grounding54321.desc")}
        </Text>
        <Button size="sm" className="self-start" onPress={() => router.push("/tools/grounding")}>
          <Text>{t("home.widgets.grounding54321.cta")}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

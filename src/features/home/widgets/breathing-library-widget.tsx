import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { breathingPatterns } from "@/src/constants/breathing";

export function BreathingLibraryWidget({ userId: _userId }: { userId: string }) {
  const { t } = useTranslation("navigation");

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-aqua/10">
            <Icon name="format-list-bulleted" className="size-5 text-aqua" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.breathingLibrary.title")}</Text>
        </View>
        <Text variant="muted" className="text-xs">
          {t("home.widgets.breathingLibrary.count", { count: breathingPatterns.length })}
        </Text>
        <Button
          size="sm"
          variant="ghost"
          className="self-end"
          onPress={() => router.push("/tools/breathing")}
        >
          <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}

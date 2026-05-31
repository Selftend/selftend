import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { dayOfYear } from "@/src/utils/date";

export function GratitudePromptWidget({ userId: _userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const index = (dayOfYear(new Date()) % 4) + 1;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-think/10">
            <Icon name="favorite-border" className="size-5 text-think" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.gratitudePrompt.title")}</Text>
        </View>
        <Text variant="muted" className="text-xs" numberOfLines={3}>
          {t(`home.widgets.gratitudePrompt.prompt${index}`)}
        </Text>
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onPress={() => router.push("/tools/gratitude-log/new")}
        >
          <Icon name="edit" className="size-4" />
          <Text>{t("home.widgets.gratitudePrompt.add")}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

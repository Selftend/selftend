import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useValueEntries } from "@/src/features/act/queries";

export function ActValuesWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: entries } = useValueEntries(userId);

  // Reflect the ACT module's own value entries (not the shared values-clarification
  // profile). Show the user's value statements, most important first.
  const top = (entries ?? [])
    .filter((e) => e.valueStatement.trim().length > 0)
    .sort((a, b) => (b.importanceRating ?? 0) - (a.importanceRating ?? 0))
    .slice(0, 5);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-act/10">
            <Icon name="explore" className="size-5 text-act" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.actValues.title")}</Text>
        </View>
        {top.length > 0 ? (
          <View className="flex-row flex-wrap gap-1.5">
            {top.map((entry) => (
              <View key={entry.id} className="rounded-full bg-act/10 px-2.5 py-1">
                <Text className="text-xs font-medium text-act">{entry.valueStatement}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.actValues.empty")}
          </Text>
        )}
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onPress={() => router.push("/modules/act")}
        >
          <Text>
            {top.length > 0 ? t("today.dashboard.open") : t("home.widgets.actValues.cta")}
          </Text>
        </Button>
      </CardContent>
    </Card>
  );
}

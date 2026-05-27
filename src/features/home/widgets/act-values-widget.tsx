import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useValuesProfile } from "@/src/features/values/queries";

function humanize(key: string) {
  const spaced = key.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function ActValuesWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: profile } = useValuesProfile(userId);

  const keys = profile?.priorityValues?.length
    ? profile.priorityValues
    : (profile?.personalValues ?? []).filter((v) => v.tier === 1).map((v) => v.key);
  const top = keys.slice(0, 5);

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
            {top.map((key) => (
              <View key={key} className="rounded-full bg-act/10 px-2.5 py-1">
                <Text className="text-xs font-medium text-act">{humanize(key)}</Text>
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

import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useRecoveryPlan } from "@/src/features/recovery/queries";

export function CompositeSafetyWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: plan } = useRecoveryPlan(userId);

  const slogan = plan?.personalSlogan.trim() ?? "";

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="favorite" className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.compositeSafety.title")}</Text>
        </View>
        <Text variant="muted" className="text-xs" numberOfLines={3}>
          {slogan || t("home.widgets.compositeSafety.fallback")}
        </Text>
        <View className="flex-row gap-2">
          <Button size="sm" variant="outline" onPress={() => router.push("/tools/grounding/54321")}>
            <Text>{t("home.widgets.compositeSafety.ground")}</Text>
          </Button>
          <Button size="sm" variant="outline" onPress={() => router.push("/tools/breathing")}>
            <Text>{t("home.widgets.compositeSafety.breathe")}</Text>
          </Button>
        </View>
        <Button
          size="sm"
          variant="ghost"
          className="self-end"
          onPress={() => router.push("/crisis")}
        >
          <Text className="text-muted-foreground">{t("home.widgets.compositeSafety.support")}</Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}

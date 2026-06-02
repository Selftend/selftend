import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useAllExposureItems } from "@/src/features/exposure/queries";

export function CbtExposureWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data } = useAllExposureItems(userId);
  const items = data ?? [];
  const done = items.filter((i) => i.completedAt !== null).length;
  const next =
    items.filter((i) => i.completedAt === null).sort((a, b) => a.sudsRating - b.sudsRating)[0] ??
    null;
  const hasItems = items.length > 0;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="layers" className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.cbtExposure.title")}</Text>
        </View>
        {hasItems ? (
          <>
            <Text variant="muted" className="text-xs">
              {t("home.widgets.cbtExposure.progress", { done, total: items.length })}
            </Text>
            <Text className="text-xs" numberOfLines={2}>
              {next ? next.description : t("home.widgets.cbtExposure.allDone")}
            </Text>
          </>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.cbtExposure.empty")}
          </Text>
        )}
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onPress={() =>
            router.push(hasItems ? "/modules/cbt/exposure" : "/modules/cbt/exposure/new")
          }
        >
          <Text>
            {hasItems
              ? t("home.widgets.cbtExposure.continue")
              : t("home.widgets.cbtExposure.build")}
          </Text>
        </Button>
      </CardContent>
    </Card>
  );
}

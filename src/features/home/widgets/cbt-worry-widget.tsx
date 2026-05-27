import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useWorryEntries } from "@/src/features/worry/queries";

export function CbtWorryWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data } = useWorryEntries(userId);
  const unresolved = (data ?? []).filter((e) => !e.resolved);
  const latest = [...unresolved].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0] ?? null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="psychology" className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.cbtWorry.title")}</Text>
        </View>
        {latest ? (
          <>
            <Text variant="muted" className="text-xs">
              {t("home.widgets.cbtWorry.stat", { count: unresolved.length })}
            </Text>
            <Text className="text-xs" numberOfLines={2}>
              {latest.worryStatement}
            </Text>
          </>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.cbtWorry.empty")}
          </Text>
        )}
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onPress={() => router.push(latest ? "/modules/cbt/worry" : "/modules/cbt/worry/new")}
        >
          <Text>
            {latest ? t("home.widgets.cbtWorry.revisit") : t("home.widgets.cbtWorry.start")}
          </Text>
        </Button>
      </CardContent>
    </Card>
  );
}

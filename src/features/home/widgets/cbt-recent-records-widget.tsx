import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useThoughtRecords } from "@/src/features/cbt/queries";

export function CbtRecentRecordsWidget({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation("navigation");
  const { data: records } = useThoughtRecords(userId);

  const recent = [...(records ?? [])]
    .filter((r) => r.archivedAt === null)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 2);

  const hasRecords = recent.length > 0;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="history" className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.cbtRecentRecords.title")}</Text>
        </View>
        {hasRecords ? (
          <View className="gap-2">
            {recent.map((r) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                onPress={() => router.push(`/modules/cbt/${r.id}`)}
                className="gap-0.5 rounded-lg border border-border bg-card p-2 active:bg-accent/40"
              >
                <Text className="text-xs font-medium" numberOfLines={1}>
                  {r.situation.trim() || t("home.widgets.cbtRecentRecords.untitled")}
                </Text>
                <Text variant="muted" className="text-[11px]">
                  {new Date(r.updatedAt).toLocaleDateString(i18n.language, {
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.cbtRecentRecords.empty")}
          </Text>
        )}
        {hasRecords ? (
          <Button
            size="sm"
            variant="ghost"
            className="self-end"
            onPress={() => router.push("/modules/cbt/history")}
          >
            <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="self-start"
            onPress={() => router.push("/modules/cbt/new")}
          >
            <Text>{t("home.widgets.cbtRecentRecords.newRecord")}</Text>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useJournalEntries } from "@/src/features/journal/queries";
import { dayOfYear } from "@/src/utils/date";

export function JournalResurfaceWidget({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation("navigation");
  const { data: entries } = useJournalEntries(userId);

  const sorted = [...(entries ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const memory = sorted.length > 0 ? sorted[dayOfYear(new Date()) % sorted.length] : null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-ink/10">
            <Icon name="restore" className="size-5 text-ink" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.journalResurface.title")}</Text>
        </View>
        {memory ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/tools/journal/${memory.id}`)}
            className="gap-0.5 rounded-lg border border-border bg-card p-2 active:bg-accent/40"
          >
            <Text variant="muted" className="text-[11px]">
              {new Date(memory.createdAt).toLocaleDateString(i18n.language, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Text>
            {memory.title ? (
              <Text className="text-xs font-medium" numberOfLines={1}>
                {memory.title}
              </Text>
            ) : null}
            <Text variant="muted" className="text-xs" numberOfLines={2}>
              {memory.body}
            </Text>
          </Pressable>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.journalResurface.empty")}
          </Text>
        )}
        {memory ? (
          <Button
            size="sm"
            variant="ghost"
            className="self-end"
            onPress={() => router.push("/tools/journal")}
          >
            <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="self-start"
            onPress={() => router.push("/tools/journal/new")}
          >
            <Text>{t("home.widgets.journalResurface.start")}</Text>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useSleepLogs } from "@/src/features/sleep/queries";

export function SleepNotesWidget({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation("navigation");
  const { data: logs } = useSleepLogs(userId);

  const withNote = [...(logs ?? [])]
    .sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1))
    .find((l) => l.notes.trim() !== "");

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-ink/10">
            <Icon name="edit-note" className="size-5 text-ink" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.sleepNotes.title")}</Text>
        </View>
        {withNote ? (
          <View className="gap-0.5">
            <Text variant="muted" className="text-[11px]">
              {new Date(withNote.loggedAt).toLocaleDateString(i18n.language, {
                month: "short",
                day: "numeric",
              })}
            </Text>
            <Text variant="muted" className="text-xs" numberOfLines={3}>
              {withNote.notes}
            </Text>
          </View>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.sleepNotes.empty")}
          </Text>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="self-end"
          onPress={() => router.push("/tools/sleep")}
        >
          <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}

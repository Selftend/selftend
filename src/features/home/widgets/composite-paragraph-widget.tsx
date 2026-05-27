import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { useJournalEntries } from "@/src/features/journal/queries";
import { useMoodLogs } from "@/src/features/mood/queries";

export function CompositeParagraphWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: moods } = useMoodLogs(userId);
  const { data: journals } = useJournalEntries(userId);
  const { data: gratitude } = useGratitudeEntries(userId);

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const m = (moods ?? []).filter((x) => new Date(x.loggedAt).getTime() >= cutoff).length;
  const j = (journals ?? []).filter((x) => new Date(x.createdAt).getTime() >= cutoff).length;
  const g = (gratitude ?? []).filter((x) => new Date(x.loggedAt).getTime() >= cutoff).length;
  const total = m + j + g;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="summarize" className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">
            {t("home.widgets.compositeParagraph.title")}
          </Text>
        </View>
        <Text variant="muted" className="text-xs" numberOfLines={3}>
          {total > 0
            ? t("home.widgets.compositeParagraph.summary", { m, j, g })
            : t("home.widgets.compositeParagraph.empty")}
        </Text>
        <Button
          size="sm"
          variant="ghost"
          className="self-end"
          onPress={() => router.push("/progress")}
        >
          <Text className="text-muted-foreground">{t("today.dashboard.open")}</Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}

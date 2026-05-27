import { router, type Href } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { useJournalEntries } from "@/src/features/journal/queries";

interface Memory {
  date: string;
  snippet: string;
  route: string;
  labelKey: string;
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

export function CompositeFromPastWidget({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation("navigation");
  const { data: journals } = useJournalEntries(userId);
  const { data: gratitude } = useGratitudeEntries(userId);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const memories: Memory[] = [];
  for (const e of journals ?? []) {
    if (new Date(e.createdAt).getTime() < weekAgo) {
      memories.push({
        date: e.createdAt,
        snippet: e.title.trim() || e.body,
        route: `/tools/journal/${e.id}`,
        labelKey: "home.widgets.compositeFromPast.fromJournal",
      });
    }
  }
  for (const e of gratitude ?? []) {
    if (new Date(e.loggedAt).getTime() < weekAgo) {
      memories.push({
        date: e.loggedAt,
        snippet: e.note.trim() || e.items.join(", "),
        route: `/tools/gratitude-log/${e.id}`,
        labelKey: "home.widgets.compositeFromPast.fromGratitude",
      });
    }
  }
  memories.sort((a, b) => (a.date < b.date ? -1 : 1));
  const memory = memories.length > 0 ? memories[dayOfYear(new Date()) % memories.length] : null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="auto-stories" className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.compositeFromPast.title")}</Text>
        </View>
        {memory ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(memory.route as Href)}
            className="gap-0.5 rounded-lg border border-border bg-card p-2 active:bg-accent/40"
          >
            <Text variant="muted" className="text-[11px]">
              {t(memory.labelKey)} ·{" "}
              {new Date(memory.date).toLocaleDateString(i18n.language, {
                month: "short",
                day: "numeric",
              })}
            </Text>
            <Text variant="muted" className="text-xs" numberOfLines={2}>
              {memory.snippet}
            </Text>
          </Pressable>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.compositeFromPast.empty")}
          </Text>
        )}
      </CardContent>
    </Card>
  );
}

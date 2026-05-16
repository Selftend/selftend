import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { BackButton } from "@/src/components/app/back-button";
import { EmptyState } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";

export default function GratitudeListScreen() {
  const { t } = useTranslation("gratitude");
  const { user } = useSession();
  const { data: entries } = useGratitudeEntries(user?.id ?? null, 50);

  const list = entries ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("title")}</Text>
            </View>
            <Text variant="muted" className="max-w-[64ch]">
              {t("description")}
            </Text>
          </View>

          <Button
            onPress={() =>
              router.push("/modules/gratitude/new" as Parameters<typeof router.push>[0])
            }
            className="self-start"
          >
            <Icon name="add" className="size-4 text-primary-foreground" />
            <Text>{t("cta.new")}</Text>
          </Button>

          {list.length === 0 ? (
            <EmptyState
              title={t("list.empty.title")}
              description={t("list.empty.description")}
              action={{
                label: t("list.empty.cta"),
                onPress: () =>
                  router.push("/modules/gratitude/new" as Parameters<typeof router.push>[0]),
              }}
            />
          ) : (
            <View className="gap-3">
              <Text variant="h3">{t("list.recent")}</Text>
              <View className="gap-3">
                {list.map((entry) => (
                  <GratitudeEntryRow key={entry.id} entry={entry} />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface GratitudeEntryRowProps {
  entry: GratitudeEntry;
}

function GratitudeEntryRow({ entry }: GratitudeEntryRowProps) {
  const { t } = useTranslation("gratitude");
  const when = formatMoodRelativeTime(entry.loggedAt, t);
  const firstItem = entry.items[0] ?? t("list.fallbackItem");

  return (
    <Pressable
      accessibilityLabel={t("list.viewEntry", { when })}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() =>
        router.push({
          pathname: "/modules/gratitude/entries/[id]",
          params: { id: entry.id },
        })
      }
      className="gap-2 rounded-2xl border border-border bg-card p-4 active:bg-accent/40"
      role="button"
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-base font-semibold" numberOfLines={1}>
          {firstItem}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {t("detail.levelBadge", { level: entry.level })}
          </Text>
          <Text variant="muted" className="text-xs">
            {when}
          </Text>
        </View>
      </View>
      <Text variant="muted" className="text-sm">
        {t("list.itemsCount", { count: entry.items.length })}
      </Text>
      {entry.note.trim().length > 0 ? (
        <Text variant="muted" numberOfLines={2} className="text-sm">
          {entry.note.trim()}
        </Text>
      ) : null}
    </Pressable>
  );
}

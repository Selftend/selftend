import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { EmptyState } from "@/src/components/app/screen-state";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useFavoriteGratitudeEntries } from "@/src/features/gratitude/queries";
import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";

export default function GratitudeFavoritesScreen() {
  const { t } = useTranslation("gratitude");
  const { user } = useSession();
  const { data: favorites } = useFavoriteGratitudeEntries(user?.id ?? null, 200);
  const favoriteList = favorites ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("favorites.title")} />
            <Text variant="muted">{t("favorites.description")}</Text>
          </View>

          {favoriteList.length === 0 ? (
            <EmptyState
              icon="star"
              title={t("favorites.empty.title")}
              description={t("favorites.empty.description")}
            />
          ) : (
            <View className="gap-3">
              {favoriteList.map((entry) => (
                <FavoriteEntryRow key={entry.id} entry={entry} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FavoriteEntryRow({ entry }: { entry: GratitudeEntry }) {
  const { t } = useTranslation("gratitude");
  const when = formatMoodRelativeTime(entry.loggedAt, t);
  const firstItem = entry.items[0] ?? t("list.fallbackItem");

  return (
    <Pressable
      accessibilityLabel={t("favorites.viewEntry", { when })}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() =>
        router.push({
          pathname: "/tools/gratitude-log/[id]",
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
        <Icon name="star" className="size-4 text-primary" />
      </View>
      <Text variant="muted" className="text-xs">
        {when}
      </Text>
      {entry.note.trim().length > 0 ? (
        <Text variant="muted" numberOfLines={2} className="text-sm">
          {entry.note.trim()}
        </Text>
      ) : null}
    </Pressable>
  );
}

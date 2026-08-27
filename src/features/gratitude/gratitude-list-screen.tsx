import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { EmptyState, ErrorState } from "@/src/components/app/screen-state";
import { Text } from "@/src/components/react-native-reusables/text";
import { GratitudeEntryCard } from "@/src/features/gratitude/gratitude-entry-card";
import { useGratitudeEntryPages } from "@/src/features/gratitude/queries";
import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { FORM_COLUMN_WIDTH } from "@/src/lib/layout";
import { useSession } from "@/src/providers/session-provider";

export default function GratitudeListScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("gratitude");
  const { user } = useSession();
  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useGratitudeEntryPages(user?.id ?? null);
  const list = data?.pages.flat() ?? [];
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <FlatList<GratitudeEntry>
        data={list}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          width: "100%",
          maxWidth: FORM_COLUMN_WIDTH,
          alignSelf: "center",
        }}
        ItemSeparatorComponent={() => <View className="h-px bg-border" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-4 gap-2">
            <ScreenHeader title={t("title")} />
            <Text variant="muted" className="max-w-[64ch]">
              {t("description")}
            </Text>
          </View>
        }
        ListEmptyComponent={
          isPending ? null : isError ? (
            <ErrorState
              icon="cloud-off"
              title={t("list.error.title")}
              description={t("list.error.description")}
              action={{ label: t("errors:fallback.retry"), onPress: () => void refetch() }}
            />
          ) : (
            <EmptyState
              icon="favorite"
              title={t("list.empty.title")}
              description={t("list.empty.description")}
              action={{
                label: t("list.empty.cta"),
                onPress: () => pushWithOrigin("/tools/gratitude-log/new"),
              }}
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator />
            </View>
          ) : null
        }
        renderItem={({ item }) => <GratitudeEntryCard entry={item} />}
      />
    </SafeAreaView>
  );
}

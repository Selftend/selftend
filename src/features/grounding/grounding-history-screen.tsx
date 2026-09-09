import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { LoadMoreFooter } from "@/src/components/app/load-more-footer";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { EmptyState, ErrorState } from "@/src/components/app/screen-state";
import { Text } from "@/src/components/react-native-reusables/text";
import { GroundingSessionRow } from "@/src/features/grounding/grounding-session-row";
import { useGroundingSessionPages } from "@/src/features/grounding/queries";
import type { MindfulnessSession } from "@/src/features/mindfulness/types";
import { FORM_COLUMN_WIDTH } from "@/src/lib/layout";
import { useSession } from "@/src/providers/session-provider";
import { formatCompactAtOffset } from "@/src/utils/date";
import { useLoadMore } from "@/src/lib/use-load-more";

export default function GroundingHistoryScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isFetchNextPageError,
    isPending,
    refetch,
  } = useGroundingSessionPages(user?.id ?? null);
  const sessions = data?.pages.flat() ?? [];

  const loadMore = useLoadMore({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <FlatList<MindfulnessSession>
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          flexGrow: 1,
          padding: 16,
          width: "100%",
          maxWidth: FORM_COLUMN_WIDTH,
          alignSelf: "center",
        }}
        ItemSeparatorComponent={() => <View className="h-px bg-border" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-2 gap-2">
            <ScreenHeader title={t("grounding.allHistory.title")} />
            <Text variant="muted">{t("grounding.allHistory.description")}</Text>
          </View>
        }
        ListEmptyComponent={
          isPending ? null : isError ? (
            <ErrorState
              icon="cloud-off"
              title={t("grounding.allHistory.error.title")}
              description={t("grounding.allHistory.error.description")}
              action={{ label: t("errors:fallback.retry"), onPress: () => void refetch() }}
            />
          ) : (
            <EmptyState
              icon="history"
              title={t("grounding.allHistory.empty.title")}
              description={t("grounding.allHistory.empty.description")}
            />
          )
        }
        // A later page's failure has nowhere else to show: `ListEmptyComponent` is
        // unrendered once rows exist, and the load-more latch (#2255) only clears
        // through this Retry (#2187).
        ListFooterComponent={
          <LoadMoreFooter
            failed={isFetchNextPageError}
            isFetchingNextPage={isFetchingNextPage}
            onRetry={() => void fetchNextPage()}
          />
        }
        renderItem={({ item }) => (
          <GroundingSessionRow
            session={item}
            when={formatCompactAtOffset(item.completedAt, item.completedOffsetMinutes)}
          />
        )}
      />
    </SafeAreaView>
  );
}

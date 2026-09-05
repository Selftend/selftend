import { useCallback } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { HairlineRow } from "@/src/components/app/hairline-row";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ErrorState } from "@/src/components/app/screen-state";
import { SharedToolsRow } from "@/src/components/app/shared-tools-row";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { formatCompactAtOffset } from "@/src/utils/date";
import { DBT_SHARED_TOOLS } from "@/src/features/dbt/dbt-shared-tools";
import { useEmotionRecordPages } from "@/src/features/dbt/queries";
import type { EmotionRecord } from "@/src/features/dbt/types";
import { useSession } from "@/src/providers/session-provider";

/**
 * `/modules/dbt/emotions` - the emotion records, newest first (spec §3.3.1).
 *
 * The front door AND the archive, the shape ACT's lists settled on (#1515): the
 * New button rides the header so it can never be pushed below the fold by a
 * long history.
 *
 * ⚠️ The timestamp resolves in the row's OWN captured frame, not the viewer's.
 * Every DBT dated column carries its offset, so a record written at 9pm in
 * Sofia still reads 9pm after the person flies to Toronto - which is the whole
 * point of the captured frame, and the one thing ACT's lists cannot do.
 *
 * **No counts, anywhere.** Not "12 records", not "3 this week". A history is
 * something to read, not a tally to keep up with.
 */
export default function DbtEmotionRecordListScreen() {
  const { t } = useTranslation(["dbt", "errors"]);
  const pushWithOrigin = usePushWithOrigin();
  const { user } = useSession();
  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useEmotionRecordPages(user?.id ?? null);
  const records = data?.pages.flat() ?? [];

  const loadMore = useCallback(() => {
    // `hasNextPage` alone is not enough: onEndReached fires repeatedly while a
    // fetch is in flight, and each call would start another page from the same
    // cursor.
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <FlatList<EmotionRecord>
        data={records}
        keyExtractor={(record) => record.id}
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-6 gap-6">
            <View className="gap-2">
              <ScreenHeader title={t("dbt:tools.emotions.name")} />
              <Text variant="muted">{t("dbt:emotions.listSubtitle")}</Text>
            </View>

            <Button onPress={() => pushWithOrigin("/modules/dbt/emotions/new")}>
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("dbt:emotions.newTitle")}</Text>
            </Button>

            <SharedToolsRow
              heading={t("dbt:alsoTry")}
              tools={[
                DBT_SHARED_TOOLS.checkIn,
                DBT_SHARED_TOOLS.cbtThoughtRecord,
                DBT_SHARED_TOOLS.actExpansion,
                DBT_SHARED_TOOLS.journal,
              ]}
            />
          </View>
        }
        /**
         * ☠️ A failed read is NOT an empty history. Rendering "nothing here
         * yet" over an error tells a person their own work is gone.
         */
        ListEmptyComponent={
          isPending ? null : isError ? (
            <ErrorState
              icon="cloud-off"
              title={t("errors:fallback.title")}
              description={t("errors:fallback.description")}
              action={{ label: t("errors:fallback.retry"), onPress: () => void refetch() }}
            />
          ) : (
            <Text variant="muted">{t("dbt:emotions.empty")}</Text>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <HairlineRow
            title={item.whatHappened.split("\n")[0] ?? ""}
            meta={formatCompactAtOffset(item.createdAt, item.createdOffsetMinutes)}
            onPress={() =>
              pushWithOrigin({
                pathname: "/modules/dbt/emotions/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

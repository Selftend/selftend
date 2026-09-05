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
import { useWiseMindCheckinPages } from "@/src/features/dbt/queries";
import type { WiseMindCheckin } from "@/src/features/dbt/types";
import { useSession } from "@/src/providers/session-provider";

/**
 * `/modules/dbt/wise-mind` - the check-ins, newest first (spec §3.2.1).
 *
 * ☠️ **No score and no tally.** Not "you checked in 12 times", and above all
 * not "how often you chose wisely" - there is no such measurement, the record
 * stores no outcome, and inventing one would turn a pause into a performance.
 */

export default function DbtWiseMindListScreen() {
  const { t } = useTranslation(["dbt", "errors"]);
  const pushWithOrigin = usePushWithOrigin();
  const { user } = useSession();
  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useWiseMindCheckinPages(user?.id ?? null);
  const checkins = data?.pages.flat() ?? [];

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <FlatList<WiseMindCheckin>
        data={checkins}
        keyExtractor={(checkin) => checkin.id}
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-6 gap-6">
            <View className="gap-2">
              <ScreenHeader title={t("dbt:tools.wiseMind.name")} />
              <Text variant="muted">{t("dbt:wiseMind.listSubtitle")}</Text>
            </View>

            <Button onPress={() => pushWithOrigin("/modules/dbt/wise-mind/new")}>
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("dbt:wiseMind.newTitle")}</Text>
            </Button>

            <SharedToolsRow
              heading={t("dbt:alsoTry")}
              tools={[
                DBT_SHARED_TOOLS.meditation,
                DBT_SHARED_TOOLS.breathing,
                DBT_SHARED_TOOLS.journal,
                DBT_SHARED_TOOLS.actDefusion,
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          isPending ? null : isError ? (
            <ErrorState
              icon="cloud-off"
              title={t("errors:fallback.title")}
              description={t("errors:fallback.description")}
              action={{ label: t("errors:fallback.retry"), onPress: () => void refetch() }}
            />
          ) : (
            <Text variant="muted">{t("dbt:wiseMind.empty")}</Text>
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
            title={item.question}
            // The wise-mind line beside the date, when there is one: it is the
            // half a person comes back to read.
            meta={
              item.wiseMind
                ? `${formatCompactAtOffset(item.createdAt, item.createdOffsetMinutes)} · ${item.wiseMind}`
                : formatCompactAtOffset(item.createdAt, item.createdOffsetMinutes)
            }
            onPress={() =>
              pushWithOrigin({
                pathname: "/modules/dbt/wise-mind/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

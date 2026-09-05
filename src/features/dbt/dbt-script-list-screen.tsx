import { useCallback, useMemo } from "react";
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
import { useScriptPages } from "@/src/features/dbt/queries";
import { orderScriptsAsLadder } from "@/src/features/dbt/repository";
import type { Script } from "@/src/features/dbt/types";
import { useSession } from "@/src/providers/session-provider";

/**
 * `/modules/dbt/scripts` - **the list IS the ladder** (spec §3.4.1).
 *
 * The book's assertive-situation hierarchy is not a separate entity here. Open
 * scripts come first, the rated ones easiest-first, unrated after them
 * newest-first; done ones fall below. That is the whole climb: no rung numbers,
 * no gate, no "you are on step 4 of 10" - the progress is visible because the
 * done ones stop being in the way.
 *
 * ☠️ **No CBT exposure link.** A session saved over there would light CBT's
 * `exposureLadder` milestone, which is a different programme's progress.
 *
 * The ordering itself is pure and lives in the repository, so this screen and
 * its test read the same rule.
 */
export default function DbtScriptListScreen() {
  const { t } = useTranslation(["dbt", "errors"]);
  const pushWithOrigin = usePushWithOrigin();
  const { user } = useSession();
  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useScriptPages(user?.id ?? null);
  const scripts = useMemo(() => orderScriptsAsLadder(data?.pages.flat() ?? []), [data]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <FlatList<Script>
        data={scripts}
        keyExtractor={(script) => script.id}
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-6 gap-6">
            <View className="gap-2">
              <ScreenHeader title={t("dbt:tools.scripts.name")} />
              <Text variant="muted">{t("dbt:scripts.listSubtitle")}</Text>
            </View>

            <Button onPress={() => pushWithOrigin("/modules/dbt/scripts/new")}>
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("dbt:scripts.newTitle")}</Text>
            </Button>

            <SharedToolsRow
              heading={t("dbt:alsoTry")}
              tools={[
                DBT_SHARED_TOOLS.cbtAnger,
                DBT_SHARED_TOOLS.cbtWorry,
                DBT_SHARED_TOOLS.actValues,
                DBT_SHARED_TOOLS.journal,
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
            <Text variant="muted">{t("dbt:scripts.empty")}</Text>
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
            title={item.iWant}
            meta={
              item.doneAt
                ? `${t("dbt:scripts.closedOn")} ${formatCompactAtOffset(item.doneAt, item.doneOffsetMinutes)}`
                : item.situation.split("\n")[0]
            }
            onPress={() =>
              pushWithOrigin({
                pathname: "/modules/dbt/scripts/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

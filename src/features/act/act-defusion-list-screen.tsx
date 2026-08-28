import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { HelpButton } from "@/src/components/app/help-button";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ErrorState } from "@/src/components/app/screen-state";
import { SharedToolsRow } from "@/src/components/app/shared-tools-row";
import { ACT_SHARED_TOOLS } from "@/src/features/act/act-shared-tools";
import { DefusionLogRow } from "@/src/features/act/defusion-log-row";
import { useDefusionLogPages } from "@/src/features/act/queries";
import type { DefusionLog } from "@/src/features/act/types";
import { useSession } from "@/src/providers/session-provider";

/**
 * Defusion's front door AND its archive — the same screen, which is the whole of #1515's
 * shape A. This list used to filter itself to `toLocalDateKey(createdAt) === selectedDate`
 * against a `useSelectedDate()` that returns today and has no setter anywhere in the app,
 * so every entry written before today was unreachable from here. ACT home's recent block
 * already carried a **View all** link pointing at this route (#1510): the door existed and
 * was filtering to today by mistake, which is why a user could see three logs from last
 * week and tap through to an empty screen.
 *
 * ☠️ **The New button must stay above the list.** This route serves double duty now, so
 * anything that pushes the write control below the fold reopens #1515 — that is A's
 * standing cost, and it is why the header block, not the list, owns the button.
 *
 * ☠️ Flat and newest-first, deliberately, and it must stay that way. A day-grouped
 * heading, a date control or a `formatRelativeDayKey` label would each name a day from a
 * second frame, and ACT's nine tables carry no captured occurrence offset (#1513). The
 * sectioning helpers in `src/lib/history-groups.ts` are the obvious grab for anything
 * called "history" and are exactly what must not be imported here.
 */
export default function ActDefusionListScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation(["act", "errors"]);
  const { user } = useSession();
  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useDefusionLogPages(user?.id ?? null);
  const logs = data?.pages.flat() ?? [];

  const loadMore = useCallback(() => {
    // `hasNextPage` alone isn't enough: onEndReached fires repeatedly while the
    // fetch is in flight, and each call would start another page from the same cursor.
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <FlatList<DefusionLog>
        data={logs}
        keyExtractor={(log) => log.id}
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-6 gap-6">
            <View className="gap-2">
              {/* The header help door (#1543) rides the header block into the FlatList
                  header, so the archive rewrite does not take it off the screen. */}
              <ScreenHeader
                title={t("act:defusion.listTitle")}
                right={<HelpButton helpKey="defusion" />}
              />
              <Text variant="muted">{t("act:defusion.listSubtitle")}</Text>
            </View>

            <Button onPress={() => pushWithOrigin("/modules/act/defusion/new")}>
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("act:defusion.newTitle")}</Text>
            </Button>

            <SharedToolsRow heading={t("act:alsoTry")} tools={[ACT_SHARED_TOOLS.journal]} />
          </View>
        }
        /**
         * ☠️ A failed read is NOT an empty history. On a screen whose job is being the
         * complete record, rendering "no entries yet" over an error tells a user their
         * own work is gone — the same "cap wearing the face of an absence" this module
         * already guards against in `getLatestBullsEyeByDomain`.
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
            <Text variant="muted">{t("act:defusion.noLogs")}</Text>
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
          <DefusionLogRow
            log={item}
            onPress={() =>
              pushWithOrigin({
                pathname: "/modules/act/defusion/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

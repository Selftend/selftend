import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
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
import { useObservingSelfSessionPages } from "@/src/features/act/queries";
import type { ObservingSelfSession } from "@/src/features/act/types";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useLocaleFormats } from "@/src/lib/locale-format";

/**
 * The observing self's front door AND its archive (#1515 shape A, #1517 tier 1). The day
 * filter this screen used to apply is gone: see `act-defusion-list-screen.tsx` for why the
 * filter was unreachable-by-design and why the New button has to stay above the list.
 */
export default function ActObservingSelfListScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation(["act", "errors"]);
  const { formatDateTime } = useLocaleFormats();
  const { user } = useSession();
  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useObservingSelfSessionPages(user?.id ?? null);
  const sessions = data?.pages.flat() ?? [];

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <FlatList<ObservingSelfSession>
        data={sessions}
        keyExtractor={(session) => session.id}
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        ItemSeparatorComponent={() => <View className="h-2" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-6 gap-6">
            <View className="gap-2">
              {/* The header help door (#1543) rides the header block into the FlatList
                  header, so the archive rewrite does not take it off the screen. */}
              <ScreenHeader
                title={t("act:observingSelf.listTitle")}
                right={<HelpButton helpKey="observingSelf" />}
              />
              <Text variant="muted">{t("act:observingSelf.listSubtitle")}</Text>
            </View>

            <Button onPress={() => pushWithOrigin("/modules/act/observing-self/new")}>
              <Icon name="visibility" className="size-4 text-primary-foreground" />
              <Text>{t("act:observingSelf.newTitle")}</Text>
            </Button>

            <SharedToolsRow
              heading={t("act:alsoTry")}
              tools={[ACT_SHARED_TOOLS.meditation, ACT_SHARED_TOOLS.journal]}
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
            <Text variant="muted">{t("act:observingSelf.noLogs")}</Text>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator />
            </View>
          ) : null
        }
        renderItem={({ item: session }) => (
          <Pressable
            accessibilityRole="button"
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={() =>
              pushWithOrigin({
                pathname: "/modules/act/observing-self/[id]",
                params: { id: session.id },
              })
            }
            className="rounded-lg border border-border bg-card p-4 active:bg-accent/40"
          >
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 gap-1">
                <Text className="font-semibold leading-snug" numberOfLines={2}>
                  {session.whatWasObserved ||
                    t(`act:observingSelf.techniques.${session.techniqueUsed}`)}
                </Text>
                <Text variant="muted" className="text-xs">
                  {t(`act:observingSelf.techniques.${session.techniqueUsed}`)}
                  {session.moodAfter !== null ? `  ·  ${session.moodAfter}/10` : null}
                </Text>
                <Text variant="muted" className="text-xs">
                  {formatDateTime(session.createdAt)}
                </Text>
              </View>
              <Icon name="chevron-right" className="size-4 text-muted-foreground" />
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

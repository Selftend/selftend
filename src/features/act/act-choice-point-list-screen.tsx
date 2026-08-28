import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ErrorState } from "@/src/components/app/screen-state";
import { useChoicePointPages } from "@/src/features/act/queries";
import type { ChoicePoint } from "@/src/features/act/types";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useLocaleFormats } from "@/src/lib/locale-format";

/**
 * The choice point's front door AND its archive (#1515 shape A, #1517 tier 1). The day
 * filter this screen used to apply is gone: see `act-defusion-list-screen.tsx` for why the
 * filter was unreachable-by-design and why the New button has to stay above the list.
 */
export default function ActChoicePointListScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation(["act", "errors"]);
  const { formatDateTime } = useLocaleFormats();
  const { user } = useSession();
  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useChoicePointPages(user?.id ?? null);
  const choicePoints = data?.pages.flat() ?? [];

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <FlatList<ChoicePoint>
        data={choicePoints}
        keyExtractor={(cp) => cp.id}
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        ItemSeparatorComponent={() => <View className="h-2" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-6 gap-6">
            <View className="gap-2">
              <ScreenHeader title={t("act:choicePoint.listTitle")} />
              <Text variant="muted">{t("act:choicePoint.primer")}</Text>
            </View>

            <Button onPress={() => pushWithOrigin("/modules/act/choice-point/new")}>
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("act:choicePoint.newCta")}</Text>
            </Button>
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
            <Text variant="muted">{t("act:choicePoint.empty")}</Text>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator />
            </View>
          ) : null
        }
        renderItem={({ item: cp }) => (
          <Pressable
            accessibilityRole="button"
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={() =>
              pushWithOrigin({
                pathname: "/modules/act/choice-point/[id]",
                params: { id: cp.id },
              })
            }
            className="rounded-lg border border-border bg-card p-4 active:bg-accent/40"
          >
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 gap-1">
                {cp.hooks.length > 0 ? (
                  <Text className="font-semibold leading-snug" numberOfLines={2}>
                    {cp.hooks.join(", ")}
                  </Text>
                ) : null}
                <Text variant="muted" className="text-xs">
                  {t("act:choicePoint.towardLabel")}: {cp.towardMoves.length}
                  {" · "}
                  {t("act:choicePoint.awayLabel")}: {cp.awayMoves.length}
                </Text>
                <Text variant="muted" className="text-xs">
                  {formatDateTime(cp.createdAt)}
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

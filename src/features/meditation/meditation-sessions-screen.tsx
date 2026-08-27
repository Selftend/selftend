import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { memo, useCallback, useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { EmptyState, ErrorState } from "@/src/components/app/screen-state";
import { useMeditationSessionPages } from "@/src/features/meditation/queries";
import type { MeditationSession } from "@/src/features/meditation/types";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { FORM_COLUMN_WIDTH } from "@/src/lib/layout";
import { formatCompactAtOffset } from "@/src/utils/date";

// Memoized row so the FlatList only re-renders changed items, and navigation stays
// keyed to the session id (#97 - was a .map() inside a ScrollView, all 100 rows mounted).
const SessionRow = memo(function SessionRow({ session }: { session: MeditationSession }) {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("meditation");
  const onPress = useCallback(
    () =>
      pushWithOrigin({ pathname: "/tools/meditation/sessions/[id]", params: { id: session.id } }),
    [session.id, pushWithOrigin],
  );

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className="gap-1 py-3 active:opacity-70"
      role="button"
    >
      <View className="flex-row items-center gap-3">
        <Text className="text-sm font-semibold tabular-nums">
          {t("module.sessions.durationLabel", { count: session.durationMinutes })}
        </Text>
        <View className="flex-1" />
        {/* Chrome, not the module hue (#588) - the same badge the overview's
            rows wear, so one fact does not take two shapes across two screens. */}
        <View className="rounded-full bg-muted px-2 py-0.5">
          <Text className="text-[11px] font-semibold text-primary-ink">
            {t("module.sessions.stageBadge", { stage: session.stageAtSession })}
          </Text>
        </View>
      </View>
      {/* The full instant here, read in the frame it was captured in: this screen
          is the record, so it states when rather than how long ago (#433 §3). */}
      <Text variant="muted" className="text-xs">
        {formatCompactAtOffset(session.completedAt, session.completedOffsetMinutes)}
      </Text>
      {session.reflection ? (
        <Text variant="muted" className="text-[13px] leading-5" numberOfLines={2}>
          {session.reflection}
        </Text>
      ) : null}
    </Pressable>
  );
});

/**
 * Every sit, scrollable to the end (#785, decided on #696).
 *
 * The screen this replaces asked for 100 rows once and called that all history -
 * about four months for a daily meditator, with nothing on screen to say the
 * list had stopped short. It also rendered one empty state for three different
 * situations, so a failed fetch and a brand-new account both read "No sessions
 * yet."
 */
export default function MeditationSessionsScreen() {
  const { t } = useTranslation("meditation");
  const { user } = useSession();
  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useMeditationSessionPages(user?.id ?? null);

  const sessions = useMemo(() => data?.pages.flat() ?? [], [data]);

  const loadMore = useCallback(() => {
    // `hasNextPage` alone isn't enough: onEndReached fires repeatedly while the
    // user keeps dragging, and each call would queue another page fetch.
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SessionRow session={item} />}
        // FlatList is the scroll root so off-screen rows recycle. NativeWind does not
        // cssInterop contentContainerClassName here, so the padding and the reading
        // column both ride contentContainerStyle - a className is silently dropped.
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
            <ScreenHeader title={t("module.sessions.title")} />
            <Text variant="muted">{t("module.sessions.subtitle")}</Text>
          </View>
        }
        ListEmptyComponent={
          // "No sessions yet" is a claim about the account, so it may only be
          // made once a page has actually come back empty. While the first page
          // is in flight, and when it failed outright, the honest answer is a
          // different one - either would otherwise tell a returning user with
          // hundreds of sits that their record is gone. A failed background
          // refetch that still has pages cached never reaches this branch,
          // because the list is not empty.
          isPending ? (
            <View className="py-10">
              <ActivityIndicator />
            </View>
          ) : isError ? (
            <ErrorState
              icon="cloud-off"
              title={t("module.sessions.error.title")}
              description={t("module.sessions.error.description")}
              action={{ label: t("errors:fallback.retry"), onPress: () => void refetch() }}
            />
          ) : (
            // The message IS the title here: `module.sessions.title` is already
            // the screen heading two nodes up, and repeating it puts the same
            // heading on the page twice - one of them announcing an empty list.
            <EmptyState icon="self-improvement" title={t("module.sessions.empty")} />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

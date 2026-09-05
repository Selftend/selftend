import { useCallback, useMemo } from "react";
import { ActivityIndicator, SectionList, View } from "react-native";
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
import { useOppositeActionPlanPages } from "@/src/features/dbt/queries";
import type { OppositeActionPlan } from "@/src/features/dbt/types";
import { useSession } from "@/src/providers/session-provider";

/**
 * `/modules/dbt/opposite-action` - open plans first, then the done ones (spec
 * §3.3.2).
 *
 * ☠️ **Nothing here asks.** No reminder, no "3 plans waiting", no age and no
 * *overdue* on an open plan, and no count of the done ones. An open plan is a
 * plain row until the person closes or deletes it - a plan that starts nagging
 * is the retention mechanic ADR-0004 refuses.
 */
export default function DbtOppositeActionListScreen() {
  const { t } = useTranslation(["dbt", "errors"]);
  const pushWithOrigin = usePushWithOrigin();
  const { user } = useSession();
  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useOppositeActionPlanPages(user?.id ?? null);
  const plans = useMemo(() => data?.pages.flat() ?? [], [data]);

  // Two sections and no more: open, then done. Deliberately NOT grouped by day
  // - an open plan has no day yet, and a heading would have to invent one.
  const sections = useMemo(() => {
    const open = plans.filter((plan) => !plan.doneAt);
    const done = plans.filter((plan) => plan.doneAt);
    return [
      ...(open.length > 0 ? [{ key: "open" as const, data: open }] : []),
      ...(done.length > 0 ? [{ key: "done" as const, data: done }] : []),
    ];
  }, [plans]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <SectionList<OppositeActionPlan, (typeof sections)[number]>
        sections={sections}
        keyExtractor={(plan) => plan.id}
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-6 gap-6">
            <View className="gap-2">
              <ScreenHeader title={t("dbt:tools.oppositeAction.name")} />
              <Text variant="muted">{t("dbt:oppositeAction.listSubtitle")}</Text>
            </View>

            <Button onPress={() => pushWithOrigin("/modules/dbt/opposite-action/new")}>
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("dbt:oppositeAction.newTitle")}</Text>
            </Button>

            <SharedToolsRow
              heading={t("dbt:alsoTry")}
              tools={[
                DBT_SHARED_TOOLS.cbtActivities,
                DBT_SHARED_TOOLS.habits,
                DBT_SHARED_TOOLS.actCommittedAction,
              ]}
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text
            variant="muted"
            className="mt-4 text-[11px] font-semibold uppercase tracking-[0.1em]"
          >
            {t(`dbt:oppositeAction.sections.${section.key}`)}
          </Text>
        )}
        ListEmptyComponent={
          isPending ? null : isError ? (
            <ErrorState
              icon="cloud-off"
              title={t("errors:fallback.title")}
              description={t("errors:fallback.description")}
              action={{ label: t("errors:fallback.retry"), onPress: () => void refetch() }}
            />
          ) : (
            <Text variant="muted">{t("dbt:oppositeAction.empty")}</Text>
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
            title={item.oppositeAction}
            // An open plan shows when it was WRITTEN; a done one shows when it
            // was done. Neither shows an age, and nothing counts.
            meta={
              item.doneAt
                ? `${t("dbt:oppositeAction.doneOn")} ${formatCompactAtOffset(item.doneAt, item.doneOffsetMinutes)}`
                : formatCompactAtOffset(item.createdAt, item.createdOffsetMinutes)
            }
            onPress={() =>
              pushWithOrigin({
                pathname: "/modules/dbt/opposite-action/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

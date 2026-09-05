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
import {
  formatHistoryMonth,
  formatHistoryWhen,
  groupHistorySections,
} from "@/src/lib/history-groups";
import { DBT_SHARED_TOOLS } from "@/src/features/dbt/dbt-shared-tools";
import { useJudgementPages } from "@/src/features/dbt/queries";
import type { Judgement } from "@/src/features/dbt/types";
import { useSession } from "@/src/providers/session-provider";

/**
 * `/modules/dbt/judgements` - the judgement record's history, grouped by day
 * (spec §3.2.2).
 *
 * ⚠️ Grouped, unlike ACT's flat archives, and that is a difference in the DATA
 * rather than in taste: every DBT dated column carries its own captured offset,
 * so a day heading here names the day the record itself names. ACT's tables
 * carry none, which is exactly why its lists must stay flat (#1513).
 *
 * ☠️ **No counts.** Never "you caught 12 this week". Catching a judgement is
 * the skill; counting them turns noticing into scoring, and a week with fewer
 * would read as a worse week rather than a quieter one.
 */
export default function DbtJudgementListScreen() {
  const { t, i18n } = useTranslation(["dbt", "errors"]);
  const pushWithOrigin = usePushWithOrigin();
  const { user } = useSession();
  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isPending, refetch } =
    useJudgementPages(user?.id ?? null);
  const judgements = useMemo(() => data?.pages.flat() ?? [], [data]);
  const sections = useMemo(() => groupHistorySections(judgements), [judgements]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <SectionList<Judgement, (typeof sections)[number]>
        sections={sections}
        keyExtractor={(judgement) => judgement.id}
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-6 gap-6">
            <View className="gap-2">
              <ScreenHeader title={t("dbt:tools.judgements.name")} />
              <Text variant="muted">{t("dbt:judgements.listSubtitle")}</Text>
            </View>

            <Button onPress={() => pushWithOrigin("/modules/dbt/judgements/new")}>
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("dbt:judgements.newTitle")}</Text>
            </Button>

            <SharedToolsRow
              heading={t("dbt:alsoTry")}
              tools={[DBT_SHARED_TOOLS.actDefusion, DBT_SHARED_TOOLS.meditation]}
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text
            variant="muted"
            className="mt-4 text-[11px] font-semibold uppercase tracking-[0.1em]"
          >
            {section.kind === "month" && section.monthKey
              ? formatHistoryMonth(section.monthKey, i18n.language)
              : t(`dbt:judgements.sections.${section.kind}`)}
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
            <Text variant="muted">{t("dbt:judgements.empty")}</Text>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator />
            </View>
          ) : null
        }
        renderItem={({ item, section }) => (
          <HairlineRow
            title={item.judgement}
            meta={
              <View className="flex-row items-center gap-1.5">
                {/* The mark is a small glyph, not a coloured badge: which way a
                    judgement leans is information, not a verdict on the day. */}
                <Icon
                  name={
                    item.valence === "positive" ? "add-circle-outline" : "remove-circle-outline"
                  }
                  size={12}
                  className="text-muted-foreground"
                />
                <Text variant="muted" className="text-xs">
                  {formatHistoryWhen(
                    { loggedAt: item.createdAt, loggedOffsetMinutes: item.createdOffsetMinutes },
                    section.kind,
                    i18n.language,
                  )}
                </Text>
              </View>
            }
            onPress={() =>
              pushWithOrigin({
                pathname: "/modules/dbt/judgements/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

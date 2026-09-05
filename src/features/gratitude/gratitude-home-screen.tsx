import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { ErrorState } from "@/src/components/app/screen-state";
import { Section } from "@/src/components/app/section";
import { ShowAllLink } from "@/src/components/app/show-all-link";
import { GratitudeOnboarding } from "@/src/components/app/gratitude-onboarding-modal";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { BarChart } from "@/src/components/charts/bar-chart";
import { GratitudeEntryCard } from "@/src/features/gratitude/gratitude-entry-card";
import { getGratitudeFrequencyBuckets } from "@/src/features/gratitude/insights";
import {
  useFavoriteGratitudeEntryCount,
  useFavoriteGratitudeEntries,
  useGratitudeEntries,
  useGratitudeEntryCount,
  useGratitudeEntryCountSinceDayKey,
} from "@/src/features/gratitude/queries";
import { HOME_COLUMN } from "@/src/lib/layout";
import { cn } from "@/lib/utils";
import { useSession } from "@/src/providers/session-provider";
import { currentDateKey } from "@/src/stores/selected-date-store";
import { mondayKeyOf } from "@/src/utils/date";

type EntryFilter = "all" | "favorites";
const BAR_AREA_HEIGHT = 68;

export default function GratitudeHomeScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("gratitude");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [filter, setFilter] = useState<EntryFilter>("all");
  const todayKey = currentDateKey();

  const { data: entries, isError, refetch } = useGratitudeEntries(userId, 90);
  const {
    data: favoriteEntries,
    isError: favoritesFailed,
    refetch: refetchFavorites,
  } = useFavoriteGratitudeEntries(userId, 5);
  const { data: totalEntries } = useGratitudeEntryCount(userId);
  const { data: favoriteCount } = useFavoriteGratitudeEntryCount(userId);
  const mondayKey = mondayKeyOf(todayKey);
  const { data: thisWeekCount } = useGratitudeEntryCountSinceDayKey(userId, mondayKey);

  const buckets = useMemo(
    () => getGratitudeFrequencyBuckets(entries ?? [], new Date(`${todayKey}T12:00:00`), 30),
    // Recompute the range if a mounted screen crosses midnight.
    [entries, todayKey],
  );
  const allEntries = entries ?? [];
  const activeEntries = filter === "favorites" ? favoriteEntries : entries;
  const activeFailed = filter === "favorites" ? favoritesFailed : isError;
  const visibleEntries = (filter === "favorites" ? (favoriteEntries ?? []) : allEntries).slice(
    0,
    5,
  );

  return (
    <>
      <GratitudeOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-4">
          <View className={cn(HOME_COLUMN, "gap-6")}>
            <ModuleHomeHeader
              title={t("home.title")}
              tourScope="gratitude"
              description={t("tagline")}
              actions={[
                { type: "notifications", targetKey: "gratitude" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              stats={[
                {
                  value: totalEntries === undefined ? t("hero.loadingValue") : String(totalEntries),
                  label: t("hero.entries", { count: totalEntries ?? 0 }),
                },
                {
                  value:
                    thisWeekCount === undefined ? t("hero.loadingValue") : String(thisWeekCount),
                  label: t("hero.thisWeek"),
                },
                {
                  value:
                    favoriteCount === undefined ? t("hero.loadingValue") : String(favoriteCount),
                  label: t("hero.favorites", { count: favoriteCount ?? 0 }),
                },
              ]}
            />
            <Button
              onPress={() => pushWithOrigin("/tools/gratitude-log/new")}
              className="self-start"
            >
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("newEntry")}</Text>
            </Button>

            {/* The Sections sit in a no-gap group so their own py-6 does not
                compound with the column's gap-6 (#877, same family as
                grounding's #875 and sleep's #878). */}
            <View>
              {entries ? (
                // The Section eyebrow every conformant overview uses, not an
                // h3 heading (#877).
                <Section title={t("insights.frequency")}>
                  <BarChart
                    bars={buckets.map((bucket) => ({
                      key: bucket.id,
                      value: bucket.count,
                      accessibilityLabel: t("insights.dayCount", {
                        date: bucket.label,
                        count: bucket.count,
                      }),
                    }))}
                    barAreaHeight={BAR_AREA_HEIGHT}
                    minBarHeight={4}
                    zeroHeight={2}
                    // bg-primary like every single-series bar chart (#725
                    // family, #877): the think/amber stripes encoded tool
                    // identity, which #691 forbids.
                    tintClass="bg-primary"
                    className="gap-1"
                  />
                  <View className="flex-row justify-between">
                    <Text variant="muted" className="text-xs">
                      {buckets[0]?.label}
                    </Text>
                    <Text variant="muted" className="text-xs">
                      {buckets.at(-1)?.label}
                    </Text>
                  </View>
                </Section>
              ) : null}

              <Section
                title={t("list.recent")}
                action={
                  <ShowAllLink
                    label={t("home.viewAll")}
                    route={
                      filter === "favorites"
                        ? "/tools/gratitude-log/favorites"
                        : "/tools/gratitude-log/entries"
                    }
                  />
                }
              >
                {/* The All/Favourites filter rides the section body, as the
                  design draws it — the heading row could not fit chips, link
                  and eyebrow at 360dp. */}
                <View className="flex-row items-center gap-2">
                  {(["all", "favorites"] as const).map((value) => {
                    const selected = filter === value;
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        aria-pressed={selected}
                        className={cn(
                          "rounded-full border px-3 py-1.5",
                          selected ? "border-primary/30 bg-primary/[0.08]" : "border-transparent",
                        )}
                        onPress={() => setFilter(value)}
                        role="button"
                      >
                        <Text
                          className={cn("text-xs font-semibold", selected && "text-primary-ink")}
                        >
                          {t(`list.filters.${value}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {activeFailed && !activeEntries ? (
                  <ErrorState
                    icon="cloud-off"
                    title={t("list.error.title")}
                    description={t("list.error.description")}
                    action={{
                      label: t("errors:fallback.retry"),
                      onPress: () => void (filter === "favorites" ? refetchFavorites() : refetch()),
                    }}
                  />
                ) : activeEntries && visibleEntries.length === 0 ? (
                  <Text variant="muted">
                    {t(
                      filter === "favorites"
                        ? "favorites.empty.description"
                        : "list.empty.description",
                    )}
                  </Text>
                ) : (
                  <View>
                    {visibleEntries.map((entry) => (
                      <GratitudeEntryCard key={entry.id} entry={entry} />
                    ))}
                  </View>
                )}
              </Section>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

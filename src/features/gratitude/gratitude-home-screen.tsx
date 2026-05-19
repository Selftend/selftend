import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { GratitudeOnboarding } from "@/src/components/app/gratitude-onboarding-modal";
import { NotificationSettingsModal } from "@/src/components/app/notification-settings-modal";
import { GRATITUDE_BREAKS } from "@/src/features/gratitude/breaks";
import {
  getFavoriteGratitudeEntries,
  getGratitudeFrequencyBuckets,
  getGratitudeThemes,
  type GratitudeFrequencyBucket,
  type GratitudeTheme,
} from "@/src/features/gratitude/insights";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { useUserPreferences, useUpdateUserPreferences } from "@/src/features/settings/queries";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { cn } from "@/lib/utils";
import { useSession } from "@/src/providers/session-provider";

export default function GratitudeHomeScreen() {
  const { t } = useTranslation("gratitude");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const { data: entries } = useGratitudeEntries(userId, 90);
  const updatePreferences = useUpdateUserPreferences(userId);

  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | undefined>();
  const [breakIndex, setBreakIndex] = useState(0);

  const onboardingNeeded =
    !prefsLoading && Boolean(preferences) && !preferences?.gratitudeOnboardingCompleted;
  const showOnboarding = onboardingNeeded || forceOnboarding;

  const allEntries = useMemo(() => entries ?? [], [entries]);
  const recentList = useMemo(() => allEntries.slice(0, 7), [allEntries]);
  const frequencyBuckets = useMemo(() => getGratitudeFrequencyBuckets(allEntries), [allEntries]);
  const themes = useMemo(() => getGratitudeThemes(allEntries, 6), [allEntries]);
  const favoriteCount = useMemo(() => getFavoriteGratitudeEntries(allEntries).length, [allEntries]);

  async function handleOnboardingComplete() {
    if (!preferences) return;
    setOnboardingError(undefined);
    try {
      await updatePreferences.mutateAsync(
        mergeUserPreferences(preferences, {
          gratitudeOnboardingCompleted: true,
        }),
      );
      setForceOnboarding(false);
    } catch (error) {
      const fallback = t("onboarding.finish.error");
      const detail = error instanceof Error ? error.message : null;
      setOnboardingError(detail ? `${fallback} (${detail})` : fallback);
    }
  }

  if (prefsLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <>
      <GratitudeOnboarding
        visible={showOnboarding}
        isPending={updatePreferences.isPending}
        errorMessage={onboardingError}
        onComplete={() => void handleOnboardingComplete()}
        onDismiss={forceOnboarding ? () => setForceOnboarding(false) : undefined}
      />
      <NotificationSettingsModal
        targetKey="gratitude"
        visible={showNotifications}
        onDismiss={() => setShowNotifications(false)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <ModuleHomeHeader
                title={t("home.title")}
                actions={[
                  {
                    icon: "notifications",
                    accessibilityLabel: t("notifications:actions.open"),
                    onPress: () => setShowNotifications(true),
                  },
                  {
                    icon: "help-outline",
                    accessibilityLabel: t("onboarding.helpHint"),
                    onPress: () => setForceOnboarding(true),
                  },
                ]}
              />
              <Text variant="muted">{t("home.subtitle")}</Text>
            </View>

            <Button onPress={() => router.push("/tools/gratitude-log/new")} className="self-start">
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("cta.new")}</Text>
            </Button>

            <BreakCard
              breakIndex={breakIndex}
              onDismiss={() => setBreakIndex((prev) => prev + 1)}
            />

            <InsightsSection
              buckets={frequencyBuckets}
              favoriteCount={favoriteCount}
              themes={themes}
            />

            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("list.recent")}
                </Text>
                {recentList.length > 0 ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => router.push("/tools/gratitude-log/entries")}
                  >
                    <Text className="text-sm text-primary">{t("home.viewAll")}</Text>
                  </Pressable>
                ) : null}
              </View>

              {recentList.length === 0 ? (
                <Text variant="muted">{t("list.empty.description")}</Text>
              ) : (
                <View className="gap-3">
                  {recentList.map((entry) => (
                    <Pressable
                      key={entry.id}
                      accessibilityRole="button"
                      accessibilityLabel={t("list.viewEntry", {
                        when: formatMoodRelativeTime(entry.loggedAt, t),
                      })}
                      onPress={() =>
                        router.push({
                          pathname: "/tools/gratitude-log/[id]",
                          params: { id: entry.id },
                        })
                      }
                      className="gap-2 rounded-2xl border border-border bg-card p-4 active:bg-accent/40"
                      role="button"
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className="flex-1 text-base font-semibold" numberOfLines={1}>
                          {entry.items[0] ?? t("list.fallbackItem")}
                        </Text>
                        <Text variant="muted" className="text-xs">
                          {formatMoodRelativeTime(entry.loggedAt, t)}
                        </Text>
                      </View>
                      <Text variant="muted" className="text-sm">
                        {t("list.itemsCount", { count: entry.items.length })}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

interface InsightsSectionProps {
  buckets: GratitudeFrequencyBucket[];
  favoriteCount: number;
  themes: GratitudeTheme[];
}

function InsightsSection({ buckets, favoriteCount, themes }: InsightsSectionProps) {
  const { t } = useTranslation("gratitude");
  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const hasFrequency = buckets.some((bucket) => bucket.count > 0);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("insights.title")}
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push("/tools/gratitude-log/favorites")}
        >
          <Text className="text-sm text-primary">{t("insights.favoritesOpen")}</Text>
        </Pressable>
      </View>

      <View className="gap-4 rounded-2xl border border-border bg-card p-4">
        <View className="gap-2">
          <Text className="text-base font-semibold">{t("insights.frequencyTitle")}</Text>
          {hasFrequency ? (
            <View className="flex-row items-end gap-2">
              {buckets.map((bucket) => {
                const height = bucket.count > 0 ? Math.max(6, (bucket.count / maxCount) * 64) : 2;
                return (
                  <View key={bucket.id} className="flex-1 items-center gap-1">
                    <View className="h-16 w-full justify-end">
                      <View className="w-full rounded-t-md bg-primary/70" style={{ height }} />
                    </View>
                    <Text variant="muted" className="text-[10px] leading-3">
                      {bucket.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text variant="muted" className="text-sm">
              {t("insights.frequencyEmpty")}
            </Text>
          )}
        </View>

        <View className="gap-2">
          <Text className="text-base font-semibold">{t("insights.themesTitle")}</Text>
          {themes.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {themes.map((theme) => (
                <Text
                  key={theme.word}
                  className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
                >
                  {t("insights.themeCount", { word: theme.word, count: theme.count })}
                </Text>
              ))}
            </View>
          ) : (
            <Text variant="muted" className="text-sm">
              {t("insights.themesEmpty")}
            </Text>
          )}
        </View>

        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-base font-semibold">{t("insights.favoritesTitle")}</Text>
            <Text variant="muted" className="text-sm">
              {t("insights.favoritesCount", { count: favoriteCount })}
            </Text>
          </View>
          <Icon name="star" className="size-5 text-primary" />
        </View>
      </View>
    </View>
  );
}

const CATEGORY_CLASSES = {
  "positive-psychology":
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  stoicism: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "mental-subtraction": "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
} as const;

interface BreakCardProps {
  breakIndex: number;
  onDismiss: () => void;
}

function BreakCard({ breakIndex, onDismiss }: BreakCardProps) {
  const { t } = useTranslation("gratitude");
  const breakDef = GRATITUDE_BREAKS[breakIndex % GRATITUDE_BREAKS.length];
  if (!breakDef) return null;

  const cardKey = `breaks.cards.${breakDef.slug}` as Parameters<typeof t>[0];
  const title = t(`${cardKey}.title` as Parameters<typeof t>[0]);
  const categoryLabel = t(`breaks.categories.${breakDef.category}` as Parameters<typeof t>[0]);

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("breaks.sectionLabel")}
      </Text>
      <View className="rounded-2xl border border-border bg-card p-4 gap-3">
        <View className="flex-row items-center justify-between">
          <Text
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              CATEGORY_CLASSES[breakDef.category],
            )}
          >
            {categoryLabel}
          </Text>
          <Pressable
            accessibilityLabel={t("breaks.dismiss")}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onDismiss}
          >
            <Icon name="arrow-forward" className="text-muted-foreground" size={18} />
          </Pressable>
        </View>
        <View className="gap-1">
          <Text className="text-base font-semibold">{title}</Text>
          <Text variant="muted" className="text-sm">
            {t(`${cardKey}.body` as Parameters<typeof t>[0])}
          </Text>
        </View>
      </View>
    </View>
  );
}

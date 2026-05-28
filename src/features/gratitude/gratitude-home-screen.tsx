import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";

import { ToolHero } from "@/src/components/app/tool-hero";
import { Badge } from "@/src/components/react-native-reusables/badge";
import { Button } from "@/src/components/react-native-reusables/button";
import { Card } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { GratitudeOnboarding } from "@/src/components/app/gratitude-onboarding-modal";
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
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import type { TintToken } from "@/src/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useSession } from "@/src/providers/session-provider";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

const THEME_TINTS: TintToken[] = ["be", "act", "think", "iris", "ink", "clay"];

export default function GratitudeHomeScreen() {
  const { t } = useTranslation("gratitude");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { selectedDate } = useSelectedDate();

  const { data: entries } = useGratitudeEntries(userId, 90);

  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [breakIndex, setBreakIndex] = useState(0);

  const allEntries = entries ?? [];
  const recentList = allEntries
    .filter((entry) => toLocalDateKey(entry.loggedAt) === selectedDate)
    .slice(0, 7);
  const frequencyBuckets = getGratitudeFrequencyBuckets(allEntries);
  const rawThemes = getGratitudeThemes(allEntries, 6);
  const favoriteCount = getFavoriteGratitudeEntries(allEntries).length;
  const thisWeekCount = frequencyBuckets.slice(-7).reduce((sum, bucket) => sum + bucket.count, 0);

  const hasFrequency = frequencyBuckets.some((b) => b.count > 0);
  const maxCount = Math.max(1, ...frequencyBuckets.map((b) => b.count));
  const frequencyData = hasFrequency
    ? frequencyBuckets.map((b) => ({
        label: b.label,
        height: b.count > 0 ? Math.max(6, (b.count / maxCount) * 100) : 2,
      }))
    : null;

  const themesWithTints =
    rawThemes.length > 0
      ? rawThemes.map((theme, i) => ({
          ...theme,
          tint: THEME_TINTS[i % THEME_TINTS.length] as TintToken,
        }))
      : null;

  const hasInsights = hasFrequency || rawThemes.length > 0 || favoriteCount > 0;

  return (
    <>
      <GratitudeOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow gap-6 p-4">
          <ToolHero
            hue="think"
            icon="favorite"
            title={t("home.title")}
            moduleLabel={t("moduleLabel")}
            tagline={t("tagline")}
            meta={
              <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
                <Text variant="muted" className="text-xs">
                  <Text className="text-xs font-bold text-think">
                    {t("hero.entries", { count: allEntries.length })}
                  </Text>
                </Text>
                <Text variant="muted" className="text-xs">
                  <Text className="text-xs font-bold text-think">
                    {t("hero.favorites", { count: favoriteCount })}
                  </Text>
                </Text>
                <Text variant="muted" className="text-xs">
                  {t("hero.thisWeek")} ·{" "}
                  <Text className="text-xs font-bold text-think">{thisWeekCount}</Text>
                </Text>
              </View>
            }
          />

          <View className="px-4">
            <Text variant="eyebrow" tint="primary">
              {t("authorEyebrow")}
            </Text>
          </View>

          <View className="flex-row items-center gap-3">
            <Button onPress={() => router.push("/tools/gratitude-log/new")} className="self-start">
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("newEntry")}</Text>
            </Button>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("onboarding.helpHint")}
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={() => setForceOnboarding(true)}
            >
              <Icon name="info-outline" size={20} className="text-muted-foreground" />
            </Pressable>
          </View>

          {/* Featured break card with gradient stripe */}
          <BreakCard breakIndex={breakIndex} onDismiss={() => setBreakIndex((prev) => prev + 1)} />

          {/* Insights card */}
          {hasInsights ? (
            <View>
              <Text variant="eyebrow" className="mb-2.5">
                {t("insights.title")}
              </Text>
              <Card className="gap-5 p-5">
                {frequencyData ? (
                  <FrequencyBars
                    data={frequencyData}
                    weekLabel={t("insights.thisWeek")}
                    title={t("insights.frequency")}
                  />
                ) : null}
                {themesWithTints ? (
                  <View className={cn(frequencyData ? "border-t border-border pt-4" : "")}>
                    <Text className="text-sm font-semibold">{t("insights.themes")}</Text>
                    <ThemeChips themes={themesWithTints} />
                  </View>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("insights.favorites")}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => router.push("/tools/gratitude-log/favorites")}
                  className={cn(
                    "flex-row items-center justify-between active:opacity-80",
                    frequencyData || themesWithTints ? "border-t border-border pt-4" : "",
                  )}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      className="h-9 w-9 items-center justify-center rounded-[10px] bg-[hsl(var(--think)/0.12)]"
                    >
                      <Icon name="star" size={20} className="text-think" />
                    </View>
                    <View>
                      <Text className="text-sm font-semibold">{t("insights.favorites")}</Text>
                      <Text variant="muted" className="mt-0.5 text-xs">
                        {t("insights.savedCount", { count: favoriteCount })}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={20} className="text-muted-foreground" />
                </Pressable>
              </Card>
            </View>
          ) : null}

          {/* Recent entries */}
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
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ---------------------------------------------------------------------------
// FrequencyBars
// ---------------------------------------------------------------------------

interface FrequencyBarsProps {
  data: { label: string; height: number }[];
  weekLabel: string;
  title: string;
}

function FrequencyBars({ data, weekLabel, title }: FrequencyBarsProps) {
  return (
    <View>
      <View className="flex-row items-baseline justify-between">
        <Text className="text-sm font-semibold">{title}</Text>
        <Text variant="muted" className="text-xs">
          {weekLabel}
        </Text>
      </View>
      <View className="mt-3.5 flex-row items-end gap-2.5">
        {data.map((bar, i) => (
          <View key={i} className="flex-1 items-center gap-1.5">
            <View className="h-16 w-full justify-end overflow-hidden rounded-t-md">
              <LinearGradient
                colors={["hsl(43, 74%, 52%)", "hsla(43, 74%, 52%, 0.5)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ height: `${bar.height}%` as unknown as number, borderRadius: 4 }}
              />
            </View>
            <Text variant="muted" className="text-[10px] font-semibold">
              {bar.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ThemeChips
// ---------------------------------------------------------------------------

interface ThemeChipsProps {
  themes: (GratitudeTheme & { tint: TintToken })[];
}

function ThemeChips({ themes }: ThemeChipsProps) {
  return (
    <View className="mt-2.5 flex-row flex-wrap gap-2">
      {themes.map(({ word, count, tint }) => (
        <Badge key={word} variant="tint" tint={tint}>
          <Text>
            {word} <Text className="opacity-60">· {count}</Text>
          </Text>
        </Badge>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// BreakCard — featured prompt card with top-edge gradient stripe
// ---------------------------------------------------------------------------

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
    <View>
      <Text variant="eyebrow" className="mb-2.5">
        {t("promptEyebrow")}
      </Text>
      <Card className="relative overflow-hidden px-5 py-4">
        {/* Top-edge think→clay gradient stripe */}
        <LinearGradient
          colors={["hsl(43, 74%, 52%)", "hsl(20, 52%, 50%)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, height: 3 }}
        />
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
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={onDismiss}
          >
            <Icon name="arrow-forward" size={18} className="text-muted-foreground" />
          </Pressable>
        </View>
        <Text className="mt-2.5 text-[22px] font-bold tracking-tight">{title}</Text>
        <Text variant="muted" className="mt-1.5 text-sm leading-relaxed max-w-[62ch]">
          {t(`${cardKey}.body` as Parameters<typeof t>[0])}
        </Text>
      </Card>
    </View>
  );
}

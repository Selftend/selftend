import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { BackButton } from "@/src/components/app/back-button";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  GratitudeOnboarding,
  type GratitudeOnboardingResult,
} from "@/src/components/app/gratitude-onboarding-modal";
import { GRATITUDE_BREAKS } from "@/src/features/gratitude/breaks";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { useUserPreferences, useUpdateUserPreferences } from "@/src/features/settings/queries";
import { mergeUserPreferences, type GratitudeLevel } from "@/src/features/modules/types";
import { cn } from "@/lib/utils";
import { useSession } from "@/src/providers/session-provider";

const LEVELS: GratitudeLevel[] = [1, 2, 3];

export default function GratitudeHomeScreen() {
  const { t } = useTranslation("gratitude");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const { data: entries } = useGratitudeEntries(userId, 7);
  const updatePreferences = useUpdateUserPreferences(userId);

  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | undefined>();
  const [breakIndex, setBreakIndex] = useState(0);

  const onboardingNeeded =
    !prefsLoading && Boolean(preferences) && !preferences?.gratitudeOnboardingCompleted;
  const showOnboarding = onboardingNeeded || forceOnboarding;

  const currentLevel = (preferences?.gratitudeDefaultLevel ?? 1) as GratitudeLevel;

  async function handleOnboardingComplete(result: GratitudeOnboardingResult) {
    if (!preferences) return;
    setOnboardingError(undefined);
    try {
      await updatePreferences.mutateAsync(
        mergeUserPreferences(preferences, {
          gratitudeOnboardingCompleted: true,
          gratitudeDefaultLevel: result.defaultLevel,
        }),
      );
      setForceOnboarding(false);
    } catch (error) {
      const fallback = t("onboarding.pick.error");
      const detail = error instanceof Error ? error.message : null;
      setOnboardingError(detail ? `${fallback} (${detail})` : fallback);
    }
  }

  async function handleLevelChange(level: GratitudeLevel) {
    if (!preferences || level === currentLevel) return;
    await updatePreferences.mutateAsync(
      mergeUserPreferences(preferences, { gratitudeDefaultLevel: level }),
    );
  }

  if (prefsLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const recentList = entries ?? [];

  return (
    <>
      <GratitudeOnboarding
        visible={showOnboarding}
        isPending={updatePreferences.isPending}
        errorMessage={onboardingError}
        onComplete={(result) => void handleOnboardingComplete(result)}
        onDismiss={forceOnboarding ? () => setForceOnboarding(false) : undefined}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <BackButton showLabel={false} className="-ml-2" />
                <Text variant="h1">{t("home.title")}</Text>
                <Pressable
                  accessibilityLabel={t("onboarding.helpHint")}
                  accessibilityRole="button"
                  onPress={() => setForceOnboarding(true)}
                  hitSlop={8}
                >
                  <Icon name="help-outline" className="text-muted-foreground" size={20} />
                </Pressable>
              </View>
              <Text variant="muted">{t("home.subtitle")}</Text>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("home.levelLabel")}
              </Text>
              <View className="flex-row gap-2">
                {LEVELS.map((level) => (
                  <Pressable
                    key={level}
                    accessibilityRole="button"
                    accessibilityState={{ selected: currentLevel === level }}
                    onPress={() => void handleLevelChange(level)}
                    className={cn(
                      "flex-1 items-center rounded-xl border py-3 gap-1",
                      currentLevel === level
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card active:bg-accent/40",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm font-bold",
                        currentLevel === level ? "text-primary" : "text-foreground",
                      )}
                    >
                      {t(`home.level${level}Name`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Button
              onPress={() =>
                router.push({
                  pathname: "/modules/gratitude/new",
                  params: { level: String(currentLevel) },
                })
              }
              className="self-start"
            >
              <Icon name="add" className="size-4 text-primary-foreground" />
              <Text>{t("cta.new")}</Text>
            </Button>

            <BreakCard
              breakIndex={breakIndex}
              onDismiss={() => setBreakIndex((prev) => prev + 1)}
            />

            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("list.recent")}
                </Text>
                {recentList.length > 0 ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() =>
                      router.push("/modules/gratitude/entries" as Parameters<typeof router.push>[0])
                    }
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
                          pathname: "/modules/gratitude/entries/[id]",
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
  const short = t(`${cardKey}.short` as Parameters<typeof t>[0]);
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
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/modules/gratitude/breaks/[slug]",
              params: { slug: breakDef.slug },
            })
          }
        >
          <View className="gap-1">
            <Text className="text-base font-semibold">{title}</Text>
            <Text variant="muted" className="text-sm" numberOfLines={2}>
              {short}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/modules/gratitude/breaks/[slug]",
              params: { slug: breakDef.slug },
            })
          }
          className="self-start"
        >
          <Text className="text-sm font-semibold text-primary">{t("breaks.open")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

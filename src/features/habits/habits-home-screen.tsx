import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { BackButton } from "@/src/components/app/back-button";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { HabitsOnboarding } from "@/src/components/app/habits-onboarding-modal";
import { HABITS_LEARN_CARDS } from "@/src/features/habits/learn";
import {
  getIdentityRoundUp,
  getTwoMinuteAdoption,
  getWeeklyRhythm,
  type IdentityRoundUp,
  type WeekdayRhythm,
} from "@/src/features/habits/insights";
import { useHabits, useHabitLogs, useToggleHabitLog } from "@/src/features/habits/queries";
import {
  addDays,
  isAtMissTwiceRisk,
  isScheduledOn,
  isTickedOn,
  lastSevenDays,
  toLocalDateString,
  todayLocalDateString,
} from "@/src/features/habits/scheduling";
import type { Habit, HabitLog } from "@/src/features/habits/types";
import { useUserPreferences, useUpdateUserPreferences } from "@/src/features/settings/queries";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";

export default function HabitsHomeScreen() {
  const { t } = useTranslation("habits");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const { data: habits, isLoading: habitsLoading } = useHabits(userId);
  const sinceDate = useMemo(() => {
    const start = addDays(new Date(), -30);
    return toLocalDateString(start);
  }, []);
  const { data: logs } = useHabitLogs(userId, { sinceDate });
  const updatePreferences = useUpdateUserPreferences(userId);
  const toggleLog = useToggleHabitLog(userId);

  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | undefined>();
  const [learnIndex, setLearnIndex] = useState(0);

  const onboardingNeeded =
    !prefsLoading && Boolean(preferences) && !preferences?.habitsOnboardingCompleted;
  const showOnboarding = onboardingNeeded || forceOnboarding;

  const allHabits = useMemo(() => habits ?? [], [habits]);
  const allLogs = useMemo(() => logs ?? [], [logs]);
  const todayStr = todayLocalDateString();
  const today = useMemo(() => new Date(), []);

  const todayHabits = useMemo(
    () => allHabits.filter((habit) => isScheduledOn(habit, today)),
    [allHabits, today],
  );

  const identities = useMemo(() => {
    const seen = new Set<string>();
    for (const habit of allHabits) {
      const id = habit.identity.trim();
      if (id) seen.add(id);
    }
    return Array.from(seen);
  }, [allHabits]);

  const missTwiceRiskHabits = useMemo(
    () => todayHabits.filter((habit) => isAtMissTwiceRisk(habit, allLogs, today)),
    [todayHabits, allLogs, today],
  );

  const recentLogs = useMemo(() => allLogs.slice(0, 5), [allLogs]);
  const weeklyRhythm = useMemo(() => getWeeklyRhythm(allLogs, 4, today), [allLogs, today]);
  const identityRoundUp = useMemo(
    () => getIdentityRoundUp(allHabits, allLogs, today),
    [allHabits, allLogs, today],
  );
  const twoMinuteAdoption = useMemo(() => getTwoMinuteAdoption(allHabits), [allHabits]);

  async function handleOnboardingComplete() {
    if (!preferences) return;
    setOnboardingError(undefined);
    try {
      await updatePreferences.mutateAsync(
        mergeUserPreferences(preferences, {
          habitsOnboardingCompleted: true,
        }),
      );
      setForceOnboarding(false);
    } catch (error) {
      const fallback = t("onboarding.finish.error");
      const detail = error instanceof Error ? error.message : null;
      setOnboardingError(detail ? `${fallback} (${detail})` : fallback);
    }
  }

  function handleToggle(habitId: string) {
    toggleLog.mutate({ habitId, loggedOn: todayStr });
  }

  if (prefsLoading || habitsLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <>
      <HabitsOnboarding
        visible={showOnboarding}
        isPending={updatePreferences.isPending}
        errorMessage={onboardingError}
        onComplete={() => void handleOnboardingComplete()}
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

            {identities.length > 0 ? (
              <View className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <Text className="text-sm">
                  {t("home.identityBannerPrefix")}{" "}
                  <Text className="font-semibold">
                    {identities[Math.floor(today.getDate()) % identities.length]}
                  </Text>
                </Text>
              </View>
            ) : null}

            <View className="flex-row flex-wrap gap-2">
              <Button onPress={() => router.push("/tools/habits/new")} className="self-start">
                <Icon name="add" className="size-4 text-primary-foreground" />
                <Text>{t("cta.newHabit")}</Text>
              </Button>
              <Button variant="ghost" onPress={() => router.push("/tools/habits/history")}>
                <Icon name="history" className="size-4" />
                <Text>{t("cta.viewHistory")}</Text>
              </Button>
            </View>

            {missTwiceRiskHabits.length > 0 ? (
              <View className="gap-2 rounded-2xl border border-amber-300/40 bg-amber-100/40 p-4 dark:border-amber-700/40 dark:bg-amber-900/20">
                <Text className="font-semibold">{t("home.neverMissTwiceTitle")}</Text>
                <Text variant="muted">{t("home.neverMissTwiceBody")}</Text>
              </View>
            ) : null}

            <View className="gap-3">
              <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("home.todayHeading")}
              </Text>

              {allHabits.length === 0 ? (
                <View className="gap-2 rounded-2xl border border-border bg-card p-5">
                  <Text className="text-base font-semibold">{t("home.noHabitsTitle")}</Text>
                  <Text variant="muted">{t("home.noHabitsBody")}</Text>
                </View>
              ) : todayHabits.length === 0 ? (
                <Text variant="muted">{t("home.todayEmpty")}</Text>
              ) : (
                <View className="gap-3">
                  {todayHabits.map((habit) => (
                    <HabitRow
                      key={habit.id}
                      habit={habit}
                      logs={allLogs}
                      todayStr={todayStr}
                      onToggle={() => handleToggle(habit.id)}
                      onOpen={() =>
                        router.push({
                          pathname: "/tools/habits/[id]",
                          params: { id: habit.id },
                        })
                      }
                    />
                  ))}
                </View>
              )}
            </View>

            <LearnCard
              learnIndex={learnIndex}
              onDismiss={() => setLearnIndex((prev) => prev + 1)}
            />

            {allHabits.length > 0 ? (
              <InsightsSection
                rhythm={weeklyRhythm}
                identityRoundUp={identityRoundUp}
                twoMinuteAdoption={twoMinuteAdoption}
              />
            ) : null}

            <View className="gap-3">
              <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("home.recentActivity")}
              </Text>
              {recentLogs.length === 0 ? (
                <Text variant="muted">{t("home.recentEmpty")}</Text>
              ) : (
                <View className="gap-2">
                  {recentLogs.map((log) => {
                    const habit = allHabits.find((h) => h.id === log.habitId);
                    if (!habit) return null;
                    return (
                      <Pressable
                        key={log.id}
                        accessibilityRole="button"
                        onPress={() =>
                          router.push({
                            pathname: "/tools/habits/[id]",
                            params: { id: habit.id },
                          })
                        }
                        className="flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 active:bg-accent/40"
                        role="button"
                      >
                        <View className="flex-1">
                          <Text className="text-sm font-semibold">{habit.name}</Text>
                          {habit.identity ? (
                            <Text variant="muted" className="text-xs">
                              {habit.identity}
                            </Text>
                          ) : null}
                        </View>
                        <Text variant="muted" className="text-xs">
                          {formatMoodRelativeTime(`${log.loggedOn}T12:00:00`, t)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

interface HabitRowProps {
  habit: Habit;
  logs: HabitLog[];
  todayStr: string;
  onToggle: () => void;
  onOpen: () => void;
}

function HabitRow({ habit, logs, todayStr, onToggle, onOpen }: HabitRowProps) {
  const { t } = useTranslation("habits");
  const tickedToday = isTickedOn(logs, habit.id, todayStr);
  const days = useMemo(() => lastSevenDays(), []);
  const colorClass = colorChipClass(habit.color);

  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityLabel={
            tickedToday
              ? t("list.tickedToday")
              : habit.kind === "break"
                ? t("list.tapToAvoid")
                : t("list.tapToTick")
          }
          accessibilityRole="button"
          accessibilityState={{ checked: tickedToday }}
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={onToggle}
          className={cn(
            "size-10 items-center justify-center rounded-xl border",
            tickedToday ? `${colorClass.bg} ${colorClass.border}` : "border-border bg-background",
          )}
          role="checkbox"
        >
          {tickedToday ? (
            <Icon name="check" className={`size-5 ${colorClass.text}`} />
          ) : (
            <Icon name="radio-button-unchecked" className="size-5 text-muted-foreground" />
          )}
        </Pressable>
        <Pressable
          accessibilityLabel={t("list.openDetail")}
          accessibilityRole="button"
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={onOpen}
          className="flex-1"
          role="button"
        >
          <Text className="text-base font-semibold">{habit.name}</Text>
          {habit.identity ? (
            <Text variant="muted" className="text-xs">
              {habit.identity}
            </Text>
          ) : habit.twoMinuteVersion ? (
            <Text variant="muted" className="text-xs">
              {habit.twoMinuteVersion}
            </Text>
          ) : null}
        </Pressable>
        <Icon name="chevron-right" className="size-5 text-muted-foreground" />
      </View>

      <View className="gap-1.5">
        <Text variant="muted" className="text-[10px] uppercase tracking-wider">
          {t("home.weekStripLabel")}
        </Text>
        <View className="flex-row gap-1.5">
          {days.map((day) => {
            const dayStr = toLocalDateString(day);
            const ticked = isTickedOn(logs, habit.id, dayStr);
            const scheduled = isScheduledOn(habit, day);
            return (
              <View
                key={dayStr}
                className={cn(
                  "h-6 flex-1 rounded-md border",
                  ticked
                    ? `${colorClass.bg} ${colorClass.border}`
                    : scheduled
                      ? "border-border bg-muted/40"
                      : "border-dashed border-border bg-background",
                )}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

interface InsightsSectionProps {
  rhythm: WeekdayRhythm[];
  identityRoundUp: IdentityRoundUp[];
  twoMinuteAdoption: { filled: number; total: number; ratio: number };
}

function InsightsSection({ rhythm, identityRoundUp, twoMinuteAdoption }: InsightsSectionProps) {
  const { t } = useTranslation("habits");
  const maxCount = Math.max(1, ...rhythm.map((r) => r.count));
  const hasRhythm = rhythm.some((r) => r.count > 0);
  const hasIdentities = identityRoundUp.length > 0;
  const hasTwoMinute = twoMinuteAdoption.total > 0;
  const adoptionPct = Math.round(twoMinuteAdoption.ratio * 100);

  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("insights.title")}
      </Text>

      <View className="gap-4 rounded-2xl border border-border bg-card p-4">
        <View className="gap-2">
          <Text className="text-base font-semibold">{t("insights.rhythmTitle")}</Text>
          <Text variant="muted" className="text-xs">
            {t("insights.rhythmSubtitle")}
          </Text>
          {hasRhythm ? (
            <View className="flex-row items-end gap-2">
              {rhythm.map((bucket) => {
                const height = bucket.count > 0 ? Math.max(6, (bucket.count / maxCount) * 64) : 2;
                return (
                  <View key={bucket.weekday} className="flex-1 items-center gap-1">
                    <View className="h-16 w-full justify-end">
                      <View className="w-full rounded-t-md bg-primary/70" style={{ height }} />
                    </View>
                    <Text variant="muted" className="text-[10px] leading-3">
                      {t(`insights.weekday.${bucket.weekday}` as const)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text variant="muted" className="text-sm">
              {t("insights.rhythmEmpty")}
            </Text>
          )}
        </View>

        <View className="gap-2">
          <Text className="text-base font-semibold">{t("insights.identityTitle")}</Text>
          {hasIdentities ? (
            <View className="gap-1.5">
              {identityRoundUp.map((row) => (
                <View key={row.identity} className="flex-row items-center justify-between gap-3">
                  <Text className="flex-1 text-sm" numberOfLines={1}>
                    {row.identity}
                  </Text>
                  <Text variant="muted" className="text-xs">
                    {t("insights.identityRow", { count: row.count })}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text variant="muted" className="text-sm">
              {t("insights.identityEmpty")}
            </Text>
          )}
        </View>

        <View className="gap-2">
          <Text className="text-base font-semibold">{t("insights.twoMinuteTitle")}</Text>
          {hasTwoMinute ? (
            <View className="gap-1.5">
              <View className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <View
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${adoptionPct}%` }}
                />
              </View>
              <Text variant="muted" className="text-xs">
                {t("insights.twoMinuteSubtitle", {
                  count: twoMinuteAdoption.total,
                  filled: twoMinuteAdoption.filled,
                  total: twoMinuteAdoption.total,
                })}
              </Text>
            </View>
          ) : (
            <Text variant="muted" className="text-sm">
              {t("insights.twoMinuteEmpty")}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

interface LearnCardProps {
  learnIndex: number;
  onDismiss: () => void;
}

function LearnCard({ learnIndex, onDismiss }: LearnCardProps) {
  const { t } = useTranslation("habits");
  const card = HABITS_LEARN_CARDS[learnIndex % HABITS_LEARN_CARDS.length];
  if (!card) return null;
  const chip = colorChipClass(card.tone);
  const cardKey = `learn.cards.${card.slug}` as const;

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("learn.sectionLabel")}
      </Text>
      <Pressable
        accessibilityLabel={t(`${cardKey}.title` as Parameters<typeof t>[0])}
        accessibilityHint={t("learn.openHint")}
        accessibilityRole="button"
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={() =>
          router.push({
            pathname: "/tools/habits/learn/[slug]",
            params: { slug: card.slug },
          })
        }
        className="gap-3 rounded-2xl border border-border bg-card p-4 active:bg-accent/40"
        role="button"
      >
        <View className="flex-row items-center justify-between">
          <View className={cn("size-10 items-center justify-center rounded-xl", chip.bg)}>
            <Icon name={card.icon} className={cn("size-5", chip.text)} />
          </View>
          <Pressable
            accessibilityLabel={t("learn.dismiss")}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onDismiss}
          >
            <Icon name="arrow-forward" className="size-5 text-muted-foreground" />
          </Pressable>
        </View>
        <View className="gap-1">
          <Text className="text-base font-semibold">
            {t(`${cardKey}.title` as Parameters<typeof t>[0])}
          </Text>
          <Text variant="muted" className="text-sm">
            {t(`${cardKey}.short` as Parameters<typeof t>[0])}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

interface ColorChip {
  bg: string;
  border: string;
  text: string;
}

export function colorChipClass(color: Habit["color"]): ColorChip {
  switch (color) {
    case "be":
      return { bg: "bg-be/20", border: "border-be/40", text: "text-be" };
    case "act":
      return { bg: "bg-act/20", border: "border-act/40", text: "text-act" };
    case "amber":
      return {
        bg: "bg-amber-200/40 dark:bg-amber-900/30",
        border: "border-amber-400/40",
        text: "text-amber-700 dark:text-amber-300",
      };
    case "emerald":
      return {
        bg: "bg-emerald-200/40 dark:bg-emerald-900/30",
        border: "border-emerald-400/40",
        text: "text-emerald-700 dark:text-emerald-300",
      };
    case "violet":
      return {
        bg: "bg-violet-200/40 dark:bg-violet-900/30",
        border: "border-violet-400/40",
        text: "text-violet-700 dark:text-violet-300",
      };
    case "rose":
      return {
        bg: "bg-rose-200/40 dark:bg-rose-900/30",
        border: "border-rose-400/40",
        text: "text-rose-700 dark:text-rose-300",
      };
    case "primary":
    default:
      return { bg: "bg-primary/20", border: "border-primary/40", text: "text-primary" };
  }
}

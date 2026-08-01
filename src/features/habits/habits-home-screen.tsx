import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { BarChart } from "@/src/components/charts/bar-chart";
import { ContentSheet } from "@/src/components/app/content-sheet";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { ToolStats } from "@/src/components/app/tool-stats";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { HabitsOnboarding } from "@/src/components/app/habits-onboarding-modal";
import { useHabitChipPalette } from "@/src/features/habits/habit-color";
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
  localDateKey,
} from "@/src/features/habits/scheduling";
import type { Habit, HabitLog } from "@/src/features/habits/types";
import { formatRelativeDayKey } from "@/src/utils/relative-time";
import { parseLocalNoon } from "@/src/utils/date";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP, spaceKeyActivationProps } from "@/src/lib/accessibility";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";
import { useSelectedDate } from "@/src/stores/selected-date-store";

export default function HabitsHomeScreen() {
  const { t, i18n } = useTranslation("habits");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: habits, isLoading: habitsLoading } = useHabits(userId);
  const sinceDate = localDateKey(addDays(new Date(), -30));
  const { data: logs } = useHabitLogs(userId, { sinceDate });
  // The 30-day window above drives the charts and recent activity; the header
  // subline needs lifetime history so a tick older than the window doesn't
  // read as "no ticks yet". Newest-first ordering makes row 0 the latest tick.
  const { data: latestLogs } = useHabitLogs(userId, { limit: 1 });
  const toggleLog = useToggleHabitLog(userId);

  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [learnIndex, setLearnIndex] = useState(0);

  const { selectedDate, isToday } = useSelectedDate();

  const allHabits = habits ?? [];
  const allLogs = logs ?? [];
  const todayStr = selectedDate;
  const today = parseLocalNoon(selectedDate);
  const dayLabel = new Intl.DateTimeFormat(i18n.language, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(today);

  const todayHabits = allHabits.filter((habit) => isScheduledOn(habit, today));
  const todayTicked = todayHabits.filter((habit) => isTickedOn(allLogs, habit.id, todayStr)).length;

  const identities = (() => {
    const seen = new Set<string>();
    for (const habit of allHabits) {
      const id = habit.identity.trim();
      if (id) seen.add(id);
    }
    return Array.from(seen);
  })();

  const missTwiceRiskHabits = todayHabits.filter((habit) =>
    isAtMissTwiceRisk(habit, allLogs, today),
  );

  const recentLogs = allLogs.slice(0, 5);
  const weeklyRhythm = getWeeklyRhythm(allLogs, 4, today);
  const identityRoundUp = getIdentityRoundUp(allHabits, allLogs, today);
  const twoMinuteAdoption = getTwoMinuteAdoption(allHabits);
  const lastTickedOn = latestLogs?.[0]?.loggedOn ?? null;
  // `loggedOn` IS the civil day - label from it directly instead of faking a
  // noon instant to reuse the activity formatter.
  const lastWhen = lastTickedOn ? formatRelativeDayKey(lastTickedOn, t) : null;
  // `latestLogs` is undefined while loading and after a failed fetch with no
  // cache - only an actually-loaded (possibly empty) history may claim "no
  // ticks yet", or a returning user's history reads as erased.
  const subline = lastWhen
    ? t("stats.last", { when: lastWhen })
    : latestLogs
      ? t("stats.never")
      : undefined;

  function handleToggle(habitId: string) {
    toggleLog.mutate({ habitId, loggedOn: todayStr });
  }

  const roomStyle = useRoomStyle("act");

  if (habitsLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background" style={roomStyle}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <>
      <HabitsOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <ScrollView contentContainerClassName="grow p-4">
          {/* The field + sheet escape the scroll padding so the green field runs
              edge to edge; the sheet re-adds the inset for its sections. */}
          <View className="-mx-4 -mt-4">
            <ModuleHomeHeader
              variant="field"
              addWidgetCategory="habits"
              title={t("home.title")}
              hue="act"
              icon="task-alt"
              moduleLabel={null}
              tourScope="habits"
              description={t("home.subtitle")}
              actions={[
                { type: "notifications", targetKey: "habits" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              meta={
                <ToolStats
                  tone="onField"
                  accentClassName="text-accent-ink"
                  items={[
                    { value: `${todayTicked}/${todayHabits.length}`, label: t("hero.today") },
                    { value: t("hero.habits", { count: allHabits.length }), label: "" },
                  ]}
                  subline={subline}
                  sublineTone={lastWhen ? "accent" : "muted"}
                />
              }
            />
            <ContentSheet className="px-4">
              <View className="gap-6">
                {identities.length > 0 ? (
                  <View className="rounded-2xl border border-border bg-muted p-4">
                    <Text className="text-sm">
                      {t("home.identityBannerPrefix")}{" "}
                      <Text className="font-semibold">
                        {identities[today.getDate() % identities.length]}
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
                  <View className="gap-2 rounded-2xl border border-border bg-muted p-4">
                    <Text className="font-semibold">{t("home.neverMissTwiceTitle")}</Text>
                    <Text variant="muted">{t("home.neverMissTwiceBody")}</Text>
                  </View>
                ) : null}

                <View className="gap-3">
                  <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {isToday ? t("home.todayHeading") : dayLabel}
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
                              {formatRelativeDayKey(log.loggedOn, t)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            </ContentSheet>
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
  const days = lastSevenDays();
  const chip = useHabitChipPalette()[habit.color];
  // Ticked is encoded by color alone on the week strip - no label, no glyph -
  // so the outline has to be the stop certified against the room (WCAG 1.4.11),
  // not the soft resting border. The tick box shares it for one silhouette.
  const tickedStyle = { backgroundColor: chip.fill, borderColor: chip.ink };

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
          aria-checked={tickedToday}
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={onToggle}
          className={cn(
            "size-10 items-center justify-center rounded-xl border",
            !tickedToday && "border-border bg-background",
          )}
          style={tickedToday ? tickedStyle : undefined}
          role="checkbox"
          {...spaceKeyActivationProps(onToggle)}
        >
          {tickedToday ? (
            <Icon name="check" className="size-5" style={{ color: chip.ink }} />
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
            const dayStr = localDateKey(day);
            const ticked = isTickedOn(logs, habit.id, dayStr);
            const scheduled = isScheduledOn(habit, day);
            return (
              <View
                key={dayStr}
                className={cn(
                  "h-6 flex-1 rounded-md border",
                  !ticked &&
                    (scheduled
                      ? "border-border bg-muted/40"
                      : "border-dashed border-border bg-background"),
                )}
                style={ticked ? tickedStyle : undefined}
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
            <BarChart
              bars={rhythm.map((bucket) => ({
                key: bucket.weekday,
                value: bucket.count,
                label: t(`insights.weekday.${bucket.weekday}` as const),
              }))}
              minBarHeight={6}
              zeroHeight={2}
              tintClass="bg-muted"
              barClassName="rounded-t-md"
              labelClassName="leading-3"
            />
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
                  className="h-full rounded-full bg-muted"
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
  const palette = useHabitChipPalette();
  const card = HABITS_LEARN_CARDS[learnIndex % HABITS_LEARN_CARDS.length];
  if (!card) return null;
  const chip = palette[card.tone];
  const cardKey = `learn.cards.${card.slug}` as const;

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("learn.sectionLabel")}
      </Text>
      <View className="relative">
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
            <View
              className="size-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: chip.fill }}
            >
              <Icon name={card.icon} className="size-5" style={{ color: chip.ink }} />
            </View>
            <View className="size-5" />
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
        <Pressable
          accessibilityLabel={t("learn.dismiss")}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onDismiss}
          className="absolute right-4 top-4"
        >
          <Icon name="arrow-forward" className="size-5 text-muted-foreground" />
        </Pressable>
      </View>
    </View>
  );
}

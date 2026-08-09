import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { BarChart } from "@/src/components/charts/bar-chart";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { Section } from "@/src/components/app/section";
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
import { HOME_COLUMN } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";
import { useSelectedDate } from "@/src/stores/selected-date-store";

export default function HabitsHomeScreen() {
  const { t } = useTranslation("habits");
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
  // The habit whose tick would delete a note along with it. Null the rest of
  // the time, which is the overwhelmingly common case (#759).
  const [untickTarget, setUntickTarget] = useState<Habit | null>(null);

  const { selectedDate } = useSelectedDate();

  const allHabits = habits ?? [];
  const allLogs = logs ?? [];
  /**
   * ⚠️ `undefined` is the window query still in flight, or failed with no
   * cache - NOT a user with no ticks. The two imply opposite actions.
   *
   * `toggleHabitLog` flips whatever the server finds, so a press made against
   * an unread cache is destructive in a way the screen cannot see: the row
   * renders unticked, the user presses it meaning "tick", and the server
   * deletes the tick that was already there - taking the note saved with it,
   * without the confirmation that exists precisely to prevent that. The habits
   * query gates the screen, but the logs query resolves separately, so this
   * window is reachable on any slow or failed load.
   */
  const logsLoaded = logs !== undefined;
  const todayStr = selectedDate;
  const today = parseLocalNoon(selectedDate);

  // Still scheduling-aware, because "2 of 3 due today" is a statement about
  // what was due. The LIST below deliberately is not (#759).
  const dueToday = allHabits.filter((habit) => isScheduledOn(habit, today));
  const dueTodayTicked = dueToday.filter((habit) => isTickedOn(allLogs, habit.id, todayStr)).length;

  const identities = (() => {
    const seen = new Set<string>();
    for (const habit of allHabits) {
      const id = habit.identity.trim();
      if (id) seen.add(id);
    }
    return Array.from(seen);
  })();

  // `isAtMissTwiceRisk` already returns false for a habit that wasn't due, so
  // this reads the whole list rather than a pre-filtered one.
  const missTwiceRiskHabits = allHabits.filter((habit) => isAtMissTwiceRisk(habit, allLogs, today));

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

  /**
   * Unticking a day that carries a note deletes the note with it, because they
   * are the same row in both directions - `upsertHabitLogNote` inserts, so
   * writing a note on an unticked day ticks it. So the destructive case asks
   * first, and the empty one - which is almost every one - does not.
   */
  function handleToggle(habit: Habit) {
    // Belt as well as braces: the control is disabled below, but a keyboard
    // activation racing the query landing would otherwise still get through.
    if (!logsLoaded) return;
    const existing = allLogs.find((log) => log.habitId === habit.id && log.loggedOn === todayStr);
    if (existing && existing.note.trim()) {
      setUntickTarget(habit);
      return;
    }
    toggleLog.mutate({ habitId: habit.id, loggedOn: todayStr });
  }

  function confirmUntick() {
    if (!untickTarget) return;
    toggleLog.mutate({ habitId: untickTarget.id, loggedOn: todayStr });
    setUntickTarget(null);
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
      <ConfirmDialog
        visible={untickTarget !== null}
        isPending={toggleLog.isPending}
        title={t("list.untickTitle")}
        message={t("list.untickBody")}
        confirmLabel={t("list.untickConfirm")}
        cancelLabel={t("cta.cancel")}
        onCancel={() => setUntickTarget(null)}
        onConfirm={confirmUntick}
      />
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <ScrollView contentContainerClassName="grow p-4">
          {/* No gap: `Section` carries its own py-6, and the hairline belongs
              between two sections' padding rather than across a flex gap. */}
          <View className={cn(HOME_COLUMN)}>
            <ModuleHomeHeader
              addWidgetCategory="habits"
              title={t("home.title")}
              tourScope="habits"
              description={t("home.subtitle")}
              actions={[
                { type: "notifications", targetKey: "habits" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              stats={[
                { value: `${dueTodayTicked}/${dueToday.length}`, label: t("hero.today") },
                { value: t("hero.habits", { count: allHabits.length }), label: "" },
                // The old ToolStats.subline, folded into the row as a value-less
                // item - which is how the design renders "last logged 4:50 pm".
                ...(subline ? [{ value: "", label: subline }] : []),
              ]}
            />

            <Section ruled={false} className="gap-3">
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
              {identities.length > 0 ? (
                <Text className="text-sm">
                  {t("home.identityBannerPrefix")}{" "}
                  <Text className="font-semibold">
                    {identities[today.getDate() % identities.length]}
                  </Text>
                </Text>
              ) : null}
            </Section>

            {missTwiceRiskHabits.length > 0 ? (
              <Section className="gap-1.5">
                <Text className="font-semibold">{t("home.neverMissTwiceTitle")}</Text>
                <Text variant="muted">{t("home.neverMissTwiceBody")}</Text>
              </Section>
            ) : null}

            {/*
              Every non-archived habit, every day (#759).

              The list used to filter to `isScheduledOn(habit, today)`, which
              dodged the not-due/not-done conflation by hiding rows - and cost
              far more than it saved: a weekdays-only user opening the tool on a
              Saturday met "No habits scheduled for today" and nothing else, so
              the whole sense that the tool contained anything vanished on their
              rest days. The conflation is answered on the cell instead, by a
              third state, rather than by deleting the row.
            */}
            <Section title={t("home.habitsHeading")}>
              {allHabits.length === 0 ? (
                <View className="gap-2">
                  <Text className="text-base font-semibold">{t("home.noHabitsTitle")}</Text>
                  <Text variant="muted">{t("home.noHabitsBody")}</Text>
                </View>
              ) : (
                <View>
                  {allHabits.map((habit, index) => (
                    <HabitRow
                      key={habit.id}
                      habit={habit}
                      logs={allLogs}
                      todayStr={todayStr}
                      today={today}
                      ruled={index > 0}
                      canTick={logsLoaded}
                      onToggle={() => handleToggle(habit)}
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
            </Section>

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

            <Section title={t("home.recentActivity")}>
              {recentLogs.length === 0 ? (
                <Text variant="muted">{t("home.recentEmpty")}</Text>
              ) : (
                <View>
                  {recentLogs.map((log, index) => {
                    const habit = allHabits.find((h) => h.id === log.habitId);
                    if (!habit) return null;
                    return (
                      <Pressable
                        key={log.id}
                        accessibilityLabel={t("list.openNamedDetail", { habit: habit.name })}
                        accessibilityRole="button"
                        onPress={() =>
                          router.push({
                            pathname: "/tools/habits/[id]",
                            params: { id: habit.id },
                          })
                        }
                        className={cn(
                          "flex-row items-center justify-between gap-3 py-3 active:opacity-70",
                          index > 0 && "border-t border-border",
                        )}
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
            </Section>
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
  today: Date;
  ruled: boolean;
  /** False until the logs window has answered - see `logsLoaded` on the screen. */
  canTick: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

function HabitRow({
  habit,
  logs,
  todayStr,
  today,
  ruled,
  canTick,
  onToggle,
  onOpen,
}: HabitRowProps) {
  const { t } = useTranslation("habits");
  const tickedToday = isTickedOn(logs, habit.id, todayStr);
  // Anchored on the day the tick control writes to, so the last cell is always
  // the one the ring marks and the checkbox acts on.
  const days = lastSevenDays(today);
  const chip = useHabitChipPalette()[habit.color];
  // Ticked is encoded by color alone on the week strip - no label, no glyph -
  // so the outline has to be the stop certified against the room (WCAG 1.4.11),
  // not the soft resting border. The tick box shares it for one silhouette.
  const tickedStyle = { backgroundColor: chip.fill, borderColor: chip.ink };
  const tickedDays = days.filter((day) => isTickedOn(logs, habit.id, localDateKey(day))).length;

  // Four habits used to announce identically, because the label named the
  // action and never the habit (#724). State still rides the checkbox role;
  // the name is what was missing.
  const tickLabel = tickedToday
    ? t("list.tickedToday", { habit: habit.name })
    : habit.kind === "break"
      ? t("list.tapToAvoid", { habit: habit.name })
      : t("list.tapToTick", { habit: habit.name });

  return (
    <View className={cn("gap-3 py-4", ruled && "border-t border-border")}>
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityLabel={tickLabel}
          aria-checked={tickedToday}
          // Ticking against an unread cache deletes rather than creates.
          disabled={!canTick}
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={onToggle}
          className={cn(
            "size-10 items-center justify-center rounded-xl border",
            !tickedToday && "border-border bg-background",
            !canTick && "opacity-50",
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
          accessibilityLabel={t("list.openNamedDetail", { habit: habit.name })}
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

      {/*
        One a11y node for the whole strip (#759). The seven cells are 41.7 ×
        26dp - under the touch floor on both axes - so they are display-only,
        and seven unlabelled decorative boxes are worse than useless to a
        screen reader. The summary below is the text equivalent.
      */}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t("list.weekA11y", { count: tickedDays })}
        className="gap-1.5"
      >
        <Text aria-hidden variant="muted" className="text-[10px] uppercase tracking-wider">
          {t("home.weekStripLabel")}
        </Text>
        <View
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          className="flex-row gap-1.5"
        >
          {days.map((day) => {
            const dayStr = localDateKey(day);
            const ticked = isTickedOn(logs, habit.id, dayStr);
            const scheduled = isScheduledOn(habit, day);
            const isToday = dayStr === todayStr;
            // Today's primary ring outranks the chip ink, so a ticked-today
            // cell takes only the fill and leaves the border to the class.
            return (
              <View
                key={dayStr}
                testID={`week-cell-${habit.id}-${dayStr}`}
                className={cn(
                  "h-6 flex-1 rounded-md border",
                  // Dashed vs solid is a non-colour distinction, so "never due"
                  // and "due and not done" stay apart in greyscale and under
                  // every CVD - which is what stops a blank cell reading as an
                  // accusation.
                  !ticked &&
                    (scheduled
                      ? "border-border bg-muted/40"
                      : "border-dashed border-border bg-background"),
                  isToday && "border-2 border-primary",
                )}
                style={
                  ticked ? (isToday ? { backgroundColor: chip.fill } : tickedStyle) : undefined
                }
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
    <Section title={t("insights.title")}>
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
              {/* The fill is the accent, not the wash. The sweep sent both the
                  track and the fill to `bg-muted`, which renders the bar as a
                  flat blank pill - the one case where a hue was carrying the
                  only difference between two adjacent surfaces. */}
              <View
                className="h-full rounded-full bg-primary"
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
    </Section>
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
    <Section
      title={t("learn.sectionLabel")}
      action={
        <Pressable
          accessibilityLabel={t("learn.dismiss")}
          accessibilityRole="button"
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={onDismiss}
          role="button"
        >
          <Icon name="arrow-forward" className="size-5 text-muted-foreground" />
        </Pressable>
      }
    >
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
        className="flex-row items-center gap-3 active:opacity-70"
        role="button"
      >
        <View
          className="size-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: chip.fill }}
        >
          <Icon name={card.icon} className="size-5" style={{ color: chip.ink }} />
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold">
            {t(`${cardKey}.title` as Parameters<typeof t>[0])}
          </Text>
          <Text variant="muted" className="text-sm">
            {t(`${cardKey}.short` as Parameters<typeof t>[0])}
          </Text>
        </View>
      </Pressable>
    </Section>
  );
}

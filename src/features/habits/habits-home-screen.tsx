import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { BarChart } from "@/src/components/charts/bar-chart";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { Disclosure } from "@/src/components/app/disclosure";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { Section } from "@/src/components/app/section";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { HabitsOnboarding } from "@/src/components/app/habits-onboarding-modal";
import { useHabitChipPalette } from "@/src/features/habits/habit-color";
import { getWeeklyRhythm, type WeekdayRhythm } from "@/src/features/habits/insights";
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

  // `includeArchived: true` so this is the SAME cache entry the history screen
  // reads (#762) - one fetch of one table, rather than two queries differing by
  // a flag. The archived habits are filtered out of the list below; they are
  // here because history needs them to name an old tick.
  const { data: habits, isLoading: habitsLoading } = useHabits(userId, { includeArchived: true });
  const sinceDate = localDateKey(addDays(new Date(), -30));
  const { data: logs } = useHabitLogs(userId, { sinceDate });
  /**
   * Lifetime, not the 30-day window: a user returning after a month must see
   * their last ticks here, not "Ticks you make will appear here" (#762).
   */
  const { data: recentLogs } = useHabitLogs(userId, { limit: 5 });
  const toggleLog = useToggleHabitLog(userId);
  const [forceOnboarding, setForceOnboarding] = useState(false);
  // The habit whose tick would delete a note along with it. Null the rest of
  // the time, which is the overwhelmingly common case (#759).
  const [untickTarget, setUntickTarget] = useState<Habit | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const { selectedDate } = useSelectedDate();

  // Archived habits ride the shared query but never the tick list: archiving is
  // how a user puts a habit down, and a put-down habit reappearing every day
  // would undo the gesture. They get a collapsed group of their own below
  // (#765), which is also the only way back to a habit that was archived
  // before it was ever ticked - history lists *logs*, so no logs meant no row
  // and no route at all (#723).
  const allHabits = (habits ?? []).filter((habit) => !habit.archivedAt);
  const archivedHabits = (habits ?? []).filter((habit) => habit.archivedAt);
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

  // `isAtMissTwiceRisk` already returns false for a habit that wasn't due, so
  // this reads the whole list rather than a pre-filtered one.
  const missTwiceRiskHabits = allHabits.filter((habit) => isAtMissTwiceRisk(habit, allLogs, today));

  const weeklyRhythm = getWeeklyRhythm(allLogs, 4, today);
  /**
   * The third header stat: ticks in the last two weeks, read straight off the
   * 30-day window. Gated on the window having actually answered - `undefined`
   * is a query in flight or failed, and rendering it as "0 ticks" would state
   * a record the screen has not read. Zero from a loaded window IS the record.
   */
  const twoWeeksAgoKey = localDateKey(addDays(today, -13));
  const twoWeekTicks = allLogs.filter((log) => log.loggedOn >= twoWeeksAgoKey).length;

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
  const palette = useHabitChipPalette();

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
                {
                  value: String(allHabits.length),
                  label: t("hero.habits", { count: allHabits.length }),
                },
                // Number in `value`, bare noun phrase in `label` (#749).
                ...(logsLoaded
                  ? [
                      {
                        value: String(twoWeekTicks),
                        label: t("hero.twoWeekTicks", { count: twoWeekTicks }),
                      },
                    ]
                  : []),
              ]}
            />

            <Section ruled={false} className="gap-3">
              {/* One CTA. The history button moved down to sit with the list it
                  opens (#762) - a door beside its own room rather than in the
                  hallway. */}
              <View className="flex-row flex-wrap gap-2">
                <Button onPress={() => router.push("/tools/habits/new")} className="self-start">
                  <Icon name="add" className="size-4 text-primary-foreground" />
                  <Text>{t("cta.newHabit")}</Text>
                </Button>
              </View>
              {/*
                The identity banner is gone (#765). It rotated one of the
                user's own identity strings into a standing headline by
                `today.getDate() % identities.length` - so the screen's most
                prominent sentence changed daily on a rule nobody could see,
                and named a habit the user might not have touched in weeks.
              */}
            </Section>

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
              {/*
                Never Miss Twice survives, as one conditional line rather than
                the two-line titled block it was (#765). Ambient copy cannot
                replace it: the line only appears when the condition holds, and
                that IS its meaning - a standing sentence saying the same thing
                every day would say nothing.

                It states the record and stops (#711). The old body read "Today
                is a great day to tick this once - one missed day is data, not
                failure", which both instructed the user and congratulated the
                product on not scolding them.
              */}
              {missTwiceRiskHabits.length > 0 ? (
                <Text variant="muted" className="text-[13px]">
                  {t("home.neverMissTwiceLine", { count: missTwiceRiskHabits.length })}
                </Text>
              ) : null}

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

              {/*
                Collapsed, and mounted only when open - `Disclosure` unmounts
                its children rather than hiding them, so a put-down habit stays
                out of the tab order until it is asked for.
              */}
              {archivedHabits.length > 0 ? (
                <Disclosure
                  label={t("home.archivedGroup", { count: archivedHabits.length })}
                  expanded={archivedOpen}
                  onToggle={() => setArchivedOpen((prev) => !prev)}
                  testID="habits-archived-group"
                >
                  <View>
                    {archivedHabits.map((habit, index) => (
                      <Pressable
                        key={habit.id}
                        accessibilityLabel={t("list.openNamedDetail", { habit: habit.name })}
                        accessibilityRole="button"
                        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                        onPress={() =>
                          router.push({
                            pathname: "/tools/habits/[id]",
                            params: { id: habit.id },
                          })
                        }
                        className={cn(
                          "flex-row items-center gap-3 py-3 active:opacity-70",
                          index > 0 && "border-t border-border",
                        )}
                        role="button"
                      >
                        {/* No tick control: a habit that has been put down is
                            reachable, not resumable in place. */}
                        <Text className="flex-1 text-sm font-semibold">{habit.name}</Text>
                        <Icon
                          aria-hidden
                          name="chevron-right"
                          className="size-5 text-muted-foreground"
                        />
                      </Pressable>
                    ))}
                  </View>
                </Disclosure>
              ) : null}
            </Section>

            {/* Learn's first real front door (#765). Both it and the onboarding
                route were orphaned - only `breadcrumbs.ts` named them, and the
                bad-slug fallback was the only path that reached the index at
                all. The rotating `LearnCard` it replaces occupied the overview
                to advertise a section nothing linked to. */}
            <Section>
              <Pressable
                accessibilityHint={t("learn.openHint")}
                accessibilityRole="button"
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={() => router.push("/tools/habits/learn")}
                className="flex-row items-center gap-4 active:opacity-70"
                role="button"
                testID="habits-learn-row"
              >
                {/* Decorative: the title beside it already names the destination. */}
                <Icon aria-hidden name="menu-book" className="size-5 text-primary" />
                <View className="flex-1 gap-0.5">
                  <Text className="text-[14.5px] font-semibold">{t("learn.sectionLabel")}</Text>
                  <Text variant="muted" className="text-[13px]">
                    {t("learn.frontDoorSubtitle")}
                  </Text>
                </View>
                <Icon aria-hidden name="chevron-right" className="size-5 text-muted-foreground" />
              </Pressable>
            </Section>

            {allHabits.length > 0 ? <WeeklyRhythmSection rhythm={weeklyRhythm} /> : null}

            {/* Five fixed rows and one link out, matching check-in's overview
                (#762). The link rides the section label rather than the CTA
                row, so it sits with the list it continues. */}
            <Section
              title={t("home.recentActivity")}
              action={
                <Pressable
                  accessibilityRole="link"
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => router.push("/tools/habits/history")}
                  className="flex-row items-center gap-1 active:opacity-70"
                  role="link"
                >
                  <Text className="text-[13px] font-semibold text-primary-ink">
                    {t("cta.viewHistory")}
                  </Text>
                  <Icon name="arrow-forward" className="size-3.5 text-primary-ink" />
                </Pressable>
              }
            >
              {(recentLogs ?? []).length === 0 ? (
                <Text variant="muted">{t("home.recentEmpty")}</Text>
              ) : (
                <View>
                  {(recentLogs ?? []).map((log, index) => {
                    // Archived habits ride the shared query, so an old tick can
                    // still name the habit it belongs to.
                    const habit = (habits ?? []).find((h) => h.id === log.habitId);
                    if (!habit) return null;
                    const chip = palette[habit.color];
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
                        {/* The habit's own colour, ringed in its ink so the
                            light hues stay perceivable against the surface
                            (WCAG 1.4.11) - the same dot the history rows draw. */}
                        <View
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full border"
                          style={{ backgroundColor: chip.accent, borderColor: chip.ink }}
                        />
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
    // Two lines at phone widths, one line from `sm` (#710): the design draws a
    // single row because it draws a 720px column, and only there is the width
    // real - at 360dp the strip would leave the name nothing.
    <View
      className={cn(
        "gap-3 py-4 sm:flex-row sm:items-center sm:gap-4",
        ruled && "border-t border-border",
      )}
    >
      <View className="flex-row items-center gap-3 sm:min-w-0 sm:flex-1">
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
        // The design's 218px right-hand column: seven cells at ~26dp. Fixed so
        // the strip reads as a calendar column across rows, not a flex share.
        className="gap-1.5 sm:w-[218px] sm:shrink-0"
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

/**
 * `getWeeklyRhythm` returns [Sun..Sat] because that is what `Date.getDay`
 * returns. The chart renders Monday-first, matching the habit detail grid
 * (#713) - a week that starts on Sunday puts the two rest days at opposite
 * ends of the row, so the shape of a weekday habit reads as two separate dips
 * rather than one weekend.
 */
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;

/**
 * The one insight habits ships (#712).
 *
 * There is no rate and no denominator anywhere in it, deliberately: a
 * denominator encodes what the user should have done, and this tool has no
 * standing to say that. Counts sit above their own bars instead.
 */
function WeeklyRhythmSection({ rhythm }: { rhythm: WeekdayRhythm[] }) {
  const { t } = useTranslation("habits");
  const byWeekday = new Map(rhythm.map((bucket) => [bucket.weekday, bucket.count]));
  const hasRhythm = rhythm.some((r) => r.count > 0);

  return (
    <Section title={t("insights.rhythmTitle")}>
      <Text variant="muted" className="text-xs">
        {t("insights.rhythmSubtitle")}
      </Text>
      {hasRhythm ? (
        <BarChart
          bars={MONDAY_FIRST.map((weekday) => {
            const count = byWeekday.get(weekday) ?? 0;
            const label = t(`insights.weekday.${weekday}` as const);
            return {
              key: weekday,
              value: count,
              topLabel: String(count),
              label,
              // Without this the count above and the weekday below arrive as
              // two unrelated strings with a decorative box between them, to be
              // paired by position (#737).
              accessibilityLabel: t("insights.rhythmBarA11y", { weekday: label, count }),
            };
          })}
          minBarHeight={6}
          zeroHeight={2}
          // NOT `bg-muted`, which measures 1.10:1 on card and 1.02:1 on
          // background - bars that are not low-contrast but invisible (#725).
          // `muted-foreground/80` clears 3:1 in both schemes (WCAG 1.4.11).
          // Single-tone:
          // the two-tone treatment keyed off an absolute `< 8` threshold, which
          // means nothing at one habit and nothing at ten.
          // bg-primary like every single-series bar chart (#725 family; folded in
          // by #878's alignment sweep - this bar shared sleep's neutral tint).
          tintClass="bg-primary"
          barClassName="rounded-t-md"
          labelClassName="leading-3"
        />
      ) : (
        <Text variant="muted" className="text-sm">
          {t("insights.rhythmEmpty")}
        </Text>
      )}
    </Section>
  );
}

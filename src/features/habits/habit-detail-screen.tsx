import { router } from "expo-router";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { DetailRow } from "@/src/components/app/detail-row";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { Section } from "@/src/components/app/section";
import { LoadingState } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/react-native-reusables/popover";
import { Text } from "@/src/components/react-native-reusables/text";
import { useHabitChipPalette } from "@/src/features/habits/habit-color";
import { formatHabitHistoryDay } from "@/src/features/habits/history-groups";
import {
  useArchiveHabit,
  useDeleteHabit,
  useHabit,
  useHabitLogs,
  useRestoreHabit,
  useToggleHabitLog,
} from "@/src/features/habits/queries";
import { isScheduledOn } from "@/src/features/habits/scheduling";
import {
  buildTickGrid,
  countTicksInWindow,
  TICK_GRID_WEEKS,
  type TickGridWeek,
} from "@/src/features/habits/tick-grid";
import type { Habit, HabitLog } from "@/src/features/habits/types";
import { DEFAULT_INTERACTIVE_HIT_SLOP, spaceKeyActivationProps } from "@/src/lib/accessibility";
import { FORM_COLUMN } from "@/src/lib/layout";
import { useSession } from "@/src/providers/session-provider";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { parseLocalNoon } from "@/src/utils/date";
import { cn } from "@/lib/utils";
import type { TriggerRef } from "@rn-primitives/popover";

interface HabitDetailScreenProps {
  habitId: string;
}

/**
 * Screen `9c` - the habit's own page (#761).
 *
 * Three things live here and nowhere else: the twelve-week record, the notes
 * the user wrote alongside their ticks, and the destructive actions. Schedule
 * and kind fold into the title's subline rather than taking a section each -
 * they are two words about the habit, not a report.
 */
export function HabitDetailScreen({ habitId }: HabitDetailScreenProps) {
  const pushWithOrigin = usePushWithOrigin();
  const { t, i18n } = useTranslation("habits");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { selectedDate: todayKey } = useSelectedDate();
  // The whole map rather than one habit's stops: the habit isn't loaded yet at
  // this point, and a hook may not sit below the not-found return.
  const palette = useHabitChipPalette();

  const { data: habit, isLoading } = useHabit(userId, habitId);

  // The grid decides the window, not the other way round: it opens on a Monday
  // so its rows are weekdays, and the query fetches exactly that span.
  const weeks = buildTickGrid(todayKey, TICK_GRID_WEEKS);
  const startKey = weeks[0].key;
  const { data: logs } = useHabitLogs(userId, { habitId, sinceDate: startKey });
  const toggleLog = useToggleHabitLog(userId);
  const archive = useArchiveHabit(userId);
  const restore = useRestoreHabit(userId);
  const deleteMutation = useDeleteHabit(userId);

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();
  // The day whose untick would take a note with it. Null the rest of the time.
  const [untickTarget, setUntickTarget] = useState<string | null>(null);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("home.title")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!habit) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("home.title")} />
            <Text variant="muted">{t("detail.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const allLogs = logs ?? [];
  /**
   * ⚠️ `undefined` is the query still in flight, or failed with no cache - NOT a
   * habit with no ticks. `toggleHabitLog` flips whatever the SERVER finds, so a
   * press made against an unread cache is destructive in a way the screen
   * cannot see: the cell renders empty, the user presses it meaning "tick", and
   * the server deletes the tick that was already there - taking the note saved
   * with it, past the confirmation that exists to prevent exactly that (#759).
   */
  const logsLoaded = logs !== undefined;
  const ticked = new Set(allLogs.filter((log) => log.habitId === habit.id).map((l) => l.loggedOn));
  const notes = allLogs
    .filter((log) => log.habitId === habit.id && log.note.trim().length > 0)
    .sort((a, b) => b.loggedOn.localeCompare(a.loggedOn));
  const tickCount = countTicksInWindow(allLogs, habit.id, startKey, todayKey);
  const tickedToday = ticked.has(todayKey);

  /**
   * Unticking a day that carries a note deletes the note with it, because they
   * are the same row in both directions - `upsertHabitLogNote` inserts, so
   * writing a note on an unticked day ticks it. The destructive case asks
   * first; the empty one - almost every one - does not (#710).
   */
  function handleToggleDay(dayKey: string) {
    if (!logsLoaded) return;
    const existing = allLogs.find((log) => log.habitId === habitId && log.loggedOn === dayKey);
    if (existing && existing.note.trim()) {
      setUntickTarget(dayKey);
      return;
    }
    toggleLog.mutate({ habitId, loggedOn: dayKey });
  }

  function confirmUntick() {
    if (!untickTarget) return;
    toggleLog.mutate({ habitId, loggedOn: untickTarget });
    setUntickTarget(null);
  }

  function openNote(dayKey: string) {
    pushWithOrigin({
      pathname: "/tools/habits/[id]/log",
      params: { id: habitId, date: dayKey },
    });
  }

  async function confirmArchive() {
    setActionError(undefined);
    try {
      if (habit?.archivedAt) {
        await restore.mutateAsync(habitId);
      } else {
        await archive.mutateAsync(habitId);
      }
      setArchiveOpen(false);
    } catch {
      // The thrown message is a backend/internal string, English for every user -
      // translated copy only (i18n rule, #1060). The mutation cache's global onError
      // already reports the failure to Sentry.
      // Not `errors.delete`: this catch covers archive and restore, neither deletes.
      setActionError(t("errors.update"));
    }
  }

  async function confirmDelete() {
    setActionError(undefined);
    try {
      await deleteMutation.mutateAsync(habitId);
      setDeleteOpen(false);
      router.replace("/tools/habits" as Parameters<typeof router.replace>[0]);
    } catch {
      // The thrown message is a backend/internal string, English for every user -
      // translated copy only (i18n rule, #1060). The mutation cache's global onError
      // already reports the failure to Sentry.
      setActionError(t("errors.delete"));
    }
  }

  const chip = palette[habit.color];

  const scheduleLabel =
    habit.cadence === "daily"
      ? t("detail.scheduleEveryDay")
      : habit.cadence === "weekdays"
        ? t("detail.scheduleWeekdays")
        : [...habit.customDays]
            .sort((a, b) => a - b)
            .map((d) => t(`insights.weekday.${d}` as const))
            .join(", ");
  const kindLabel = habit.kind === "break" ? t("detail.kindBreak") : t("detail.kindBuild");
  const started = t("detail.started", {
    date: new Intl.DateTimeFormat(i18n.language || undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(habit.createdAt)),
  });

  const isBreak = habit.kind === "break";
  /**
   * The design draws three labelled rows because its sample habit has filled
   * three prompts. Every row is conditional on its own body - a habit with a
   * name and nothing else shows no rows at all, rather than a column of empty
   * labels asking to be filled in.
   *
   * `stack_after` is conditional on being POPULATED, not on `kind` (#760): it
   * no longer has a field on create, so this row is where a stored value
   * surfaces - and a break habit holding one had nowhere at all to show it.
   */
  const rows: { key: string; label: string; body: string }[] = [
    { key: "identity", label: t("detail.identityLabel"), body: habit.identity },
    {
      key: "twoMinute",
      label: isBreak ? t("detail.strategyDifficult") : t("detail.strategyTwoMinute"),
      body: habit.twoMinuteVersion,
    },
    {
      key: "cue",
      label: isBreak ? t("detail.strategyInvisible") : t("detail.strategyCue"),
      body: habit.cuePlan,
    },
    { key: "stack", label: t("detail.strategyStack"), body: habit.stackAfter },
    {
      key: "pairing",
      label: isBreak ? t("detail.strategyUnattractive") : t("detail.strategyPairing"),
      body: habit.cravingPairing,
    },
    {
      key: "reward",
      label: isBreak ? t("detail.strategyUnsatisfying") : t("detail.strategyReward"),
      body: habit.rewardNote,
    },
  ].filter((row) => row.body.trim().length > 0);

  return (
    // The room wrapper carries the token re-pour so the top bar's `bg-card` and
    // the scroller's `bg-background` both re-resolve through it.
    <View testID="habit-detail-room" className="flex-1">
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        {/* The trail rides the bar, not the column: chrome for the screen
            rather than part of the document (#733). */}
        <ScreenTopBar leading="back" />

        <ScrollView contentContainerClassName="grow px-6 pt-8 pb-14">
          <View className={FORM_COLUMN}>
            {/* Stacked on a phone. The design draws one row because it draws a
                720px column; at 360dp the three controls take 197 of 312dp and
                leave the habit's name 99dp, which wraps "No phone at the table"
                onto four lines - and `bg`'s longer tick label makes it worse.
                Side by side from `sm`, where the width is actually there. */}
            <View className="gap-4 sm:flex-row sm:items-start">
              <View className="gap-1 sm:flex-1">
                <Text
                  role="heading"
                  aria-level={1}
                  className="font-display text-2xl font-bold tracking-tight"
                >
                  {habit.name}
                </Text>
                {/* Schedule, kind and start date are three short facts, not
                    three sections. The archived state joins them rather than
                    taking a banner. */}
                <View className="flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
                  {habit.archivedAt ? (
                    <View className="rounded-full bg-muted px-2 py-0.5">
                      <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("detail.archivedBadge")}
                      </Text>
                    </View>
                  ) : null}
                  <Text variant="muted" className="text-[13px]">
                    {scheduleLabel} · {kindLabel} · {started}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1 self-start">
                <TickTodayButton
                  chipFill={chip.fill}
                  chipInk={chip.ink}
                  disabled={!logsLoaded}
                  onPress={() => handleToggleDay(todayKey)}
                  ticked={tickedToday}
                />
                <Button
                  accessibilityLabel={t("cta.edit")}
                  onPress={() =>
                    pushWithOrigin({
                      pathname: "/tools/habits/[id]/edit",
                      params: { id: habit.id },
                    })
                  }
                  size="icon"
                  variant="outline"
                >
                  <Icon name="edit" className="size-[18px] text-muted-foreground" />
                </Button>
                <HabitOverflowMenu
                  archived={Boolean(habit.archivedAt)}
                  onArchive={() => setArchiveOpen(true)}
                  onDelete={() => setDeleteOpen(true)}
                />
              </View>
            </View>

            <Section
              title={t("detail.gridTitle")}
              action={
                <Text variant="muted" className="text-[13px]">
                  {t("detail.gridCount", { count: tickCount })}
                </Text>
              }
            >
              <TickGrid
                canTick={logsLoaded}
                chipFill={chip.fill}
                chipInk={chip.ink}
                habit={habit}
                onToggleDay={handleToggleDay}
                ticked={ticked}
                todayKey={todayKey}
                weeks={weeks}
              />
              {tickCount === 0 ? (
                <Text variant="muted" className="text-xs">
                  {t("detail.calendarEmpty")}
                </Text>
              ) : null}
            </Section>

            {rows.length > 0 ? (
              <View>
                {rows.map((row) => (
                  <DetailRow key={row.key} label={row.label}>
                    <Text className="text-sm leading-relaxed">{row.body.trim()}</Text>
                  </DetailRow>
                ))}
              </View>
            ) : null}

            {/* Note writing lives here rather than in the action row: a note
                belongs to a day, and this is the only section that lists days.
                Both doors push `[id]/log?date=` - ⚠️ NOT a sheet:
                `isDataEntryPath` suppresses RoutineFab on the `/log` suffix, so
                a sheet would put the FAB over its own Save footer (#90). */}
            <Section
              title={t("detail.notesTitle")}
              action={
                <Pressable
                  accessibilityRole="link"
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => openNote(todayKey)}
                  className="flex-row items-center gap-1 active:opacity-70"
                  role="link"
                >
                  <Icon name="add" className="size-3.5 text-primary-ink" />
                  <Text className="text-[13px] font-semibold text-primary-ink">
                    {t("cta.addNote")}
                  </Text>
                </Pressable>
              }
            >
              {notes.length === 0 ? (
                <Text variant="muted">{t("detail.notesEmpty")}</Text>
              ) : (
                <View>
                  {notes.map((note) => (
                    <NoteRow key={note.id} log={note} onPress={() => openNote(note.loggedOn)} />
                  ))}
                  {/* The rows are top-ruled, so the last needs a floor or the
                      column stops mid-air. */}
                  <View className="border-t border-border" />
                </View>
              )}
            </Section>
          </View>
        </ScrollView>
      </SafeAreaView>

      <ConfirmDialog
        cancelLabel={t("cta.cancel")}
        confirmLabel={t("list.untickConfirm")}
        isPending={toggleLog.isPending}
        message={t("list.untickBody")}
        onCancel={() => setUntickTarget(null)}
        onConfirm={confirmUntick}
        title={t("list.untickTitle")}
        visible={untickTarget !== null}
      />

      <ConfirmDialog
        cancelLabel={t("cta.cancel")}
        confirmLabel={habit.archivedAt ? t("cta.restore") : t("cta.archive")}
        destructive={false}
        error={actionError}
        isPending={archive.isPending || restore.isPending}
        message={t("detail.archiveConfirmBody")}
        onCancel={() => setArchiveOpen(false)}
        onConfirm={() => void confirmArchive()}
        title={t("detail.archiveConfirmTitle")}
        visible={archiveOpen}
      />

      <ConfirmDialog
        cancelLabel={t("cta.cancel")}
        confirmLabel={t("cta.delete")}
        error={actionError}
        isPending={deleteMutation.isPending}
        message={t("cta.deleteConfirm")}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
        title={t("detail.deleteConfirmTitle")}
        visible={deleteOpen}
      />
    </View>
  );
}

interface TickTodayButtonProps {
  chipFill: string;
  chipInk: string;
  disabled: boolean;
  ticked: boolean;
  onPress: () => void;
}

/**
 * Today's tick, at full size.
 *
 * The grid's cells clear WCAG 2.5.8 through its spacing exception rather than
 * by being 24dp, so the one action a user repeats daily also gets a real
 * target. Its accessible name is its visible label - there is exactly one
 * habit on this screen, named in the heading directly beside it, so the
 * disambiguation #724 needed on a list of four rows would only add noise here.
 */
function TickTodayButton({ chipFill, chipInk, disabled, ticked, onPress }: TickTodayButtonProps) {
  const { t } = useTranslation("habits");
  // The ticked state names the undo action in its label (#932): un-ticking
  // existed (this button, today's grid cell, the home-row checkbox) but nothing
  // visible said so - "Ticked today" read as a status, not a pressable toggle.
  const label = ticked ? t("detail.tickedTodayUndo") : t("detail.tickToday");

  return (
    <Pressable
      aria-checked={ticked}
      disabled={disabled}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className={cn(
        "h-9 flex-row items-center gap-1.5 rounded-lg border px-3 active:opacity-70",
        !ticked && "border-border",
        disabled && "opacity-50",
      )}
      style={ticked ? { backgroundColor: chipFill, borderColor: chipInk } : undefined}
      role="checkbox"
      {...spaceKeyActivationProps(onPress)}
    >
      <Icon
        name="check"
        className={cn("size-[17px]", !ticked && "text-muted-foreground")}
        style={ticked ? { color: chipInk } : undefined}
      />
      <Text className="text-[13px] font-semibold" style={ticked ? { color: chipInk } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

interface HabitOverflowMenuProps {
  archived: boolean;
  onArchive: () => void;
  onDelete: () => void;
}

/**
 * Archive/Restore and Delete, behind `more_horiz` (#709).
 *
 * They were four buttons in a wrapping row, which gave a destructive action the
 * same weight as opening the editor. Behind the overflow they are still one tap
 * from anywhere on the screen and no longer compete with the tick.
 */
function HabitOverflowMenu({ archived, onArchive, onDelete }: HabitOverflowMenuProps) {
  const { t } = useTranslation("habits");
  const triggerRef = useRef<TriggerRef>(null);

  function run(action: () => void) {
    // The confirm dialog is a sibling of the popover, so the menu has to close
    // before it opens or the two overlays stack.
    triggerRef.current?.close();
    action();
  }

  return (
    <Popover>
      <PopoverTrigger asChild ref={triggerRef}>
        <Button accessibilityLabel={t("detail.moreActions")} size="icon" variant="ghost">
          <Icon name="more-horiz" className="size-[18px] text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-56 p-1.5">
        <Pressable
          accessibilityRole="button"
          className="flex-row items-center gap-3 rounded-sm px-2 py-2.5 active:bg-accent"
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={() => run(onArchive)}
          role="button"
        >
          <Icon name={archived ? "unarchive" : "archive"} className="size-4 text-foreground" />
          <Text className="text-sm">{archived ? t("cta.restore") : t("cta.archive")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          className="flex-row items-center gap-3 rounded-sm px-2 py-2.5 active:bg-accent"
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={() => run(onDelete)}
          role="button"
        >
          <Icon name="delete-outline" className="size-4 text-destructive" />
          <Text className="text-sm text-destructive">{t("cta.delete")}</Text>
        </Pressable>
      </PopoverContent>
    </Popover>
  );
}

interface TickGridProps {
  canTick: boolean;
  chipFill: string;
  chipInk: string;
  habit: Habit;
  onToggleDay: (dayKey: string) => void;
  ticked: Set<string>;
  todayKey: string;
  weeks: TickGridWeek[];
}

/**
 * Twelve weeks as columns, weekdays as rows (#761, decided on #713).
 *
 * ⚠️ This is a new component, not a re-parameterised `CalendarStrip`. That was
 * a width-dependent `flex-wrap` holding 84 cells: at 360dp the arithmetic
 * happened to give twelve per row, so it LOOKED like this grid while its
 * columns meant nothing and reflowed on any other width.
 *
 * 16dp cells at 8dp gaps - a 24dp pitch, which clears WCAG 2.5.8's spacing
 * exception. The design's 5dp gives 21dp and fails it, so under the design's
 * own measurements the cells could not have stayed controls at all. `hitSlop`
 * is deliberately not used to paper over a smaller gap: adjacent cells' slop
 * would overlap, which is precisely what the exception measures.
 */
function TickGrid({
  canTick,
  chipFill,
  chipInk,
  habit,
  onToggleDay,
  ticked,
  todayKey,
  weeks,
}: TickGridProps) {
  const { i18n } = useTranslation("habits");
  // Screen readers were hearing the raw day key ("2026-07-29"); announce a
  // human date instead. Habit days are viewer-local civil dates by design
  // (`logged_on` stores the resolved date), so formatting the day directly is
  // the correct frame here.
  const dayLabelFormat = new Intl.DateTimeFormat(i18n.language || undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  // One letter, on alternating rows. `narrow` rather than a new key set: it is
  // exactly what the locale data calls this, and slicing a 3-letter label would
  // guess at where a Cyrillic abbreviation starts. ⚠️ `bg`'s single letters
  // collide (понеделник/петък both П) - tolerable at four positionally-fixed
  // labels, and the alternative is losing a week of history to a 20dp rail.
  const narrowWeekday = new Intl.DateTimeFormat(i18n.language || undefined, { weekday: "narrow" });

  return (
    <View className="flex-row gap-2.5">
      <View
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        className="w-3 shrink-0 gap-2"
      >
        {weeks[0].days.map((day, row) => (
          <View key={day.key} className="h-4 justify-center">
            <Text className="text-right text-[9px] font-semibold leading-none text-muted-foreground">
              {row % 2 === 0 ? narrowWeekday.format(day.date).toUpperCase() : ""}
            </Text>
          </View>
        ))}
      </View>
      {/* One View per WEEK, so DOM order runs Monday-to-Sunday of one week
          before moving to the next. Row-major would announce every Monday for
          twelve weeks, then every Tuesday. */}
      <View className="flex-row gap-2">
        {weeks.map((week) => (
          <View key={week.key} className="gap-2">
            {week.days.map((day) => {
              if (day.isFuture) {
                // Nothing rendered - an empty slot, not a faint or disabled
                // cell the user could read as a day they missed.
                return (
                  <View
                    key={day.key}
                    aria-hidden
                    importantForAccessibility="no-hide-descendants"
                    className="size-4"
                  />
                );
              }
              const isTicked = ticked.has(day.key);
              const scheduled = isScheduledOn(habit, parseLocalNoon(day.key));
              const isToday = day.key === todayKey;
              // A ticked cell carries no label or glyph, so its outline is the
              // chip ink - the stop certified against the room surface (WCAG
              // 1.4.11). Today's primary ring outranks it, so a ticked-today
              // cell takes only the fill and leaves the border to the class.
              return (
                <Pressable
                  key={day.key}
                  accessibilityLabel={dayLabelFormat.format(day.date)}
                  accessibilityRole="checkbox"
                  aria-checked={isTicked}
                  disabled={!canTick}
                  onPress={() => onToggleDay(day.key)}
                  className={cn(
                    "size-4 rounded-sm border",
                    // Dashed vs solid is a non-colour distinction, so "never
                    // due" and "due and not done" stay apart in greyscale and
                    // under every CVD - which is what stops a blank cell
                    // reading as an accusation.
                    !isTicked &&
                      (scheduled ? "border-border bg-muted" : "border-dashed border-border"),
                    isToday && "border-2 border-primary",
                    !canTick && "opacity-50",
                  )}
                  style={
                    isTicked
                      ? {
                          backgroundColor: chipFill,
                          ...(isToday ? null : { borderColor: chipInk }),
                        }
                      : undefined
                  }
                  role="checkbox"
                  {...spaceKeyActivationProps(() => onToggleDay(day.key))}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * One note the user wrote with a tick. Tapping it reopens that day's editor.
 *
 * The date column survives here, unlike on the history screen (#762): these
 * rows are one per DAY rather than grouped under a day heading, so the column
 * is the only thing saying which day each note belongs to.
 */
function NoteRow({ log, onPress }: { log: HabitLog; onPress: () => void }) {
  const { t, i18n } = useTranslation("habits");
  return (
    <Pressable
      accessibilityLabel={t("detail.editNote", {
        date: formatHabitHistoryDay(log.loggedOn, t, i18n.language),
      })}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className="flex-row gap-4 border-t border-border py-3.5 active:opacity-70"
      role="button"
    >
      {/* Translated, never the raw `2026-08-08` key this used to print in both
          locales (#726). */}
      <Text variant="muted" className="w-[84px] shrink-0 pt-0.5 text-xs">
        {formatHabitHistoryDay(log.loggedOn, t, i18n.language)}
      </Text>
      <Text className="flex-1 text-sm leading-relaxed">{log.note}</Text>
    </Pressable>
  );
}

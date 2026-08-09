import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { LoadingState } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useHabitChipPalette } from "@/src/features/habits/habit-color";
import {
  useArchiveHabit,
  useDeleteHabit,
  useHabit,
  useHabitLogs,
  useRestoreHabit,
  useToggleHabitLog,
} from "@/src/features/habits/queries";
import { addDays, isScheduledOn, isTickedOn, localDateKey } from "@/src/features/habits/scheduling";
import type { Habit, HabitLog } from "@/src/features/habits/types";
import { spaceKeyActivationProps } from "@/src/lib/accessibility";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";
import { cn } from "@/lib/utils";

const CALENDAR_WEEKS = 12;

interface HabitDetailScreenProps {
  habitId: string;
}

export function HabitDetailScreen({ habitId }: HabitDetailScreenProps) {
  const { t } = useTranslation("habits");
  const roomStyle = useRoomStyle("act");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: habit, isLoading } = useHabit(userId, habitId);
  const sinceDate = localDateKey(addDays(new Date(), -CALENDAR_WEEKS * 7 + 1));
  const { data: logs } = useHabitLogs(userId, { habitId, sinceDate });
  const toggleLog = useToggleHabitLog(userId);
  const archive = useArchiveHabit(userId);
  const restore = useRestoreHabit(userId);
  const deleteMutation = useDeleteHabit(userId);

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={roomStyle}>
        <View className="flex-1 justify-center">
          <LoadingState title={t("home.title")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!habit) {
    return (
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("home.title")} />
            <Text variant="muted">{t("detail.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  function handleToggleDay(dayStr: string) {
    toggleLog.mutate({ habitId, loggedOn: dayStr });
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
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("errors.delete"));
    }
  }

  async function confirmDelete() {
    setActionError(undefined);
    try {
      await deleteMutation.mutateAsync(habitId);
      setDeleteOpen(false);
      router.replace("/tools/habits" as Parameters<typeof router.replace>[0]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("errors.delete"));
    }
  }

  return (
    <>
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <ScrollView contentContainerClassName="grow gap-6 p-6">
          <View className="gap-2">
            <ScreenHeader
              title={habit.name}
              right={
                habit.archivedAt ? (
                  <View className="rounded-full bg-muted px-2 py-0.5">
                    <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("detail.archivedBadge")}
                    </Text>
                  </View>
                ) : null
              }
            />
            {habit.identity ? <Text variant="muted">{habit.identity}</Text> : null}
          </View>

          <View className="flex-row flex-wrap gap-2">
            <Button
              onPress={() =>
                router.push({
                  pathname: "/tools/habits/[id]/edit",
                  params: { id: habit.id },
                })
              }
              variant="outline"
            >
              <Icon name="edit" className="size-4" />
              <Text>{t("cta.edit")}</Text>
            </Button>
            <Button
              onPress={() =>
                router.push({
                  pathname: "/tools/habits/[id]/log",
                  params: { id: habit.id },
                })
              }
              variant="outline"
            >
              <Icon name="edit-note" className="size-4" />
              <Text>{t("cta.addNote")}</Text>
            </Button>
            <Button onPress={() => setArchiveOpen(true)} variant="ghost">
              <Icon name={habit.archivedAt ? "unarchive" : "archive"} className="size-4" />
              <Text>{habit.archivedAt ? t("cta.restore") : t("cta.archive")}</Text>
            </Button>
            <Button onPress={() => setDeleteOpen(true)} variant="ghost">
              <Icon name="delete-outline" className="size-4 text-destructive" />
              <Text className="text-destructive">{t("cta.delete")}</Text>
            </Button>
          </View>

          <CalendarStrip
            habit={habit}
            logs={logs ?? []}
            onToggleDay={handleToggleDay}
            weeks={CALENDAR_WEEKS}
          />

          <ScheduleKindCard habit={habit} />

          <StrategiesCard habit={habit} />

          <RecentNotesSection logs={logs ?? []} />
        </ScrollView>
      </SafeAreaView>

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
    </>
  );
}

interface CalendarStripProps {
  habit: Habit;
  logs: HabitLog[];
  weeks: number;
  onToggleDay: (dayStr: string) => void;
}

function CalendarStrip({ habit, logs, weeks, onToggleDay }: CalendarStripProps) {
  const { t, i18n } = useTranslation("habits");
  // Screen readers were hearing the raw day key ("2026-07-29"); announce a
  // human date instead. Habit days are viewer-local civil dates by design
  // (logged_on stores the resolved date), so formatting `day` directly is the
  // correct frame here.
  const dayLabelFormat = new Intl.DateTimeFormat(i18n.language || undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const totalDays = weeks * 7;
  const today = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const days = (() => {
    const arr: Date[] = [];
    for (let i = totalDays - 1; i >= 0; i -= 1) {
      arr.push(addDays(today, -i));
    }
    return arr;
  })();

  const chip = useHabitChipPalette()[habit.color];
  const todayStr = localDateKey(today);

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("detail.calendarTitle")}
      </Text>
      <View className="gap-1.5 rounded-2xl border border-border bg-card p-3">
        <View className="flex-row flex-wrap gap-1">
          {days.map((day) => {
            const dayStr = localDateKey(day);
            const ticked = isTickedOn(logs, habit.id, dayStr);
            const scheduled = isScheduledOn(habit, day);
            const isToday = dayStr === todayStr;
            const isFuture = day.getTime() > today.getTime();
            // A ticked cell carries no label or glyph, so its outline is the
            // chip ink - the stop certified against the room surface (WCAG
            // 1.4.11). Today's primary ring outranks it, so a ticked-today cell
            // takes only the fill and leaves the border to the class below.
            const tickedStyle = ticked
              ? { backgroundColor: chip.fill, ...(isToday ? null : { borderColor: chip.ink }) }
              : undefined;
            return (
              <Pressable
                key={dayStr}
                accessibilityLabel={dayLabelFormat.format(day)}
                accessibilityRole="checkbox"
                aria-checked={ticked}
                disabled={isFuture}
                hitSlop={2}
                onPress={() => onToggleDay(dayStr)}
                className={cn(
                  "h-5 w-5 rounded-sm border",
                  !ticked &&
                    (scheduled
                      ? "border-border bg-muted/40"
                      : "border-dashed border-border bg-background"),
                  isToday && "border-2 border-primary",
                )}
                style={tickedStyle}
                role="checkbox"
                {...spaceKeyActivationProps(() => onToggleDay(dayStr))}
              />
            );
          })}
        </View>
        {logs.length === 0 ? (
          <Text variant="muted" className="text-xs">
            {t("detail.calendarEmpty")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function StrategiesCard({ habit }: { habit: Habit }) {
  const { t } = useTranslation("habits");
  const isBreak = habit.kind === "break";
  const rows = [
    {
      icon: "visibility-off",
      title: isBreak ? t("detail.strategyInvisible") : t("detail.strategyCue"),
      body: habit.cuePlan,
    },
    // Conditional on being POPULATED, not on `kind` (#760). `stack_after` no
    // longer has a field on create, so the row exists to show a value the habit
    // already carries - and a break habit that somehow holds one was previously
    // the one case where stored text had nowhere at all to surface.
    { icon: "link", title: t("detail.strategyStack"), body: habit.stackAfter },
    {
      icon: isBreak ? "block" : "bolt",
      title: isBreak ? t("detail.strategyDifficult") : t("detail.strategyTwoMinute"),
      body: habit.twoMinuteVersion,
    },
    {
      icon: "favorite-border",
      title: isBreak ? t("detail.strategyUnattractive") : t("detail.strategyPairing"),
      body: habit.cravingPairing,
    },
    {
      icon: isBreak ? "report-problem" : "emoji-events",
      title: isBreak ? t("detail.strategyUnsatisfying") : t("detail.strategyReward"),
      body: habit.rewardNote,
    },
  ];

  // Every row is now conditional on its own body, so there is no kind-shaped
  // hole in the array to filter out first.
  const populated = rows.filter((row) => row.body.trim().length > 0);
  if (populated.length === 0) return null;

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("detail.strategiesTitle")}
      </Text>
      <View className="gap-2 rounded-2xl border border-border bg-card p-4">
        {populated.map((row) => (
          <View key={row.title} className="flex-row items-start gap-3">
            <View className="size-8 items-center justify-center rounded-lg bg-muted">
              <Icon name={row.icon as never} className="size-4 text-muted-foreground" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {row.title}
              </Text>
              <Text>{row.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ScheduleKindCard({ habit }: { habit: Habit }) {
  const { t } = useTranslation("habits");
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

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("detail.detailsTitle")}
      </Text>
      <View className="gap-3 rounded-2xl border border-border bg-card p-4">
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="muted" className="text-sm">
            {t("detail.scheduleTitle")}
          </Text>
          <Text className="text-sm font-semibold">{scheduleLabel}</Text>
        </View>
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="muted" className="text-sm">
            {t("detail.kindTitle")}
          </Text>
          <Text className="text-sm font-semibold">{kindLabel}</Text>
        </View>
      </View>
    </View>
  );
}

function RecentNotesSection({ logs }: { logs: HabitLog[] }) {
  const { t } = useTranslation("habits");
  const noted = logs.filter((log) => log.note.trim().length > 0).slice(0, 8);
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("detail.notesTitle")}
      </Text>
      {noted.length === 0 ? (
        <Text variant="muted">{t("detail.notesEmpty")}</Text>
      ) : (
        <View className="gap-2">
          {noted.map((log) => (
            <View key={log.id} className="gap-1 rounded-2xl border border-border bg-card p-3">
              <Text variant="muted" className="text-xs">
                {log.loggedOn}
              </Text>
              <Text>{log.note}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

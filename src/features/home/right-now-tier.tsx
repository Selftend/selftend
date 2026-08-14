import { router } from "expo-router";
import { Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { MoodScale } from "@/src/components/app/mood-scale";
import { Text } from "@/src/components/react-native-reusables/text";
import { CHROME_MARK } from "@/src/lib/theme/chrome";
import { formatHours } from "@/src/features/sleep/format";
import { metaForWidget } from "@/src/features/home/widget-registry";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useSleepStats, useSleepLogs } from "@/src/features/sleep/queries";
import { useHabits, useHabitLogs } from "@/src/features/habits/queries";
import { isScheduledOn, isTickedOn } from "@/src/features/habits/scheduling";
import { addDaysToKey, parseLocalNoon } from "@/src/utils/date";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { seedMoodScore } from "@/src/stores/mood-seed-store";
import { cn } from "@/lib/utils";

/**
 * Home's `Right now` tier (#978, implementing #952's resolution).
 *
 * ## The three rules this surface is held to
 *
 * 1. **Eligibility is derived, never stored.** A nudge exists only for a tool already on
 *    your dashboard, so dashboard membership IS the opt-in and removing the tool IS the
 *    dismissal. That is why there is **no off switch and no `user_preferences` flag** —
 *    recorded here as a finding rather than an omission, so nobody assumes it went
 *    unasked. It also keeps this tier at **zero rows** in `widget_preferences`, which is
 *    what makes it absent from arrange mode without a special case.
 * 2. **A nudge vanishes when satisfied.** Cap two, **fixed order sleep → habits**. A tier
 *    that reorders by recency is a slot machine.
 * 3. **Copy bar: state the record and open a door.** Never name what is owed, never count
 *    what was missed, never imply lateness.
 *
 * ☠️ The drawn "Two habits due" fails rule 3 twice — it counts obligations, and *due*
 * means owed. The habit names carry the same information and assert nothing.
 *
 * ☠️ The drawn sleep line said "Sleep from last night". #800/ADR-0002 deliberately never
 * invented a night identity — a windowed entry keys to its sleep-START day and a
 * duration-only entry to its logging day — so "last night" asserts a boundary the schema
 * refuses to draw, and a 23:00 entry makes it visibly wrong. The predicate is "nothing
 * captured since yesterday" over `entryDay`.
 *
 * The whole tier collapses, heading included, when the card and both nudges are empty.
 */

/** A nudge: a link that states a fact. `bg-card` + `border-border` — it does not lift. */
function Nudge({
  testID,
  icon,
  title,
  subtitle,
  route,
}: {
  testID: string;
  icon: MaterialIconName;
  title: string;
  subtitle: string;
  route: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      testID={testID}
      onPress={() => router.push(route as Parameters<typeof router.push>[0])}
      className={cn(
        "flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 active:bg-accent/50",
        Platform.select({ web: "hover:bg-accent/30" }),
      )}
    >
      <Icon name={icon} className={cn("size-5 shrink-0", CHROME_MARK)} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[15px] font-semibold">{title}</Text>
        <Text variant="muted" className="text-[13px]" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Icon
        name="chevron-right"
        accessibilityElementsHidden
        importantForAccessibility="no"
        className={cn("size-5 shrink-0", CHROME_MARK)}
      />
    </Pressable>
  );
}

export function RightNowTier({
  userId,
  widgetIds,
}: {
  userId: string | null;
  /** The user's owned ids. Membership here is what makes a nudge eligible. */
  widgetIds: string[];
}) {
  const { t, i18n } = useTranslation("navigation");
  const { selectedDate } = useSelectedDate();
  const owns = (id: string) => widgetIds.includes(id);

  // --- the mood card ------------------------------------------------------
  // Hides once today holds a check-in, so "Not logged yet" is its only state and the
  // string can go. Cost accepted (#952): a second check-in that day goes via the row.
  const { data: moodLogs } = useMoodLogs(owns("mood-checkin") ? userId : null, 30);
  const loggedToday = (moodLogs ?? []).some((log) => log.dayKey === selectedDate);
  const showMood = owns("mood-checkin") && moodLogs !== undefined && !loggedToday;

  // --- the sleep nudge ----------------------------------------------------
  const sleepEnabled = owns("sleep-latest");
  const { data: sleepLogs } = useSleepLogs(sleepEnabled ? userId : null, 30);
  const { data: sleepStats } = useSleepStats(sleepEnabled ? userId : null);
  const yesterday = addDaysToKey(selectedDate, -1);
  // `entryDay` is the resolved civil day the entry belongs to, which is the only day
  // boundary this schema actually draws.
  const capturedSinceYesterday = (sleepLogs ?? []).some((log) => log.entryDay >= yesterday);
  const sevenDayMinutes = sleepStats?.sevenDayDurationMinutes ?? null;
  const showSleep =
    sleepEnabled && sleepLogs !== undefined && sleepStats !== undefined && !capturedSinceYesterday;

  // --- the habits nudge ---------------------------------------------------
  const habitsEnabled = owns("habits-today");
  const { data: habits } = useHabits(habitsEnabled ? userId : null, { includeArchived: true });
  // The 30-day window is derived from `selectedDate` rather than a fresh `new Date()`:
  // both resolve to the same civil-day string (so the habits screen's cache entry is
  // still shared), but a clock read during render is impure and the React Compiler
  // rejects it outright inside a `useMemo`.
  const { data: habitLogs } = useHabitLogs(habitsEnabled ? userId : null, {
    sinceDate: addDaysToKey(selectedDate, -30),
  });
  const openHabits = (habits ?? [])
    .filter((habit) => !habit.archivedAt)
    .filter((habit) => isScheduledOn(habit, parseLocalNoon(selectedDate)))
    .filter((habit) => !isTickedOn(habitLogs ?? [], habit.id, selectedDate));
  const showHabits =
    habitsEnabled && habits !== undefined && habitLogs !== undefined && openHabits.length > 0;

  // Rule 2: cap two, fixed order sleep → habits. Not a sort — a literal sequence.
  if (!showMood && !showSleep && !showHabits) return null;

  return (
    <View className="gap-2" testID="right-now-tier">
      <Text variant="h2" className="text-xl font-bold tracking-tight">
        {t("home.rightNow.heading")}
      </Text>

      {showMood ? (
        // The tier's one CONTROL, so it is the only thing here that lifts; the nudges
        // are links. A tap seeds an in-memory store and navigates - it never writes.
        <View
          testID="right-now-mood"
          className="gap-2.5 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3.5"
        >
          <Text className="text-[15px] font-semibold">{t("home.rightNow.moodTitle")}</Text>
          <MoodScale
            compact
            value={null}
            onChange={(score) => {
              seedMoodScore(score);
              router.push("/tools/check-in/new");
            }}
          />
        </View>
      ) : null}

      {showSleep ? (
        <Nudge
          testID="right-now-sleep"
          icon="bedtime"
          title={t("home.rightNow.sleepTitle")}
          // One key for the whole sentence, not two joined in code: the separator and
          // the clause order are the translator's to choose, and an em-dash hardcoded
          // here is a punctuation decision made in English on every locale's behalf.
          subtitle={
            sevenDayMinutes === null
              ? t("home.rightNow.sleepNothing")
              : t("home.rightNow.sleepNothingWithAverage", {
                  value: formatHours(sevenDayMinutes, i18n.language, t),
                })
          }
          route={metaForWidget("sleep-latest")?.route ?? "/tools/sleep"}
        />
      ) : null}

      {showHabits ? (
        <Nudge
          testID="right-now-habits"
          icon="checklist"
          title={t("home.rightNow.habitsTitle")}
          // The names, never a count: "Two habits due" counts obligations and calls them
          // owed. A list of what you chose to do asserts nothing about you.
          subtitle={openHabits.map((habit) => habit.name).join(" · ")}
          route={metaForWidget("habits-today")?.route ?? "/tools/habits"}
        />
      ) : null}
    </View>
  );
}

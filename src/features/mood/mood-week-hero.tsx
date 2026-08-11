import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { MOOD_EMOJI_BY_SCORE } from "@/src/components/app/mood-scale";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { MoodHistoryRow } from "@/src/features/mood/mood-history-row";
import { ShowAllHistoryLink } from "@/src/features/mood/show-all-history-link";
import { useEmotionDisplay } from "@/src/features/mood/use-emotion-display";
import {
  logsOnDay,
  type EmotionCount,
  type WeekDay,
  type WeekDelta,
  type WeekWindow,
} from "@/src/features/mood/week-window";
import type { MoodLog } from "@/src/features/mood/types";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { parseLocalNoon } from "@/src/utils/date";

interface WeekHeroProps {
  window: WeekWindow;
  days: WeekDay[];
  delta: WeekDelta;
  topEmotions: EmotionCount[];
  /** The fetched fourteen-day span; the day panel is a filter over it, not a new fetch. */
  logs: MoodLog[] | undefined;
  /**
   * True when the section header row could not fit the history link (#697's
   * 360dp bg measurement) and this block must carry it on a line of its own.
   * A prop rather than a hidden clone, so the link never exists twice in the
   * accessibility tree.
   */
  showHistoryLink?: boolean;
}

/**
 * The displayed week's name: "This week" for the current one, otherwise its span.
 *
 * A date span rather than "2 weeks ago" — counting backwards makes the reader do
 * the arithmetic, and the span is what the mood map underneath is labelled with.
 */
export function formatWeekLabel(window: WeekWindow, t: TFunction, language: string): string {
  if (window.isCurrentWeek) return t("week.title");
  const fmt = new Intl.DateTimeFormat(language, { day: "numeric", month: "short" });
  return `${fmt.format(parseLocalNoon(window.startKey))} – ${fmt.format(parseLocalNoon(window.endKey))}`;
}

interface WeekNavigatorProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

/**
 * The two chevrons, sized to sit in `Section`'s trailing action slot.
 *
 * They live there rather than on a row of their own because the design's fixed
 * 148px label does not survive a phone: chevron + label + chevron + a history
 * link overruns 328dp in Bulgarian. `Section` already owns a label row with a
 * trailing control, so the week label becomes that section's heading and the
 * chevrons its action — one label, not two, and `Show all history` drops to its
 * own line under the strip (#697).
 */
export function WeekNavigator({ canGoBack, canGoForward, onPrevious, onNext }: WeekNavigatorProps) {
  const { t } = useTranslation("mood");

  return (
    <View className="flex-row items-center gap-1">
      <NavButton
        disabled={!canGoBack}
        icon="chevron-left"
        label={t("week.previousWeek")}
        onPress={onPrevious}
        testID="week-nav-previous"
      />
      <NavButton
        disabled={!canGoForward}
        icon="chevron-right"
        label={t("week.nextWeek")}
        onPress={onNext}
        testID="week-nav-next"
      />
    </View>
  );
}

interface NavButtonProps {
  disabled: boolean;
  icon: "chevron-left" | "chevron-right";
  label: string;
  onPress: () => void;
  testID: string;
}

function NavButton({ disabled, icon, label, onPress, testID }: NavButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      aria-disabled={disabled}
      disabled={disabled}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      role="button"
      testID={testID}
      className={cn(
        "size-8 items-center justify-center rounded-full active:bg-accent",
        disabled && "opacity-40",
      )}
    >
      <Icon name={icon} className="size-5 text-foreground" />
    </Pressable>
  );
}

export function WeekHero({
  window,
  days,
  delta,
  topEmotions,
  logs,
  showHistoryLink = true,
}: WeekHeroProps) {
  const { t, i18n } = useTranslation("mood");
  const { resolveEmotion } = useEmotionDisplay();

  const [openDayKey, setOpenDayKey] = useState<string | null>(null);
  // Paging to another week closes the panel: a day from the week you just left
  // is not on screen any more, and leaving it open would caption the new strip
  // with the old week's entries.
  const [renderedWeek, setRenderedWeek] = useState(window.startKey);
  if (renderedWeek !== window.startKey) {
    setRenderedWeek(window.startKey);
    setOpenDayKey(null);
  }

  const openDayLogs = openDayKey ? logsOnDay(logs, openDayKey) : [];

  return (
    <View className="gap-4">
      {/*
        The design's strip (`2a`): seven borderless columns, an emoji or a dash,
        the weekday letter under each. The big WEEK AVERAGE block it replaces
        moved inline onto the Felt-most-often row below — one number at text
        size, which is the weight the design gives it.
      */}
      <View className="flex-row gap-1.5">
        {days.map((day) => (
          <WeekStripCell
            key={day.dateKey}
            day={day}
            expanded={openDayKey === day.dateKey}
            language={i18n.language}
            onPress={() =>
              setOpenDayKey((current) => (current === day.dateKey ? null : day.dateKey))
            }
            t={t}
          />
        ))}
      </View>

      {openDayKey ? (
        <DayPanel
          dateKey={openDayKey}
          entries={openDayLogs}
          language={i18n.language}
          resolveEmotion={resolveEmotion}
        />
      ) : null}

      {showHistoryLink ? (
        <View className="flex-row justify-end">
          <ShowAllHistoryLink />
        </View>
      ) : null}

      {/*
        One inline row (design `2a`): label left, chips and the week average
        right. The chips drop the design's raw `text-be` for `text-primary-ink`
        (#691 — the be-on-wash chip measures 3.81 and fails AA; in this room
        primary IS the be pour, certified).
      */}
      <View className="flex-row flex-wrap items-center gap-2">
        <Text variant="muted" className="text-xs">
          {t("week.feltMost")}
        </Text>
        <View className="min-w-4 flex-1" />
        {topEmotions.length === 0 ? (
          <Text variant="muted" className="text-[13px]">
            {t("week.noEmotions")}
          </Text>
        ) : (
          topEmotions.map((e) => {
            const display = resolveEmotion(e.id);
            return (
              <View
                key={e.id}
                className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1"
              >
                <Text className="text-xs font-semibold text-primary-ink">
                  {display.name} · {e.count}
                </Text>
              </View>
            );
          })
        )}
        <Text variant="muted" className="text-[13px]">
          {t("week.averageWord")}{" "}
          <Text className="text-[13px] font-semibold text-foreground">
            {delta.current === null ? "—" : delta.current.toFixed(1)}
          </Text>
        </Text>
      </View>
    </View>
  );
}

interface WeekStripCellProps {
  day: WeekDay;
  expanded: boolean;
  language: string;
  onPress: () => void;
  t: TFunction;
}

/**
 * One column of the strip. Three renderings, **two** tap outcomes.
 *
 * The design's rule was `0 → dead tap, 1 → navigate, 2+ → panel`. A dead tap is
 * the worst of the three: a day with no entry silently swallows the press, which
 * reads as a rebuke on precisely the days that must never carry one. And one
 * affordance with three outcomes is unpredictable, since the cell shows an emoji
 * and never a count. So an empty day is **not interactive at all** — no handler,
 * no role, nothing to focus — and one entry opens the panel exactly as five do.
 *
 * A future day renders as **nothing**: no dot, no placeholder, no label. It
 * keeps its flex slot so the seven columns stay aligned, and that is all.
 */
function WeekStripCell({ day, expanded, language, onPress, t }: WeekStripCellProps) {
  if (day.isFuture) return <View className="flex-1" testID="week-strip-future" />;

  const date = parseLocalNoon(day.dateKey);
  const letter = new Intl.DateTimeFormat(language, { weekday: "narrow" }).format(date);
  const dayName = new Intl.DateTimeFormat(language, { weekday: "long" }).format(date);
  // Day averages are means of 1-5 scores, so Math.round stays in range; clamp
  // anyway so a bad value can never index off the emoji map.
  const score = day.average === null ? null : Math.min(5, Math.max(1, Math.round(day.average)));

  const glyph =
    score === null ? (
      // The design's mark for an unlogged day: a short dash, not a hollow
      // circle - a circle reads as a control waiting to be filled, and this
      // cell is deliberately not one.
      <View
        testID="week-strip-empty-dot"
        className="h-0.5 w-3 rounded-full bg-muted-foreground/35"
      />
    ) : (
      <Text className="text-xl leading-none">{MOOD_EMOJI_BY_SCORE[score]}</Text>
    );

  // Borderless columns (design `2a`): today and the open day are carried by the
  // label and a soft wash, never a box outline.
  const shell = cn("flex-1 items-center gap-2.5 rounded-xl py-2.5", expanded && "bg-muted");
  const label =
    score === null
      ? t("week.dayNoEntry", { day: dayName })
      : t("week.dayScore", { day: dayName, score: t(`checkin.scaleLabels.${score}`) });

  if (day.count === 0) {
    return (
      <View
        accessible
        accessibilityRole="image"
        // RNW drops the native-only `accessible` prop, and a generic div
        // prohibits an accessible name — the img role carries the label on web.
        role="img"
        accessibilityLabel={label}
        testID={day.isToday ? "week-strip-today" : undefined}
        className={shell}
      >
        <View className="h-7 items-center justify-center">{glyph}</View>
        <Text
          variant="muted"
          className={cn("text-xs font-semibold", day.isToday && "text-foreground")}
        >
          {letter}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={t("week.dayEntries", { count: day.count })}
      accessibilityLabel={label}
      accessibilityRole="button"
      aria-expanded={expanded}
      onPress={onPress}
      role="button"
      testID={day.isToday ? "week-strip-today" : undefined}
      className={cn(shell, "active:opacity-70")}
    >
      <View className="h-7 items-center justify-center">{glyph}</View>
      <Text
        variant="muted"
        className={cn("text-xs font-semibold", (day.isToday || expanded) && "text-foreground")}
      >
        {letter}
      </Text>
    </Pressable>
  );
}

interface DayPanelProps {
  dateKey: string;
  entries: MoodLog[];
  language: string;
  resolveEmotion: ReturnType<typeof useEmotionDisplay>["resolveEmotion"];
}

/**
 * The tapped day's check-ins, listed in place.
 *
 * Rows are `MoodHistoryRow` — which its own docstring calls *the design's
 * day-panel row, plus a note preview* — rather than a resurrected
 * `MoodEntryCard` or a new component. `kind="today"` is what the row wants here:
 * every row is the same day, so the `when` column formats as a bare time and
 * disambiguates the rows from each other, which is the whole job of that column.
 *
 * This panel is the only place a day is enumerated at all, now that #735 removed
 * the inline history list from the overview — so a single-entry day opens it too.
 */
function DayPanel({ dateKey, entries, language, resolveEmotion }: DayPanelProps) {
  const heading = new Intl.DateTimeFormat(language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseLocalNoon(dateKey));

  return (
    <View
      testID="week-day-panel"
      className="mt-1 gap-0.5 rounded-xl border border-border bg-card px-4 py-3"
    >
      <Text
        role="heading"
        aria-level={4}
        className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
      >
        {heading}
      </Text>
      {entries.map((entry, index) => (
        <View key={entry.id}>
          {index > 0 ? <View className="h-px bg-border" /> : null}
          <MoodHistoryRow
            entry={entry}
            kind="today"
            language={language}
            resolveEmotion={resolveEmotion}
          />
        </View>
      ))}
    </View>
  );
}

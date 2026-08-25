import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Platform, Text, View, type TextStyle } from "react-native";
import DateTimePicker, { useDefaultStyles, type DateType } from "react-native-ui-datepicker";
import dayjs, { type Dayjs } from "dayjs";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { useCalendarRovingFocus } from "@/src/lib/calendar-roving-focus";
import { useColorSchemeName } from "@/src/lib/color-scheme";
import { useThemePalette } from "@/src/lib/theme-palette";
import { formatCalendarDayName } from "@/src/utils/date";

/** The shape the patched library hands `components.dayProps` for each cell. */
interface CalendarDayInfo {
  date: DateType;
  isToday?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
}

/**
 * Off-screen but still announced. `display: none` and `visibility: hidden`
 * remove a node from the accessibility tree — and so, on web, silence a live
 * region entirely; clipping it to a pixel is the shape that survives.
 */
const VISUALLY_HIDDEN = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  opacity: 0,
} as const;

/**
 * A calendar draft, inclusive at both ends. `end` stays null while the user
 * has only tapped the first day of a range.
 */
export interface CalendarRange {
  start: Dayjs | null;
  end: Dayjs | null;
}

interface ThemedCalendarBaseProps {
  /** Earliest selectable day, inclusive. */
  minDate?: Dayjs;
  /** Latest selectable day, inclusive. */
  maxDate?: Dayjs;
  /**
   * Per-day veto, evaluated alongside the clamps. A predicate rather than a
   * second clamp because the edit screens need exactly one legal past day
   * (the value already stored) without unlocking the days around it.
   */
  disabledDates?: (date: DateType) => boolean;
}

type ThemedCalendarProps = ThemedCalendarBaseProps &
  // One arm, not two: the single-value modes differ only in whether the
  // time view is shown, so splitting them here would duplicate the shape
  // without documenting a difference.
  (
    | { mode: "date" | "datetime"; value: Dayjs | null; onChange: (next: Dayjs | null) => void }
    | { mode: "range"; value: CalendarRange; onChange: (next: CalendarRange) => void }
  );

/**
 * The app's one wrapper around `react-native-ui-datepicker`: theme, chevrons,
 * locale and week start in a single place, so a calendar cannot be dropped
 * into a screen half-configured.
 *
 * ⚠️ **Value contract:** the underlying picker speaks dayjs in the DEVICE
 * frame only. Anything that edits an instant captured in another frame (#250)
 * marshals in and out around this component, never inside it.
 *
 * ⚠️ The library mutates the global `dayjs.locale()` on every render. That is
 * inert here only because every user-facing date string in this app is
 * formatted through `Intl` (`src/utils/date.ts`) and never through dayjs —
 * nothing added around this component may start formatting with dayjs.
 *
 * `datetime` is `date` plus the library's own time view — the check-in picker,
 * which logs an instant rather than a day.
 *
 * ⚠️ **The accessibility below depends on `patches/react-native-ui-datepicker+3.3.0.patch`.**
 * The library hardcodes every day's and both month buttons' `accessibilityLabel`
 * inside its own `Pressable`; the patch adds the optional hooks used here. A
 * version bump drops the patch by filename and silently reverts all of it — see
 * `patches/README.md`, and `test/patch-version-pin.test.ts`, which fails first.
 */
export function ThemedCalendar(props: ThemedCalendarProps) {
  const { disabledDates } = props;
  const { t, i18n } = useTranslation("common");
  const language = i18n.language;

  /**
   * ⚠️ Pinned by VALUE, not passed straight through.
   *
   * The library re-seeds its visible month from an effect whose dependencies
   * include `date`, `minDate`, `maxDate` and `onChange` — and it re-seeds by
   * snapping the grid back to the SELECTED day's month. Callers hand these in
   * as freshly built dayjs objects and inline closures
   * (`maxDate={dayjs(maxDateKey)}`), so identity churn alone was enough to drag
   * the calendar out of the month the user had paged to: measured here, the
   * next-month button announced April while the grid stayed on March.
   */
  const minMs = props.minDate?.valueOf();
  const maxMs = props.maxDate?.valueOf();
  const minDate = useMemo(() => (minMs === undefined ? undefined : dayjs(minMs)), [minMs]);
  const maxDate = useMemo(() => (maxMs === undefined ? undefined : dayjs(maxMs)), [maxMs]);

  const scheme = useColorSchemeName();
  const defaultStyles = useDefaultStyles(scheme);
  const theme = useThemePalette();
  const styles = useMemo(
    () => ({
      ...defaultStyles,
      today: { borderColor: theme.primary, borderWidth: 1 },
      selected: { backgroundColor: theme.primary },
      selected_label: { color: theme.primaryForeground },
    }),
    [defaultStyles, theme],
  );

  /**
   * The caller's `onChange`, reached through a ref so the handlers below keep
   * one identity for the life of the component — see the note on the clamps
   * above for what an unstable one costs.
   */
  const changeRef = useRef(props.onChange);
  // Written in an effect, not in render, so the compiler's ref rules hold; the
  // handlers below are created once and read it when the user acts.
  useEffect(() => {
    changeRef.current = props.onChange;
  });

  const handleSingleChange = useCallback(({ date }: { date: DateType }) => {
    (changeRef.current as (next: Dayjs | null) => void)(date ? dayjs(date) : null);
  }, []);

  const handleRangeChange = useCallback(
    ({ startDate, endDate }: { startDate: DateType; endDate: DateType }) => {
      (changeRef.current as (next: CalendarRange) => void)({
        start: startDate ? dayjs(startDate) : null,
        end: endDate ? dayjs(endDate) : null,
      });
    },
    [],
  );

  // ── Keyboard operation (#1305) ───────────────────────────────────────────

  /** The day the grid opens on: what is selected, or today when nothing is. */
  const initialVisible = props.mode === "range" ? props.value.start : props.value;

  /**
   * The same verdict the library reaches for a day cell, restated for days it
   * has not rendered — an arrow key can aim past the edge of the visible month,
   * which is exactly where the library has nothing to ask.
   *
   * ⚠️ Kept in step with `shared` below by construction: both read the same
   * three props, and there is no fourth way to block a day. The clamps are
   * DAY-granular to match the library, which compares against `startOf("day")`
   * and `endOf("day")` — the check-in picker's `maxDate` is `now`, and a
   * stricter comparison would call the rest of today unreachable. The predicate
   * is handed the same dayjs the library hands it.
   */
  const isUnavailable = useCallback(
    (date: Dayjs) =>
      (minDate ? date.isBefore(minDate, "day") : false) ||
      (maxDate ? date.isAfter(maxDate, "day") : false) ||
      Boolean(disabledDates?.(date)),
    [minDate, maxDate, disabledDates],
  );

  const { getDayProps, followVisibleMonth, visibleDate } = useCalendarRovingFocus({
    // Seeded once, on mount — the hook holds the value it was given.
    initialDate: initialVisible ?? dayjs(),
    isUnavailable,
  });

  // ── Screen-reader semantics (#1301) ──────────────────────────────────────
  //
  // All three hooks below exist only because the library patch adds them: it
  // hardcodes every day's `accessibilityLabel` to the bare number and both
  // month buttons to English "Prev"/"Next", on its own `Pressable`, so nothing
  // passed through the public component API can reach what AT actually reads.

  /**
   * The full date, so a day is announced as "Monday, 8 September 2026" rather
   * than "8". The weekday is the part that carries the column-header meaning —
   * the visible header row is a set of unassociated labels the library gives
   * no roles to, and it stays decorative.
   */
  const dayProps = useCallback(
    (day: CalendarDayInfo) => {
      const spelled = formatCalendarDayName(dayjs(day.date).toDate(), language);
      return {
        // Roving focus turns thirty tab stops into one. Spread FIRST so the
        // accessible name below cannot be clobbered by it.
        ...getDayProps(dayjs(day.date)),
        // An unparseable date yields "", and an EMPTY accessible name is worse
        // than the bare number this replaces — a button with no name at all. So
        // omit the key entirely and let the library's own label stand.
        ...(spelled
          ? {
              // Interpolated, not concatenated: the joiner and the word order
              // belong to the translation, not to this component.
              accessibilityLabel: day.isToday
                ? t("calendar.todayNamed", { date: spelled })
                : spelled,
            }
          : null),
        // Selection reaches AT as state rather than as the background colour
        // the library paints (WCAG 1.4.1 / 4.1.2). `aria-pressed` on web
        // because these stay real buttons and `aria-selected` is not valid on
        // one; `accessibilityState.selected` is the native equivalent.
        ...(Platform.OS === "web"
          ? { "aria-pressed": Boolean(day.isSelected) }
          : {
              accessibilityState: {
                selected: Boolean(day.isSelected),
                disabled: Boolean(day.isDisabled),
              },
            }),
        // Redundant with the "Today," prefix by design: `aria-current` is the
        // correct web semantic, and the prefix is the only thing that reaches a
        // native screen reader, which has no equivalent.
        ...(day.isToday ? { "aria-current": "date" } : null),
      };
    },
    [getDayProps, language, t],
  );

  /**
   * The visible weekday header, hidden from assistive technology.
   *
   * The library gives those seven labels no roles and no association with the
   * columns beneath them, so a screen reader reads them as a row of stray
   * letters — "S M T W T F S" — before the grid. Associating them properly
   * would need `columnheader`s inside a real `grid`, and there is no grid to
   * put them in: the library renders 42 FLAT sibling days in one wrapping
   * container, with no row elements at all.
   *
   * So the weekday travels in each day's own name instead ("Monday, 8
   * September 2026"), which is the information a column header would have
   * carried, and this row becomes what it already is visually — decoration.
   *
   * ⚠️ Reached through the library's PUBLIC `components.Weekday` hook, not the
   * patch. Keep the rendered text identical: it is what sighted users read, and
   * what `weekdayLabels()` asserts.
   */
  const renderWeekday = useCallback(
    (weekday: { name: { min: string } }) => (
      <Text
        // The library types every entry in its style bag as one
        // ViewStyle|TextStyle|ImageStyle union; this slot is a Text's.
        style={styles.weekday_label as TextStyle}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {weekday.name.min}
      </Text>
    ),
    [styles.weekday_label],
  );

  const navProps = useMemo(
    () => ({
      prevButtonProps: { accessibilityLabel: t("calendar.previousMonth") },
      nextButtonProps: { accessibilityLabel: t("calendar.nextMonth") },
    }),
    [t],
  );

  // Month navigation is otherwise silent: the header text changes with nothing
  // announcing it. The patch fires the library's own `onMonthChange` /
  // `onYearChange` for prev/next too (they fired only from the selector views),
  // and both land in one batch, so the ref is complete by the time either
  // handler announces.
  const visibleRef = useRef<{ month?: number; year?: number }>({});
  const [monthAnnouncement, setMonthAnnouncement] = useState("");

  // ⚠️ Seeded on mount, not left empty. The arrows fire both callbacks, but the
  // header's month and year SELECTORS each fire only their own
  // (`onSelectMonth` / `onSelectYear`), so a user who picks a month from the
  // selector before ever touching an arrow would leave the other half unset —
  // and an announcement that needs both would stay silent for them.
  useEffect(() => {
    const seed = initialVisible ?? dayjs();
    visibleRef.current = { month: seed.month(), year: seed.year() };
    // Mount only: after this the callbacks own it, and re-seeding from a
    // changing `value` would fight the month the user has paged to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const announceVisibleMonth = useCallback(() => {
    const { month, year } = visibleRef.current;
    if (month === undefined || year === undefined) return;
    // Both callbacks land in one batch, so this runs twice for an arrow press —
    // once with a stale year. Harmless: the two updates collapse into a single
    // render, and only the second one is ever painted.
    followVisibleMonth(year, month);
    setMonthAnnouncement(
      new Intl.DateTimeFormat(language || undefined, {
        month: "long",
        year: "numeric",
      }).format(new Date(year, month, 1)),
    );
  }, [followVisibleMonth, language]);

  const handleMonthChange = useCallback(
    (month: number) => {
      visibleRef.current.month = month;
      announceVisibleMonth();
    },
    [announceVisibleMonth],
  );

  const handleYearChange = useCallback(
    (year: number) => {
      visibleRef.current.year = year;
      announceVisibleMonth();
    },
    [announceVisibleMonth],
  );

  // `accessibilityLiveRegion` is ANDROID-ONLY in RN core, so iOS hears nothing
  // from the region alone — the same split #1337 hit with the toast. Gated to
  // iOS rather than "not web" because Android has both and would announce twice.
  useEffect(() => {
    if (!monthAnnouncement || Platform.OS !== "ios") return;
    AccessibilityInfo.announceForAccessibility(monthAnnouncement);
  }, [monthAnnouncement]);

  const shared = {
    // The month the roving tab stop is in, so an arrow or a page that leaves
    // the visible month brings the grid with it. ⚠️ Patch-only: the library's
    // public `month`/`year` pair cannot express this — see the patch's own note.
    visibleDate,
    onMonthChange: handleMonthChange,
    onYearChange: handleYearChange,
    // Month and weekday names follow the app language. Free: the library's
    // entry point imports all ~45 dayjs locale bundles unconditionally, so
    // Bulgarian is already in the bundle whether or not it is asked for.
    locale: i18n.language,
    // ⚠️ FIXED, not locale-derived. The library hard-defaults to Sunday and
    // never reads the week start from `locale` — which is why the mood
    // tracker's range picker opened Sunday-first for so long despite already
    // passing `locale`. The whole app is unconditionally Monday (mondayKeyOf,
    // src/utils/date.ts).
    firstDayOfWeek: 1,
    minDate,
    maxDate,
    disabledDates,
    styles,
    components: {
      IconPrev: <Icon name="chevron-left" className="size-5 text-foreground" />,
      IconNext: <Icon name="chevron-right" className="size-5 text-foreground" />,
      dayProps,
      Weekday: renderWeekday,
      ...navProps,
    },
  };

  /**
   * Wraps whichever picker mode renders below, so the announcement is a sibling
   * of the calendar rather than something each mode has to remember.
   */
  const withLiveRegion = (picker: React.ReactNode) => (
    <View>
      {picker}
      <Text
        accessibilityLiveRegion="polite"
        style={VISUALLY_HIDDEN}
        testID="calendar-month-announcement"
      >
        {monthAnnouncement}
      </Text>
    </View>
  );

  if (props.mode === "range") {
    const { value } = props;
    return withLiveRegion(
      <DateTimePicker
        {...shared}
        mode="range"
        startDate={value.start ?? undefined}
        endDate={value.end ?? undefined}
        onChange={handleRangeChange}
      />,
    );
  }

  const { value } = props;
  return withLiveRegion(
    <DateTimePicker
      {...shared}
      mode="single"
      date={value ?? undefined}
      // The only thing separating the two single-value modes: `datetime` adds
      // the library's time view to the same grid, so they share a branch.
      timePicker={props.mode === "datetime"}
      onChange={handleSingleChange}
    />,
  );
}

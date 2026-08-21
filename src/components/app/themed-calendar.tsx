import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import DateTimePicker, { useDefaultStyles, type DateType } from "react-native-ui-datepicker";
import dayjs, { type Dayjs } from "dayjs";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { useColorSchemeName } from "@/src/lib/color-scheme";
import { useThemePalette } from "@/src/lib/theme-palette";

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
  (
    | { mode: "date"; value: Dayjs | null; onChange: (next: Dayjs | null) => void }
    | { mode: "datetime"; value: Dayjs | null; onChange: (next: Dayjs | null) => void }
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
 */
export function ThemedCalendar(props: ThemedCalendarProps) {
  const { minDate, maxDate, disabledDates } = props;
  const { i18n } = useTranslation("common");

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

  const shared = {
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
    },
  };

  if (props.mode === "range") {
    const { value, onChange } = props;
    return (
      <DateTimePicker
        {...shared}
        mode="range"
        startDate={value.start ?? undefined}
        endDate={value.end ?? undefined}
        onChange={({ startDate, endDate }) =>
          onChange({
            start: startDate ? dayjs(startDate) : null,
            end: endDate ? dayjs(endDate) : null,
          })
        }
      />
    );
  }

  const { value, onChange } = props;
  return (
    <DateTimePicker
      {...shared}
      mode="single"
      date={value ?? undefined}
      // The only thing separating the two single-value modes: `datetime` adds
      // the library's time view to the same grid, so they share a branch.
      timePicker={props.mode === "datetime"}
      onChange={({ date }) => onChange(date ? dayjs(date) : null)}
    />
  );
}

import { useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { PickerSheet } from "@/src/components/app/picker-sheet";
import { SegmentedControl } from "@/src/components/app/segmented-control";
import { Input } from "@/src/components/react-native-reusables/input";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { politeLiveRegionProps } from "@/src/lib/accessibility";
import {
  dateToTime,
  formatTimeOfDay,
  fromTwelveHour,
  timeToDate,
  toTwelveHour,
  usesTwelveHourClock,
  type Meridiem,
  type TimeOfDay,
} from "@/src/utils/time";

interface TimeFieldProps {
  value: TimeOfDay;
  /**
   * The commit. Fires once per settled value and never on an intermediate one:
   * the draft lives inside this component on every platform, so there is no
   * second tier to subscribe to. (`onCommit` used to be that tier; with the
   * draft internal, both callbacks fired at the same instant.)
   */
  onChange: (next: TimeOfDay) => void;
  /**
   * Required, because on web this field is three sub-controls and each one's
   * name is COMPOSED from it — "Mood reminder time, hour". Three controls
   * sharing one name are three controls a screen-reader user cannot tell apart.
   */
  accessibilityLabel: string;
  disabled?: boolean;
  /** Row-sized (36px, hugging its content) instead of the full-width form field. */
  compact?: boolean;
  /**
   * True when this field sits inside an ALREADY-DIMMED container, so a disabled field must
   * not dim again: 0.4 over the reminders row's 0.55 lands the time at 0.22, which erases
   * the very value that row exists to keep showing while the master is off.
   */
  inDimmedContainer?: boolean;
}

/**
 * Entering a time of day.
 *
 * Two implementations, chosen by platform, because the right affordance differs:
 *
 *   - **Native** keeps its OS picker — the iOS spinner in the shared `PickerSheet`,
 *     the Android dialog. A platform time picker is a correct affordance, not a
 *     failure, and replacing it would be the change nobody asked for.
 *   - **Web** types into an `HH : MM` pair (plus AM/PM where the locale wants it).
 *     The browser's own `<input type="time">` is unthemed and untranslated, and the
 *     picker library's web time wheel cannot replace it: its wheel is a bare
 *     `PanResponder` drag surface with no `tabIndex`, no role and not one `aria-*`
 *     attribute, so it has no keyboard, no click-to-select and no mouse wheel
 *     (#1191). Typed, not dragged — the map's no-typed-entry ruling was argued
 *     about calendars, and a time is two bounded integers.
 *
 * ☠️ ONE FILE branching on `Platform.OS`, never a `.web.tsx` fork: `jest-expo` sets
 * `defaultPlatform: "ios"`, so a web fork is invisible to the suite unless a test
 * imports it by explicit path and forces `Platform.OS` — the exact contortion the
 * old test file performed. And `Platform.OS === "web"` rather than
 * `Platform.select({ web })`, which jest cannot observe either.
 */
export function TimeField(props: TimeFieldProps) {
  return Platform.OS === "web" ? <TypedTimeField {...props} /> : <NativeTimeField {...props} />;
}

/* ------------------------------------------------------------------ web --- */

/** `"07"`, `"5"` — one or two digits and nothing else. */
const DIGITS = /^\d{1,2}$/;

/**
 * The inline `HH : MM` pair. No sheet at all: a modal wrapping two text boxes is
 * heavier than the input it replaces, so draft-until-Done never reaches web time
 * entry and the commit boundary is blur with a complete, valid value.
 */
function TypedTimeField({
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
  compact = false,
  inDimmedContainer = false,
}: TimeFieldProps) {
  const { t, i18n } = useTranslation("common");
  const twelveHour = usesTwelveHourClock(i18n.language);

  /**
   * The digits currently being typed, `null` once that half is settled.
   *
   * Held here rather than read back off the input so that an abandoned edit
   * VISIBLY reverts: without it the field would keep showing a half-typed time
   * that silently disagrees with what is stored.
   */
  const [hourText, setHourText] = useState<string | null>(null);
  const [minuteText, setMinuteText] = useState<string | null>(null);
  /**
   * A revert is a change the user did not ask for, and an unannounced value
   * change is an unidentified error — so it gets said, in a region scoped to
   * this field rather than a global one.
   */
  const [revertNotice, setRevertNotice] = useState("");

  const shown = twelveHour
    ? toTwelveHour(value.hour)
    : { hour: value.hour, meridiem: "am" as Meridiem };

  const pad = (n: number) => String(n).padStart(2, "0");
  const hourValue = hourText ?? pad(shown.hour);
  const minuteValue = minuteText ?? pad(value.minute);

  /**
   * The value this field last committed, kept only until the `value` prop agrees.
   *
   * ☠️ Each sub-control commits a PARTIAL update, and two of them can fire inside
   * one interaction: clicking AM/PM blurs the hour first. The parent's write is
   * often an async mutation (the reminders row goes through TanStack), so at the
   * moment of the second commit the prop can still hold the PRE-blur hour, and
   * rebuilding from it silently discards what the user just typed.
   *
   * Measured, not theorised: typing 08 and clicking PM stored 21:00, not 20:00.
   */
  const lastCommitted = useRef<TimeOfDay | null>(null);

  /** The time a partial commit must build on - the in-flight one, else the prop. */
  function baseTime(): TimeOfDay {
    const pending = lastCommitted.current;
    if (!pending) return value;
    if (pending.hour === value.hour && pending.minute === value.minute) {
      // The prop caught up, so it is the single source of truth again.
      lastCommitted.current = null;
      return value;
    }
    return pending;
  }

  function commit(next: TimeOfDay) {
    lastCommitted.current = next;
    setRevertNotice("");
    onChange(next);
  }

  function revert() {
    setRevertNotice(t("time.reverted", { time: formatTimeOfDay(value, i18n.language) }));
  }

  /**
   * Typing again is what retires the notice - NOT focus. Tab from a reverted hour
   * lands on the minute input, and clearing on focus would erase the explanation in
   * the same keystroke that caused it, leaving the value silently changed after all.
   */
  function edit(setText: (next: string) => void) {
    return (next: string) => {
      setRevertNotice("");
      setText(next);
    };
  }

  function commitHour() {
    // Never touched: leaving a field the user only tabbed through is not a commit.
    if (hourText === null) return;
    const typed = Number(hourText.trim());
    setHourText(null);
    const [min, max] = twelveHour ? [1, 12] : [0, 23];
    if (!DIGITS.test(hourText.trim()) || typed < min || typed > max) {
      revert();
      return;
    }
    const base = baseTime();
    commit({
      hour: twelveHour ? fromTwelveHour(typed, toTwelveHour(base.hour).meridiem) : typed,
      minute: base.minute,
    });
  }

  function commitMinute() {
    if (minuteText === null) return;
    const typed = Number(minuteText.trim());
    setMinuteText(null);
    if (!DIGITS.test(minuteText.trim()) || typed < 0 || typed > 59) {
      revert();
      return;
    }
    commit({ hour: baseTime().hour, minute: typed });
  }

  // A discrete two-state control, so it commits on press rather than on blur.
  function commitMeridiem(next: Meridiem) {
    const base = baseTime();
    commit({ hour: fromTwelveHour(toTwelveHour(base.hour).hour, next), minute: base.minute });
  }

  /**
   * ⚠️ Real height, not `hitSlop`: react-native-web targets the DOM box and ignores
   * `hitSlop` entirely, and these used to compose down to 22 × 19 — under the WCAG
   * 2.5.8 AA floor of 24 — because they never stretched to their container (#1231).
   * The `sm:` twin is required too, or the primitive's own `sm:h-9` wins on desktop.
   */
  const digitInput = cn(
    "min-w-0 shrink-0 rounded-md border-0 px-0 text-center shadow-none",
    compact ? "h-8 w-9 text-sm sm:h-8" : "h-10 w-11 sm:h-10",
    // The primitive dims a non-editable input by 0.5; the field already carries
    // whichever dim is correct for its context, and stacking the two is the
    // "shows Off" failure by another route.
    disabled && "opacity-100",
  );

  return (
    <View className={cn("gap-1", compact ? "self-start" : "w-full")}>
      <View
        className={cn(
          "flex-row items-center rounded-md border border-input bg-background",
          compact ? "h-9 gap-0.5 px-1.5" : "h-12 w-full gap-1 px-2",
          disabled && !inDimmedContainer && "opacity-40",
        )}
      >
        <Input
          accessibilityLabel={t("time.hourField", { label: accessibilityLabel })}
          // `editable={false}` alone is react-native-web's `readOnly`, which still
          // reads as a live text box. The state has to be said as well as enforced,
          // and it stays focusable on purpose so its value is still reachable.
          aria-disabled={disabled}
          className={digitInput}
          editable={!disabled}
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={2}
          onBlur={commitHour}
          onChangeText={edit(setHourText)}
          selectTextOnFocus
          value={hourValue}
        />
        <Text className={cn("text-muted-foreground", compact && "text-sm")}>:</Text>
        <Input
          accessibilityLabel={t("time.minuteField", { label: accessibilityLabel })}
          aria-disabled={disabled}
          className={digitInput}
          editable={!disabled}
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={2}
          onBlur={commitMinute}
          onChangeText={edit(setMinuteText)}
          selectTextOnFocus
          value={minuteValue}
        />
        {twelveHour ? (
          <View className="ml-1">
            <SegmentedControl<Meridiem>
              accessibilityLabel={t("time.meridiemField", { label: accessibilityLabel })}
              disabled={disabled}
              onChange={commitMeridiem}
              options={[
                { value: "am", label: t("time.am") },
                { value: "pm", label: t("time.pm") },
              ]}
              value={shown.meridiem}
            />
          </View>
        ) : null}
      </View>
      {/* Single-surface on purpose: the usual pairing with `announceMessage()` is
          for cross-platform announcements, and this branch only ever runs on web,
          where that helper is a no-op. The visible node IS the announcement here. */}
      {revertNotice ? (
        <Text className="text-xs text-muted-foreground" {...politeLiveRegionProps()}>
          {revertNotice}
        </Text>
      ) : null}
    </View>
  );
}

/* --------------------------------------------------------------- native --- */

/**
 * The OS picker behind a trigger: the iOS spinner inside the shared `PickerSheet`,
 * the Android dialog opened imperatively. Hosting the spinner in the shared sheet
 * is what retires the third hand-rolled copy of the picker chrome.
 */
function NativeTimeField({
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
  compact = false,
  inDimmedContainer = false,
}: TimeFieldProps) {
  const { i18n } = useTranslation("common");
  const [open, setOpen] = useState(false);
  // Locale-derived, not hardcoded: a picker reading 19:53 under app text reading
  // 7:53 PM on the same screen is the defect this replaces.
  const is24Hour = !usesTwelveHourClock(i18n.language);

  /**
   * ☠️ A `PickerSheet` seeded from the current value commits that value on Done
   * even when the picker never moved, unless the field stops it. Harmless here
   * today, load-bearing for any caller that reads a commit as intent (#1298).
   */
  function commit(next: TimeOfDay) {
    if (next.hour === value.hour && next.minute === value.minute) return;
    onChange(next);
  }

  // Android has no separate close event - the dialog's OK IS the close - so `set`
  // commits directly, and `dismissed` (or a missing date) commits nothing.
  function commitAndroid(event: DateTimePickerEvent, date?: Date) {
    if (event.type === "dismissed" || !date) return;
    commit(dateToTime(date));
  }

  function openPicker() {
    if (disabled) return;
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: timeToDate(value),
        mode: "time",
        is24Hour,
        onChange: commitAndroid,
      });
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        aria-disabled={disabled}
        disabled={disabled}
        onPress={openPicker}
        className={cn(
          "h-12 w-full flex-row items-center rounded-md border border-input bg-background px-3",
          compact && "h-9 w-auto self-start px-2.5",
          disabled && !inDimmedContainer && "opacity-40",
        )}
      >
        <Text className={cn("text-foreground", compact && "text-sm")}>
          {formatTimeOfDay(value, i18n.language)}
        </Text>
      </Pressable>

      <PickerSheet<TimeOfDay>
        visible={open}
        onClose={() => setOpen(false)}
        initialDraft={value}
        onConfirm={commit}
      >
        {(draft, setDraft) => (
          <DateTimePicker
            testID="time-picker-spinner"
            value={timeToDate(draft)}
            mode="time"
            display="spinner"
            is24Hour={is24Hour}
            onChange={(_event, date) => {
              if (date) setDraft(dateToTime(date));
            }}
          />
        )}
      </PickerSheet>
    </>
  );
}

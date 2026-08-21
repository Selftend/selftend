import { useCallback, useMemo, useState } from "react";
import { Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import dayjs, { type Dayjs } from "dayjs";
import type { DateType } from "react-native-ui-datepicker";

import { PickerSheet } from "@/src/components/app/picker-sheet";
import { ThemedCalendar } from "@/src/components/app/themed-calendar";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { currentDateKey, formatDayKey, localDateKey, parseLocalNoon } from "@/src/utils/date";

interface DateFieldProps {
  /** A `YYYY-MM-DD` day key, or null for no date. */
  value: string | null;
  onChange: (value: string | null) => void;
  accessibilityLabel: string;
}

/**
 * A day the user is aiming AT: the CBT goal's target date.
 *
 * A day key rather than an instant, so nothing here touches time or captured
 * offsets — the sibling `DateTimeField` is the one that records when something
 * happened.
 *
 * Deliberately no clear affordance on the trigger. One that appears and
 * disappears with the value makes the field change width as the form is filled,
 * so clearing lives in the sheet's footer instead, where Clear is a commit of
 * "no date" (#1184).
 *
 * ⚠️ Past days are held back by `disabledDates` alone, NOT by `minDate`. The
 * library checks `minDate` first and returns early, so a `minDate` of today
 * would make a goal's own saved past target date unselectable on the edit path —
 * the app presenting the user's stored value as invalid. The predicate leaves
 * exactly one legal past day: the one already stored.
 */
export function DateField({ value, onChange, accessibilityLabel }: DateFieldProps) {
  const { t, i18n } = useTranslation("common");
  const [open, setOpen] = useState(false);

  const display = value ? formatDayKey(value, i18n.language) : t("noDateSet");

  // Noon-anchored, so seeding the calendar cannot land on the day before across
  // a DST boundary.
  const seed = useMemo(() => (value ? dayjs(parseLocalNoon(value)) : null), [value]);

  // Read once, so the clamp cannot shift under the user mid-pick.
  const todayKey = useMemo(() => currentDateKey(), []);

  const disabledDates = useCallback(
    (date: DateType) => {
      const key = localDateKey(dayjs(date).toDate());
      // `YYYY-MM-DD` sorts lexicographically, so this is a plain compare.
      if (key >= todayKey) return false;
      // The one exemption: a target date already saved in the past stays
      // selectable and shows as selected, while the days around it do not.
      return key !== value;
    },
    [todayKey, value],
  );

  const commit = (draft: Dayjs | null) => {
    if (!draft?.isValid()) return;
    const next = localDateKey(draft.toDate());
    // Done on a calendar the user only looked at is not an edit. The draft is
    // seeded from the stored value, so without this the sheet would commit an
    // identical day and mark the form dirty for a form the user never changed
    // (#1298).
    if (next === value) return;
    onChange(next);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        // Composed, so the value is part of the button's name rather than
        // something only a sighted user gets.
        accessibilityLabel={`${accessibilityLabel}: ${display}`}
        onPress={() => setOpen(true)}
        className="h-12 w-full flex-row items-center justify-between rounded-md border border-input bg-background px-3 active:bg-accent/40"
      >
        <Text className={value ? "text-foreground" : "text-muted-foreground"}>{display}</Text>
        <Icon name="calendar-month" className="size-5 text-muted-foreground" />
      </Pressable>

      {/* Chrome, the draft cycle and the #1054 web-unmount gate all arrive with
          the sheet; none of them is restated here. */}
      <PickerSheet<Dayjs | null>
        visible={open}
        onClose={() => setOpen(false)}
        initialDraft={seed}
        onConfirm={commit}
        // Always present, so the footer keeps one shape and the only way to
        // clear a date does not itself come and go with the value.
        onClear={() => {
          if (value !== null) onChange(null);
        }}
      >
        {(draft, setDraft) => (
          <ThemedCalendar
            mode="date"
            value={draft}
            onChange={setDraft}
            disabledDates={disabledDates}
          />
        )}
      </PickerSheet>
    </>
  );
}

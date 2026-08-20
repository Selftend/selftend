import dayjs from "dayjs";

import { PickerSheet } from "@/src/components/app/picker-sheet";
import { ThemedCalendar, type CalendarRange } from "@/src/components/app/themed-calendar";

export interface DateRange {
  /** Local date key, YYYY-MM-DD, inclusive. */
  start: string;
  end: string;
}

interface DateRangeFieldProps {
  visible: boolean;
  onClose: () => void;
  value: DateRange | null;
  onChange: (range: DateRange) => void;
  /** Lower clamp (the user's first entry); no clamp while unknown. */
  minDateKey?: string;
  /** Upper clamp, normally today. */
  maxDateKey: string;
}

/**
 * The mood tracker's custom range, in the shared picker sheet. Everything
 * about chrome and drafting lives in `PickerSheet`; what is left here is the
 * marshalling between the app's local date keys and the calendar's dayjs.
 */
export function DateRangeField({
  visible,
  onClose,
  value,
  onChange,
  minDateKey,
  maxDateKey,
}: DateRangeFieldProps) {
  const initialDraft: CalendarRange = {
    start: value ? dayjs(value.start) : null,
    end: value ? dayjs(value.end) : null,
  };

  return (
    <PickerSheet
      visible={visible}
      onClose={onClose}
      initialDraft={initialDraft}
      onConfirm={(draft) => {
        if (!draft.start?.isValid()) return;
        // A single tap leaves the range open-ended; commit it as that one day.
        const end = draft.end?.isValid() ? draft.end : draft.start;
        onChange({ start: draft.start.format("YYYY-MM-DD"), end: end.format("YYYY-MM-DD") });
      }}
    >
      {(draft, setDraft) => (
        <ThemedCalendar
          mode="range"
          value={draft}
          onChange={setDraft}
          minDate={minDateKey ? dayjs(minDateKey) : undefined}
          maxDate={dayjs(maxDateKey)}
        />
      )}
    </PickerSheet>
  );
}

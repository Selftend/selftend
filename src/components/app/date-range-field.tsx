import { useMemo, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import DateTimePicker, { useDefaultStyles } from "react-native-ui-datepicker";
import dayjs, { type Dayjs } from "dayjs";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { THEME } from "@/lib/theme";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { useAppColorScheme } from "@/src/lib/color-scheme";

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
 * Range-mode calendar in the same themed modal sheet as DateTimeField. Draft
 * selection only commits on Done, so an abandoned sheet leaves the range as-is.
 */
export function DateRangeField({
  visible,
  onClose,
  value,
  onChange,
  minDateKey,
  maxDateKey,
}: DateRangeFieldProps) {
  const reduceMotionEnabled = useReduceMotionEnabled();

  const scheme = useAppColorScheme();
  const defaultStyles = useDefaultStyles(scheme);
  const pickerStyles = useMemo(
    () => ({
      ...defaultStyles,
      today: { borderColor: THEME[scheme].primary, borderWidth: 1 },
      selected: { backgroundColor: THEME[scheme].primary },
      selected_label: { color: THEME[scheme].primaryForeground },
    }),
    [defaultStyles, scheme],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotionEnabled ? "none" : "fade"}
      onRequestClose={onClose}
    >
      {/* The sheet unmounts on close, so each open seeds a fresh draft from the
          active range — reopening adjusts the current selection, never a stale draft. */}
      {visible ? (
        <RangeSheet
          value={value}
          onChange={onChange}
          onClose={onClose}
          minDateKey={minDateKey}
          maxDateKey={maxDateKey}
          pickerStyles={pickerStyles}
        />
      ) : null}
    </Modal>
  );
}

interface RangeSheetProps extends Omit<DateRangeFieldProps, "visible"> {
  pickerStyles: ReturnType<typeof useDefaultStyles>;
}

function RangeSheet({
  value,
  onChange,
  onClose,
  minDateKey,
  maxDateKey,
  pickerStyles,
}: RangeSheetProps) {
  const { t, i18n } = useTranslation("common");
  const [draft, setDraft] = useState<{ start: Dayjs | null; end: Dayjs | null }>(() => ({
    start: value ? dayjs(value.start) : null,
    end: value ? dayjs(value.end) : null,
  }));

  const apply = () => {
    if (draft.start?.isValid()) {
      const end = draft.end?.isValid() ? draft.end : draft.start;
      onChange({ start: draft.start.format("YYYY-MM-DD"), end: end.format("YYYY-MM-DD") });
    }
    onClose();
  };

  return (
    /* Dimmed backdrop - tap anywhere outside the card to close without applying */
    <Pressable
      accessibilityLabel={t("close")}
      accessibilityRole="button"
      className="flex-1 items-center justify-center bg-black/50 p-6"
      onPress={onClose}
      role="button"
    >
      {/* Card - stop propagation so tapping inside doesn't dismiss */}
      <Pressable className="w-full max-w-[340px] rounded-2xl bg-card p-3" onPress={() => {}}>
        <DateTimePicker
          mode="range"
          locale={i18n.language}
          startDate={draft.start ?? undefined}
          endDate={draft.end ?? undefined}
          minDate={minDateKey ? dayjs(minDateKey) : undefined}
          maxDate={dayjs(maxDateKey)}
          onChange={({ startDate, endDate }) => {
            setDraft({
              start: startDate ? dayjs(startDate) : null,
              end: endDate ? dayjs(endDate) : null,
            });
          }}
          styles={pickerStyles}
          components={{
            IconPrev: <Icon name="chevron-left" className="size-5 text-foreground" />,
            IconNext: <Icon name="chevron-right" className="size-5 text-foreground" />,
          }}
        />
        <View className="mt-2">
          <Button onPress={apply}>
            <Text>{t("done")}</Text>
          </Button>
        </View>
      </Pressable>
    </Pressable>
  );
}

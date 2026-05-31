import { useMemo, useState } from "react";
import { Modal, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import DateTimePicker, { useDefaultStyles } from "react-native-ui-datepicker";
import dayjs from "dayjs";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { THEME } from "@/lib/theme";
import { useAppColorScheme } from "@/src/lib/color-scheme";

interface DateTimeFieldProps {
  value: string; // ISO string
  onChange: (iso: string) => void;
  accessibilityLabel?: string;
}

export function DateTimeField({ value, onChange, accessibilityLabel }: DateTimeFieldProps) {
  const { i18n } = useTranslation("navigation");
  const [open, setOpen] = useState(false);

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

  // Guard against an empty/malformed ISO reaching the picker (the `value: string`
  // contract doesn't guarantee validity) — fall back to "now".
  const parsedDate = useMemo(() => {
    const d = dayjs(value);
    return d.isValid() ? d : dayjs();
  }, [value]);

  const display = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(i18n.language, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
    } catch {
      return value;
    }
  }, [value, i18n.language]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => setOpen(true)}
        className="h-12 w-full flex-row items-center justify-between rounded-md border border-input bg-background px-3 active:bg-accent/40"
      >
        <Text className="text-foreground">{display}</Text>
        <Icon name="calendar-month" className="size-5 text-muted-foreground" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* Dimmed backdrop — tap anywhere outside the card to close */}
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setOpen(false)}
        >
          {/* Card — stop propagation so tapping inside doesn't dismiss */}
          <Pressable className="w-full max-w-[340px] rounded-2xl bg-card p-3" onPress={() => {}}>
            <DateTimePicker
              mode="single"
              date={parsedDate}
              maxDate={dayjs().endOf("day")}
              timePicker={true}
              onChange={({ date }) => {
                // The library types allow a null/undefined date; guard before formatting.
                if (!date) return;
                const next = dayjs(date);
                if (next.isValid()) onChange(next.toISOString());
                // Do NOT auto-close: the time picker requires multiple taps
                // (hour, minute, AM/PM). User closes via backdrop press.
              }}
              styles={pickerStyles}
              components={{
                IconPrev: <Icon name="chevron-left" className="size-5 text-foreground" />,
                IconNext: <Icon name="chevron-right" className="size-5 text-foreground" />,
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

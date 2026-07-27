import { useMemo, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import DateTimePicker, { useDefaultStyles } from "react-native-ui-datepicker";
import dayjs from "dayjs";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { THEME } from "@/lib/theme";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { useColorSchemeName } from "@/src/lib/color-scheme";
import { formatAtOffset, shiftFromOffsetFrame, shiftToOffsetFrame } from "@/src/utils/date";

interface DateTimeFieldProps {
  value: string; // ISO string
  onChange: (iso: string) => void;
  accessibilityLabel?: string;
  /**
   * Edit in the frame this occurrence was captured in, rather than the device's.
   * Reading a Tokyo entry in London, the field shows the 23:30 it was logged at —
   * matching the label and day heading around it — and a correction moves the
   * instant without dragging the entry into another civil day (#250). `null` or
   * omitted (offset never captured) keeps the device's frame.
   */
  offsetMinutes?: number | null;
}

export function DateTimeField({
  value,
  onChange,
  accessibilityLabel,
  offsetMinutes = null,
}: DateTimeFieldProps) {
  const { i18n } = useTranslation("navigation");
  const { t } = useTranslation("common");
  const reduceMotionEnabled = useReduceMotionEnabled();
  const [open, setOpen] = useState(false);

  const scheme = useColorSchemeName();
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

  // The picker only speaks the device's frame, so a captured offset is applied by
  // shifting the instant into that frame on the way in, and back out in onChange.
  // With no captured offset every shift below is the identity.
  const framedOffset =
    offsetMinutes !== null && Number.isFinite(offsetMinutes) ? offsetMinutes : null;

  // Guard against an empty/malformed ISO reaching the picker (the `value: string`
  // contract doesn't guarantee validity) - fall back to "now".
  const parsedDate = useMemo(() => {
    const parsed = dayjs(value);
    const base = parsed.isValid() ? parsed.toDate() : new Date();
    return dayjs(framedOffset === null ? base : shiftToOffsetFrame(base, framedOffset));
  }, [value, framedOffset]);

  // "Now" in the same frame, so the future-date clamp means what the user sees.
  const maxDate = useMemo(() => {
    const now = new Date();
    return dayjs(framedOffset === null ? now : shiftToOffsetFrame(now, framedOffset));
  }, [framedOffset]);

  const display = useMemo(() => {
    try {
      return formatAtOffset(value, framedOffset, i18n.language);
    } catch {
      return value;
    }
  }, [value, framedOffset, i18n.language]);

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

      <Modal
        visible={open}
        transparent
        animationType={reduceMotionEnabled ? "none" : "fade"}
        onRequestClose={() => setOpen(false)}
      >
        {/* Dimmed backdrop - tap anywhere outside the card to close */}
        <Pressable
          accessibilityLabel={t("close")}
          accessibilityRole="button"
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setOpen(false)}
          role="button"
        >
          {/* Card - stop propagation so tapping inside doesn't dismiss */}
          <Pressable className="w-full max-w-[340px] rounded-2xl bg-card p-3" onPress={() => {}}>
            <DateTimePicker
              mode="single"
              date={parsedDate}
              maxDate={maxDate}
              timePicker={true}
              onChange={({ date }) => {
                if (!date) return;
                const next = dayjs(date);
                if (!next.isValid()) return;
                // Clamp inside the display frame, then shift the result back to a
                // real instant.
                const picked = (next.isAfter(maxDate) ? maxDate : next).toDate();
                onChange(
                  (framedOffset === null
                    ? picked
                    : shiftFromOffsetFrame(picked, framedOffset)
                  ).toISOString(),
                );
              }}
              styles={pickerStyles}
              components={{
                IconPrev: <Icon name="chevron-left" className="size-5 text-foreground" />,
                IconNext: <Icon name="chevron-right" className="size-5 text-foreground" />,
              }}
            />
            <View className="mt-2">
              <Button onPress={() => setOpen(false)}>
                <Text>{t("done")}</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

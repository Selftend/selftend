import { useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import {
  dateToTime,
  formatTimeLabel,
  is24HourLocale,
  timeToDate,
  type TimeOfDay,
} from "@/src/utils/time";

export interface TimeFieldProps {
  value: TimeOfDay;
  onChange: (next: TimeOfDay) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export function TimeField({ value, onChange, accessibilityLabel, disabled }: TimeFieldProps) {
  const { t, i18n } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const is24Hour = is24HourLocale(i18n.language);

  // Android fires `dismissed` on cancel; ignore it and any missing date.
  const commit = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed" || !date) return;
    onChange(dateToTime(date));
  };

  const openPicker = () => {
    if (disabled) return;
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: timeToDate(value),
        mode: "time",
        is24Hour,
        onChange: commit,
      });
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={openPicker}
        className={cn(
          "h-12 w-full flex-row items-center rounded-md border border-input bg-background px-3",
          disabled && "opacity-40",
        )}
      >
        <Text className="text-foreground">{formatTimeLabel(value, i18n.language)}</Text>
      </Pressable>

      {/* iOS only: Android uses the OS dialog opened above. */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setOpen(false)}
        >
          <Pressable className="w-full max-w-[340px] rounded-2xl bg-card p-3" onPress={() => {}}>
            <DateTimePicker
              value={timeToDate(value)}
              mode="time"
              display="spinner"
              is24Hour={is24Hour}
              onChange={commit}
            />
            <View className="mt-3">
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

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
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { dateToTime, formatHHmm, timeToDate, type TimeOfDay } from "@/src/utils/time";

interface TimeFieldProps {
  value: TimeOfDay;
  onChange: (next: TimeOfDay) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export function TimeField({ value, onChange, accessibilityLabel, disabled }: TimeFieldProps) {
  const { t } = useTranslation("common");
  const reduceMotionEnabled = useReduceMotionEnabled();
  const [open, setOpen] = useState(false);

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
        is24Hour: true,
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
        aria-disabled={Boolean(disabled)}
        disabled={disabled}
        onPress={openPicker}
        className={cn(
          "h-12 w-full flex-row items-center rounded-md border border-input bg-background px-3",
          disabled && "opacity-40",
        )}
      >
        <Text className="text-foreground">{formatHHmm(value)}</Text>
      </Pressable>

      {/* iOS only: Android uses the OS dialog opened above. */}
      <Modal
        visible={open}
        transparent
        animationType={reduceMotionEnabled ? "none" : "fade"}
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 items-center justify-center p-6">
          {/* Dimmed backdrop - tap anywhere outside the card to close. A sibling
              behind the card rather than a wrapper: a wrapping button would nest
              the card's buttons inside a <button> on web, which the DOM forbids. */}
          <Pressable
            accessibilityLabel={t("close")}
            accessibilityRole="button"
            className="absolute inset-0 bg-black/50"
            onPress={() => setOpen(false)}
            role="button"
            // Out of the web Tab order (invisible to sighted keyboard users, who
            // have Escape); touch-exploration screen readers keep a labeled close.
            {...(Platform.OS === "web" ? { tabIndex: -1 as const } : {})}
          />
          <View className="w-full max-w-[340px] rounded-2xl bg-card p-3">
            <DateTimePicker
              value={timeToDate(value)}
              mode="time"
              display="spinner"
              is24Hour
              onChange={commit}
            />
            <View className="mt-3">
              <Button onPress={() => setOpen(false)}>
                <Text>{t("done")}</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

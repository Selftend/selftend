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
  /**
   * Fired once when the picker CLOSES, with the value the user settled on - the commit
   * boundary for anything that persists (#981). `onChange` is the draft: the iOS spinner
   * fires it continuously while scrolling and the web input fires it per keystroke, so a
   * caller that writes on every `onChange` writes a row of half-typed times.
   */
  onCommit?: (next: TimeOfDay) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** Row-sized trigger (36px, hugging its content) instead of the full-width form field. */
  compact?: boolean;
  /**
   * True when this field sits inside an ALREADY-DIMMED container, so a disabled field must
   * not dim again: 0.4 over the reminders row's 0.55 lands the time at 0.22, which erases
   * the very value that row exists to keep showing while the master is off.
   */
  inDimmedContainer?: boolean;
}

export function TimeField({
  value,
  onChange,
  onCommit,
  accessibilityLabel,
  disabled,
  compact,
  inDimmedContainer = false,
}: TimeFieldProps) {
  const { t } = useTranslation("common");
  const reduceMotionEnabled = useReduceMotionEnabled();
  const [open, setOpen] = useState(false);
  // The iOS spinner's live value. The modal's Done button is the commit, so the last
  // scrolled-to value has to survive from the spinner's last onChange to that press.
  const [draft, setDraft] = useState<TimeOfDay | null>(null);

  // Android fires `dismissed` on cancel; ignore it and any missing date. Android has no
  // separate close event - the OS dialog's OK IS the close - so `set` commits directly.
  const commitAndroid = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed" || !date) return;
    const next = dateToTime(date);
    onChange(next);
    onCommit?.(next);
  };

  const changeIos = (_event: DateTimePickerEvent, date?: Date) => {
    if (!date) return;
    const next = dateToTime(date);
    setDraft(next);
    onChange(next);
  };

  const closeIos = () => {
    setOpen(false);
    onCommit?.(draft ?? value);
    setDraft(null);
  };

  const openPicker = () => {
    if (disabled) return;
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: timeToDate(value),
        mode: "time",
        is24Hour: true,
        onChange: commitAndroid,
      });
      return;
    }
    setDraft(null);
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
          compact && "h-9 w-auto self-start px-2.5",
          disabled && !inDimmedContainer && "opacity-40",
        )}
      >
        <Text className={cn("text-foreground", compact && "text-sm")}>{formatHHmm(value)}</Text>
      </Pressable>

      {/* iOS only: Android uses the OS dialog opened above. */}
      <Modal
        visible={open}
        transparent
        animationType={reduceMotionEnabled ? "none" : "fade"}
        onRequestClose={closeIos}
      >
        <View className="flex-1 items-center justify-center p-6">
          {/* Dimmed backdrop - tap anywhere outside the card to close. A sibling
              behind the card rather than a wrapper: a wrapping button would nest
              the card's buttons inside a <button> on web, which the DOM forbids. */}
          <Pressable
            accessibilityLabel={t("close")}
            accessibilityRole="button"
            className="absolute inset-0 bg-black/50"
            onPress={closeIos}
            role="button"
            // Out of the web Tab order (invisible to sighted keyboard users, who
            // have Escape); touch-exploration screen readers keep a labeled close.
            {...(Platform.OS === "web" ? { tabIndex: -1 as const } : {})}
          />
          <View className="w-full max-w-[340px] rounded-2xl bg-card p-3">
            <DateTimePicker
              testID="time-picker-spinner"
              value={timeToDate(draft ?? value)}
              mode="time"
              display="spinner"
              is24Hour
              onChange={changeIos}
            />
            <View className="mt-3">
              <Button onPress={closeIos}>
                <Text>{t("done")}</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

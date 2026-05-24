import React, { useRef } from "react";
import { Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Input } from "@/src/components/react-native-reusables/input";
import { Text } from "@/src/components/react-native-reusables/text";

interface DateFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
  accessibilityLabel: string;
  placeholder?: string;
  min?: string;
  max?: string;
}

/**
 * `YYYY-MM-DD` date field. On web it shows the chosen date and opens the native
 * date picker via `showPicker()`; on native it falls back to a plain text input.
 */
export function DateField({
  value,
  onChange,
  accessibilityLabel,
  placeholder,
  min,
  max,
}: DateFieldProps) {
  const { t, i18n } = useTranslation("navigation");
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (Platform.OS !== "web") {
    return (
      <Input
        accessibilityLabel={accessibilityLabel}
        onChangeText={(text) => onChange(text.length > 0 ? text : null)}
        placeholder={placeholder ?? "YYYY-MM-DD"}
        value={value ?? ""}
      />
    );
  }

  const openPicker = () => {
    const el = inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.click();
  };

  const display = value
    ? new Intl.DateTimeFormat(i18n.language, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value + "T12:00:00"))
    : (placeholder ?? t("dateBar.selectDate"));

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={openPicker}
        className="h-10 flex-1 flex-row items-center justify-between rounded-md border border-input bg-background px-3 active:bg-accent/40"
      >
        <Text className={value ? "text-foreground" : "text-muted-foreground"}>{display}</Text>
        <Icon name="calendar-month" className="size-5 text-muted-foreground" />
      </Pressable>
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("dateBar.clear")}
          onPress={() => onChange(null)}
          className="size-10 items-center justify-center rounded-md border border-input bg-background active:bg-accent/40"
        >
          <Icon name="close" className="size-5 text-muted-foreground" />
        </Pressable>
      ) : null}
      {React.createElement("input", {
        type: "date",
        ref: inputRef,
        value: value ?? "",
        min,
        max,
        "aria-hidden": true,
        tabIndex: -1,
        onChange: (e: { target: { value: string } }) => onChange(e.target.value || null),
        style: {
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 1,
          height: 1,
          opacity: 0,
          border: 0,
          padding: 0,
          pointerEvents: "none",
        },
      })}
    </View>
  );
}

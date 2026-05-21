import React from "react";
import { Platform, TextInput, View } from "react-native";

import { cn } from "@/lib/utils";

const inputBase =
  "text-foreground border-input dark:bg-input/30 flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-sm shadow-black/5 md:text-sm";
const webFocusRing =
  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 outline-none transition-[color,box-shadow] focus-visible:ring-[3px]";

/** Converts an ISO date string to the "YYYY-MM-DDTHH:mm" format used by datetime-local inputs. */
function toLocalInputValue(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

interface DateTimeFieldProps {
  value: string; // ISO string
  onChange: (iso: string) => void;
  accessibilityLabel?: string;
}

export function DateTimeField({ value, onChange, accessibilityLabel }: DateTimeFieldProps) {
  const localValue = toLocalInputValue(value);

  if (Platform.OS === "web") {
    return (
      <View>
        {React.createElement("input", {
          type: "datetime-local",
          value: localValue,
          "aria-label": accessibilityLabel,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            if (raw) onChange(new Date(raw).toISOString());
          },
          className: cn(inputBase, webFocusRing),
        })}
      </View>
    );
  }

  // Native fallback: plain text input accepting the datetime-local format
  return (
    <TextInput
      value={localValue}
      accessibilityLabel={accessibilityLabel}
      onChangeText={(text) => {
        try {
          const d = new Date(text);
          if (!Number.isNaN(d.getTime())) onChange(d.toISOString());
        } catch {}
      }}
      placeholder="YYYY-MM-DDTHH:mm"
      className={cn(inputBase)}
    />
  );
}

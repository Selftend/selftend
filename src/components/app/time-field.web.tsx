/** @jsxImportSource react */
import type { ChangeEvent } from "react";

import { THEME } from "@/lib/theme";
import { useAppColorScheme } from "@/src/lib/color-scheme";
import { formatHHmm, parseHHmm, type TimeOfDay } from "@/src/utils/time";

export interface TimeFieldProps {
  value: TimeOfDay;
  onChange: (next: TimeOfDay) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export function TimeField({ value, onChange, accessibilityLabel, disabled }: TimeFieldProps) {
  const scheme = useAppColorScheme();
  const theme = THEME[scheme];

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = parseHHmm(event.target.value);
    if (next) onChange(next);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 48,
        width: "100%",
        borderRadius: 6,
        border: `1px solid ${theme.input}`,
        backgroundColor: theme.background,
        paddingLeft: 12,
        paddingRight: 12,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <input
        type="time"
        aria-label={accessibilityLabel}
        disabled={disabled}
        value={formatHHmm(value)}
        onChange={handleChange}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          border: "none",
          outline: "none",
          background: "transparent",
          color: theme.foreground,
          fontSize: 16,
          width: "100%",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

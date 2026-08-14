/** @jsxImportSource react */
import type { ChangeEvent, FocusEvent } from "react";

import { useThemePalette } from "@/src/lib/theme-palette";
import { formatHHmm, parseHHmm, type TimeOfDay } from "@/src/utils/time";

export interface TimeFieldProps {
  value: TimeOfDay;
  onChange: (next: TimeOfDay) => void;
  /**
   * Fired when the field is left, which is the web equivalent of the picker closing (#981).
   * `<input type="time">` fires `change` per keystroke - "1", "19", "19:0", "19:05" - so
   * persisting on `onChange` means four writes and three of them are wrong.
   */
  onCommit?: (next: TimeOfDay) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** Row-sized trigger (36px, hugging its content) instead of the full-width form field. */
  compact?: boolean;
  /**
   * Whether a disabled field also dims itself. Off when the CONTAINER is already dimmed -
   * two opacities multiply, and 0.4 x 0.55 erases the very value the reminders row is meant
   * to keep showing while the master is off.
   */
  dimWhenDisabled?: boolean;
}

export function TimeField({
  value,
  onChange,
  onCommit,
  accessibilityLabel,
  disabled,
  compact,
  dimWhenDisabled = true,
}: TimeFieldProps) {
  const theme = useThemePalette();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = parseHHmm(event.target.value);
    if (next) onChange(next);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const next = parseHHmm(event.target.value);
    if (next) onCommit?.(next);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: compact ? 36 : 48,
        width: compact ? "fit-content" : "100%",
        // A flex child stretches by default, which is how the compact trigger ended up as
        // wide as its row on the reminders screen.
        alignSelf: compact ? "flex-start" : "stretch",
        flexShrink: 0,
        borderRadius: 6,
        border: `1px solid ${theme.input}`,
        backgroundColor: theme.background,
        paddingLeft: compact ? 10 : 12,
        paddingRight: compact ? 10 : 12,
        opacity: disabled && dimWhenDisabled ? 0.4 : 1,
      }}
    >
      <input
        type="time"
        aria-label={accessibilityLabel}
        disabled={disabled}
        value={formatHHmm(value)}
        onChange={handleChange}
        onBlur={handleBlur}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          border: "none",
          outline: "none",
          background: "transparent",
          color: theme.foreground,
          fontSize: compact ? 14 : 16,
          width: compact ? "fit-content" : "100%",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

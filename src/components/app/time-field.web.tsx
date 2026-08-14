/** @jsxImportSource react */
import { useState, type ChangeEvent, type FocusEvent } from "react";

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
  const theme = useThemePalette();
  /**
   * The raw text while the field is being edited, `null` once it is settled.
   *
   * `<input type="time">` legitimately holds unparseable intermediate values ("07:" between
   * two keystrokes). Without holding them here, the input's own DOM value drifts away from
   * the React `value` prop and an abandoned edit leaves a half-typed time on screen that no
   * longer matches what is stored. Clearing it on blur is what makes the field VISIBLY revert
   * rather than silently disagree.
   */
  const [draftText, setDraftText] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraftText(event.target.value);
    const next = parseHHmm(event.target.value);
    if (next) onChange(next);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const next = parseHHmm(event.target.value);
    setDraftText(null);
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
        opacity: disabled && !inDimmedContainer ? 0.4 : 1,
      }}
    >
      <input
        type="time"
        aria-label={accessibilityLabel}
        disabled={disabled}
        value={draftText ?? formatHHmm(value)}
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

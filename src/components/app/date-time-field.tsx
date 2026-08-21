import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import dayjs, { type Dayjs } from "dayjs";

import { PickerSheet } from "@/src/components/app/picker-sheet";
import { ThemedCalendar } from "@/src/components/app/themed-calendar";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { formatAtOffset, shiftFromOffsetFrame, shiftToOffsetFrame } from "@/src/utils/date";

/**
 * Read a real instant as the captured frame shows it, and write it back. The
 * picker speaks the device's frame only, so these are the two edges where a
 * captured offset is applied and undone; with no captured offset both are the
 * identity. Module scope so the memos below can use them without listing them.
 */
function intoFrame(instant: Date, offsetMinutes: number | null): Date {
  return offsetMinutes === null ? instant : shiftToOffsetFrame(instant, offsetMinutes);
}

function outOfFrame(framed: Date, offsetMinutes: number | null): Date {
  return offsetMinutes === null ? framed : shiftFromOffsetFrame(framed, offsetMinutes);
}

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
  /**
   * How the closed field draws. `"field"` is the boxed input; `"row"` is the
   * design's hairline schedule row (`🕓 Aug 7, 2026 · 4:51 pm — Change`, 2b/6b)
   * — same picker, same frame handling, different chrome (#869).
   */
  appearance?: "field" | "row";
}

/**
 * The check-in picker: when an entry happened, for mood, journal, gratitude
 * and sleep.
 *
 * A selection is a DRAFT until Done. Dismissing the sheet — backdrop or Escape
 * — discards it, so opening the calendar merely to look at a date leaves the
 * entry alone (#1298). The sheet owns that cycle; what stays here is this
 * field's own two concerns: the captured-offset frame and the clamp to now.
 *
 * ⚠️ The captured-offset shifting (#250) lives HERE and must not migrate into
 * `PickerSheet` or `ThemedCalendar` — the shared primitives speak the device
 * frame only, and every wrapper marshals in and out around them.
 */
export function DateTimeField({
  value,
  onChange,
  accessibilityLabel,
  offsetMinutes = null,
  appearance = "field",
}: DateTimeFieldProps) {
  const { i18n } = useTranslation("navigation");
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  // The picker only speaks the device's frame, so a captured offset is applied by
  // shifting the instant into that frame on the way in, and back out on commit.
  // With no captured offset every shift below is the identity.
  const framedOffset =
    offsetMinutes !== null && Number.isFinite(offsetMinutes) ? offsetMinutes : null;

  // Guard against an empty/malformed ISO reaching the picker (the `value: string`
  // contract doesn't guarantee validity) - fall back to "now".
  const parsedDate = useMemo(() => {
    const parsed = dayjs(value);
    const base = parsed.isValid() ? parsed.toDate() : new Date();
    return dayjs(intoFrame(base, framedOffset));
  }, [value, framedOffset]);

  // "Now" in the same frame, so the future-date clamp means what the user sees.
  const maxDate = useMemo(() => dayjs(intoFrame(new Date(), framedOffset)), [framedOffset]);

  const display = useMemo(() => {
    try {
      return formatAtOffset(value, framedOffset, i18n.language);
    } catch {
      return value;
    }
  }, [value, framedOffset, i18n.language]);

  // The one commit point. `maxDate` already keeps future DAYS unselectable;
  // this re-clamps because the time view can still walk today past now.
  const commit = (draft: Dayjs | null) => {
    if (!draft?.isValid()) return;
    // Clamp inside the display frame, then shift the result back to a real
    // instant.
    const picked = (draft.isAfter(maxDate) ? maxDate : draft).toDate();
    const next = outOfFrame(picked, framedOffset).toISOString();
    // ⚠️ Done on a calendar the user only LOOKED at is not an edit. The draft
    // is seeded from the current value, so without this the sheet would commit
    // an identical instant — and four of the six call sites read any commit as
    // the user restating when, stamping this device's offset onto an entry
    // that never captured one. #250 forbids exactly that.
    if (new Date(value).getTime() === new Date(next).getTime()) return;
    onChange(next);
  };

  return (
    <>
      {appearance === "row" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={() => setOpen(true)}
          className="w-full flex-row items-center justify-between gap-3 border-y border-border py-3.5 active:opacity-70"
        >
          <View className="min-w-0 flex-row items-center gap-2.5">
            <Icon name="schedule" className="size-[18px] text-muted-foreground" />
            <Text className="text-[13.5px] tabular-nums text-foreground" numberOfLines={1}>
              {display}
            </Text>
          </View>
          <Text className="text-[12.5px] text-muted-foreground">{t("change")}</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={() => setOpen(true)}
          className="h-12 w-full flex-row items-center justify-between rounded-md border border-input bg-background px-3 active:bg-accent/40"
        >
          <Text className="text-foreground">{display}</Text>
          <Icon name="calendar-month" className="size-5 text-muted-foreground" />
        </Pressable>
      )}

      {/* Chrome, the draft cycle and the #1054 web-unmount gate all arrive with
          the sheet; none of them is restated here. */}
      <PickerSheet<Dayjs | null>
        visible={open}
        onClose={() => setOpen(false)}
        initialDraft={parsedDate}
        onConfirm={commit}
      >
        {(draft, setDraft) => (
          <ThemedCalendar mode="datetime" value={draft} onChange={setDraft} maxDate={maxDate} />
        )}
      </PickerSheet>
    </>
  );
}

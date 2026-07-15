import { View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  deriveRoutineStrip,
  type RoutineToolRecords,
  type SteppableToolId,
} from "@/src/features/routines/derive";
import { lastNDayKeys, parseLocalNoon } from "@/src/utils/date";
import { cn } from "@/lib/utils";

interface RoutineDayStripProps {
  steps: readonly { toolId: SteppableToolId }[];
  records: RoutineToolRecords;
}

/**
 * The last-7-days dot strip (#49), mirroring the habits list rows' strip: one
 * cell per local day (oldest left, today right), filled only when the whole
 * routine derived "complete" that day. Un-filled days render in the same
 * neutral muted tone as habits' open days - no error color, no "broken run"
 * styling, and deliberately no streak count anywhere. Callers render their own
 * heading; this is just the row of days.
 */
export function RoutineDayStrip({ steps, records }: RoutineDayStripProps) {
  const { t, i18n } = useTranslation("routines");
  const days = deriveRoutineStrip(steps, records, lastNDayKeys(7));
  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <View className="flex-row gap-1.5">
      {days.map((day) => (
        <View
          key={day.dayKey}
          accessibilityLabel={t(day.complete ? "strip.dayComplete" : "strip.dayOpen", {
            date: dateFormat.format(parseLocalNoon(day.dayKey)),
          })}
          className={cn(
            "h-6 flex-1 rounded-md border",
            day.complete ? "border-primary/40 bg-primary/15" : "border-border bg-muted/30",
          )}
        />
      ))}
    </View>
  );
}

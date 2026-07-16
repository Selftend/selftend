import { View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  deriveRoutineStrip,
  type RoutineToolRecords,
  type SteppableToolId,
} from "@/src/features/routines/derive";
import { isScheduledOn } from "@/src/features/routines/scheduling";
import type { Routine } from "@/src/features/routines/types";
import { lastNDayKeys, parseLocalNoon } from "@/src/utils/date";
import { cn } from "@/lib/utils";

/** The slice of a routine that says when it runs (#97). */
export type RoutineSchedule = Pick<Routine, "cadence" | "customDays">;

interface RoutineDayStripProps {
  steps: readonly { toolId: SteppableToolId }[];
  records: RoutineToolRecords;
  schedule: RoutineSchedule;
}

/**
 * The last-7-days dot strip (#49), mirroring the habits list rows' strip: one
 * cell per local day (oldest left, today right), filled only when the whole
 * routine derived "complete" that day. Un-filled scheduled days render in the
 * same neutral muted tone as habits' open days - no error color, no "broken
 * run" styling, and deliberately no streak count anywhere. Days the routine
 * was NOT scheduled render even quieter (#106): "nothing was expected here",
 * never "you missed" - though a manual off-day completion still fills
 * normally, because completion is an independent fact. Callers render their
 * own heading; this is just the row of days.
 */
export function RoutineDayStrip({ steps, records, schedule }: RoutineDayStripProps) {
  const { t, i18n } = useTranslation("routines");
  const days = deriveRoutineStrip(steps, records, lastNDayKeys(7));
  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <View className="flex-row gap-1.5">
      {days.map((day) => {
        const scheduled = isScheduledOn(schedule, parseLocalNoon(day.dayKey));
        const labelKey = day.complete
          ? "strip.dayComplete"
          : scheduled
            ? "strip.dayOpen"
            : "strip.dayNotScheduled";
        return (
          <View
            key={day.dayKey}
            accessibilityLabel={t(labelKey, {
              date: dateFormat.format(parseLocalNoon(day.dayKey)),
            })}
            className={cn(
              "h-6 flex-1 rounded-md border",
              day.complete
                ? "border-primary/40 bg-primary/15"
                : scheduled
                  ? "border-border bg-muted/30"
                  : "border-transparent bg-muted/15",
            )}
          />
        );
      })}
    </View>
  );
}

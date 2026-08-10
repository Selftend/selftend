import { useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import { BarChart } from "@/src/components/charts/bar-chart";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { formatCompactHours } from "@/src/features/sleep/format";
import type { SleepLog } from "@/src/features/sleep/types";
import { parseLocalNoon } from "@/src/utils/date";

const MIN_SCALE_MINUTES = 10 * 60;
const BAR_AREA = 80;
const MAX_BAR_WIDTH = 44;

function scaleCeiling(nights: SleepLog[]): number {
  const longest = Math.max(0, ...nights.map((night) => night.durationMinutes));
  return Math.max(MIN_SCALE_MINUTES, Math.ceil(longest / 60) * 60);
}

// One bar per sleep entry (newest at right). Height alone encodes duration;
// colour is deliberately uniform so the chart does not grade an entry (#772).
export function SleepDurationChart({ nights }: { nights: SleepLog[] }) {
  const { t, i18n } = useTranslation("sleep");
  const { width } = useWindowDimensions();
  const dateFmt = new Intl.DateTimeFormat(i18n.language, { month: "numeric", day: "numeric" });
  const maxMinutes = scaleCeiling(nights);
  const showEveryDate = width > 360;

  return (
    <Card variant="soft">
      <CardContent className="gap-3 pt-4 pb-4">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {t("chart.duration14")}
        </Text>
        {nights.length === 0 ? (
          <Text variant="muted" className="text-sm">
            {t("chart.empty")}
          </Text>
        ) : (
          <BarChart
            bars={nights.map((night, index) => {
              const date = dateFmt.format(parseLocalNoon(night.dayKey));
              const duration = t("chart.compactHours", {
                value: formatCompactHours(night.durationMinutes, i18n.language),
              });
              return {
                key: night.id,
                value: night.durationMinutes,
                topLabel: duration,
                // Keep fourteen columns legible at phone width. Every column
                // retains its date in the accessible name, and wider screens
                // print every visual date.
                label: showEveryDate || index % 2 === 0 ? date : undefined,
                accessibilityLabel: t("chart.durationBarA11y", { date, duration }),
              };
            })}
            max={maxMinutes}
            barAreaHeight={BAR_AREA}
            maxBarWidth={MAX_BAR_WIDTH}
            tintClass="bg-muted-foreground/80"
            barClassName="rounded-t-md"
            className="gap-1"
            columnClassName="gap-0.5"
            labelClassName="leading-3"
          />
        )}
      </CardContent>
    </Card>
  );
}

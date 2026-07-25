import { useTranslation } from "react-i18next";

import { BarChart } from "@/src/components/charts/bar-chart";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

const BAR_AREA = 62;
const MONDAY = new Date(2024, 0, 1); // Jan 1 2024 is a Monday - used only for weekday letters.

export function SleepWeekdayChart({ averages }: { averages: (number | null)[] }) {
  const { t, i18n } = useTranslation("sleep");
  const hasData = averages.some((a) => a !== null);
  const bestIdx = averages.reduce<number>(
    (best, a, i) => (a !== null && a > (averages[best] ?? -1) ? i : best),
    0,
  );

  return (
    <Card>
      <CardContent className="gap-3 pt-4 pb-4">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {t("chart.weekdayAvg")}
        </Text>
        {!hasData ? (
          <Text variant="muted" className="text-sm">
            {t("chart.empty")}
          </Text>
        ) : (
          <BarChart
            bars={averages.map((avg, i) => {
              const letterDate = new Date(MONDAY);
              letterDate.setDate(MONDAY.getDate() + i);
              return {
                value: avg,
                label: new Intl.DateTimeFormat(i18n.language, { weekday: "narrow" }).format(
                  letterDate,
                ),
                highlighted: avg !== null && i === bestIdx,
              };
            })}
            barAreaHeight={BAR_AREA}
            minBarHeight={BAR_AREA * 0.06}
            tintClass="bg-ink/40"
            highlightTintClass="bg-ink"
            columnClassName="gap-1.5"
            labelClassName="font-semibold"
          />
        )}
      </CardContent>
    </Card>
  );
}

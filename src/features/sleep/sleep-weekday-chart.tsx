import { useTranslation } from "react-i18next";

import { BarChart } from "@/src/components/charts/bar-chart";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { formatCompactHours } from "@/src/features/sleep/format";

const BAR_AREA = 62;
const MONDAY = new Date(2024, 0, 1);

export function SleepWeekdayChart({ averages }: { averages: (number | null)[] }) {
  const { t, i18n } = useTranslation("sleep");
  const hasData = averages.some((average) => average !== null);
  const narrowWeekday = new Intl.DateTimeFormat(i18n.language, { weekday: "narrow" });
  const fullWeekday = new Intl.DateTimeFormat(i18n.language, { weekday: "long" });

  return (
    <Card variant="soft">
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
            bars={averages.map((average, index) => {
              const weekdayDate = new Date(MONDAY);
              weekdayDate.setDate(MONDAY.getDate() + index);
              const label = narrowWeekday.format(weekdayDate);
              const weekday = fullWeekday.format(weekdayDate);
              const duration = average === null ? null : formatCompactHours(average);
              return {
                value: average,
                topLabel: duration ?? "—",
                label,
                accessibilityLabel:
                  duration === null
                    ? t("chart.weekdayBarEmptyA11y", { weekday })
                    : t("chart.weekdayBarA11y", { weekday, duration }),
              };
            })}
            barAreaHeight={BAR_AREA}
            minBarHeight={BAR_AREA * 0.06}
            tintClass="bg-muted-foreground/80"
            columnClassName="gap-1.5"
            labelClassName="font-semibold"
          />
        )}
      </CardContent>
    </Card>
  );
}

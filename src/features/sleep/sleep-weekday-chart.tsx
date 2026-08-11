import { useTranslation } from "react-i18next";

import { BarChart } from "@/src/components/charts/bar-chart";
import { Text } from "@/src/components/react-native-reusables/text";
import { formatCompactHours } from "@/src/features/sleep/format";

const BAR_AREA = 62;
const MONDAY = new Date(2024, 0, 1);

export function SleepWeekdayChart({ averages }: { averages: (number | null)[] }) {
  const { t, i18n } = useTranslation("sleep");
  const hasData = averages.some((average) => average !== null);
  const narrowWeekday = new Intl.DateTimeFormat(i18n.language, { weekday: "narrow" });
  const fullWeekday = new Intl.DateTimeFormat(i18n.language, { weekday: "long" });

  // No Card and no internal eyebrow (#878): the screen's hairline Section
  // carries the title.
  return (
    <>
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
            const duration =
              average === null
                ? null
                : t("chart.compactHours", {
                    value: formatCompactHours(average, i18n.language),
                  });
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
          // bg-primary like every single-series bar chart (#725 family, #878).
          tintClass="bg-primary"
          columnClassName="gap-1.5"
          labelClassName="font-semibold"
        />
      )}
    </>
  );
}

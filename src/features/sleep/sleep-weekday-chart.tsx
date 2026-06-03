import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";

const BAR_AREA = 80;
const MONDAY = new Date(2024, 0, 1); // Jan 1 2024 is a Monday — used only for weekday letters.

export function SleepWeekdayChart({ averages }: { averages: (number | null)[] }) {
  const { t, i18n } = useTranslation("sleep");
  const max = Math.max(1, ...averages.map((a) => a ?? 0));
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
          <View className="flex-row items-end gap-2" style={{ height: BAR_AREA }}>
            {averages.map((avg, i) => {
              const letterDate = new Date(MONDAY);
              letterDate.setDate(MONDAY.getDate() + i);
              const letter = new Intl.DateTimeFormat(i18n.language, { weekday: "narrow" }).format(
                letterDate,
              );
              const heightPct = avg === null ? 0 : (avg / max) * 100;
              const isBest = avg !== null && i === bestIdx;
              return (
                <View key={i} className="flex-1 items-center gap-1.5">
                  <View className="w-full justify-end" style={{ height: BAR_AREA - 18 }}>
                    <View
                      className={cn("w-full rounded-md", isBest ? "bg-ink" : "bg-ink/40")}
                      style={{ height: `${Math.max(heightPct, avg === null ? 0 : 6)}%` }}
                    />
                  </View>
                  <Text variant="muted" className="text-[10px] font-semibold">
                    {letter}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </CardContent>
    </Card>
  );
}

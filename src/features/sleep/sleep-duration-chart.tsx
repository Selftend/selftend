import { useTranslation } from "react-i18next";

import { BarChart } from "@/src/components/charts/bar-chart";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { qualityTint } from "@/src/features/sleep/quality-tint";
import type { SleepLog } from "@/src/features/sleep/types";

const MAX_MINUTES = 10 * 60; // bars cap at 10h
const BAR_AREA = 80;
const MAX_BAR_WIDTH = 44; // keep bars a natural width when only a few nights are logged

function compactHours(minutes: number): string {
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

// One bar per logged night (newest at right), height = hours slept, colour = quality.
export function SleepDurationChart({ nights }: { nights: SleepLog[] }) {
  const { t, i18n } = useTranslation("sleep");
  const dateFmt = new Intl.DateTimeFormat(i18n.language, { month: "numeric", day: "numeric" });

  return (
    <Card>
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
            bars={nights.map((n) => ({
              key: n.id,
              value: n.durationMinutes,
              topLabel: compactHours(n.durationMinutes),
              label: dateFmt.format(new Date(n.loggedAt)),
              tintClass: qualityTint(n.quality),
            }))}
            max={MAX_MINUTES}
            barAreaHeight={BAR_AREA}
            maxBarWidth={MAX_BAR_WIDTH}
          />
        )}
      </CardContent>
    </Card>
  );
}

import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
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
          <View className="flex-row items-end gap-2">
            {nights.map((n) => {
              const barHeight = Math.max(
                4,
                (Math.min(n.durationMinutes, MAX_MINUTES) / MAX_MINUTES) * BAR_AREA,
              );
              return (
                <View
                  key={n.id}
                  className="flex-1 items-center gap-1"
                  style={{ maxWidth: MAX_BAR_WIDTH }}
                >
                  <Text variant="muted" className="text-[10px] font-semibold">
                    {compactHours(n.durationMinutes)}
                  </Text>
                  <View className="w-full justify-end" style={{ height: BAR_AREA }}>
                    <View
                      className={cn("w-full rounded-md", qualityTint(n.quality))}
                      style={{ height: barHeight }}
                    />
                  </View>
                  <Text variant="muted" className="text-[10px]">
                    {dateFmt.format(new Date(n.loggedAt))}
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

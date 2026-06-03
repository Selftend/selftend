import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { qualityTint } from "@/src/features/sleep/quality-tint";

export function SleepQualityMix({ distribution }: { distribution: number[] }) {
  const { t } = useTranslation("sleep");
  const max = Math.max(1, ...distribution);
  const total = distribution.reduce((sum, c) => sum + c, 0);

  return (
    <Card>
      <CardContent className="gap-3 pt-4 pb-4">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {t("chart.qualityMix")}
        </Text>
        {total === 0 ? (
          <Text variant="muted" className="text-sm">
            {t("chart.empty")}
          </Text>
        ) : (
          <View className="gap-2">
            {distribution.map((count, i) => {
              const q = i + 1;
              return (
                <View key={q} className="flex-row items-center gap-3">
                  <Text variant="muted" className="w-20 text-xs">
                    {t(`quality.${q}` as Parameters<typeof t>[0])}
                  </Text>
                  <View className="h-3 flex-1 overflow-hidden rounded-full bg-muted/40">
                    <View
                      className={cn("h-full rounded-full", qualityTint(q))}
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </View>
                  <Text className="w-6 text-right text-xs">{count}</Text>
                </View>
              );
            })}
          </View>
        )}
      </CardContent>
    </Card>
  );
}

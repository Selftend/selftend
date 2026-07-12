import { View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import type { RecoveryStat } from "@/src/features/recovery/stats";

interface RecoveryStatsCardProps {
  stats: RecoveryStat[];
}

/** Grid of derived recovery-progress stat tiles. */
export function RecoveryStatsCard({ stats }: RecoveryStatsCardProps) {
  const { t } = useTranslation("cbt");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recovery.stats.title")}</CardTitle>
        <CardDescription>{t("recovery.stats.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <View className="flex-row flex-wrap gap-3">
          {stats.map((stat) => (
            <View
              key={stat.key}
              className="min-w-[44%] flex-1 gap-1 rounded-md border border-border p-3"
            >
              <Text className="text-2xl font-semibold">{stat.value}</Text>
              <Text variant="muted">{t(`recovery.stats.${stat.key}`, { count: stat.value })}</Text>
            </View>
          ))}
        </View>
      </CardContent>
    </Card>
  );
}

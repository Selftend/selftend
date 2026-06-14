import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardHeader } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { ToolStats } from "@/src/components/app/tool-stats";
import { SleepOnboarding } from "@/src/components/app/sleep-onboarding-modal";
import { useSleepLogs, useSleepLogCount } from "@/src/features/sleep/queries";
import { useSession } from "@/src/providers/session-provider";
import { formatDuration, formatHours } from "@/src/features/sleep/format";
import {
  averageDurationMinutes,
  averageQuality,
  extremes,
  qualityDistribution,
  recentNights,
  weekdayAverages,
} from "@/src/features/sleep/summaries";
import { SleepDurationChart } from "@/src/features/sleep/sleep-duration-chart";
import { SleepQualityMix } from "@/src/features/sleep/sleep-quality-mix";
import { SleepWeekdayChart } from "@/src/features/sleep/sleep-weekday-chart";
import { SleepRecentList } from "@/src/features/sleep/sleep-recent-list";

export default function SleepTrackerScreen() {
  const { t } = useTranslation("sleep");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: logs } = useSleepLogs(userId, 50);
  // Exact lifetime total for the hero - the list above is capped at 50, so its length
  // would freeze the displayed "nights" count once a user passes that many logs.
  const { data: totalNights } = useSleepLogCount(userId);
  const [forceOnboarding, setForceOnboarding] = useState(false);

  const allLogs = logs ?? [];
  const sevenDayDuration = averageDurationMinutes(allLogs, 7);
  const thirtyDayDuration = averageDurationMinutes(allLogs, 30);
  const sevenDayQuality = averageQuality(allLogs, 7);
  const thirtyDayQuality = averageQuality(allLogs, 30);
  const { longest, shortest } = extremes(allLogs);
  const nights14 = recentNights(allLogs, 14);
  const distribution = qualityDistribution(allLogs, 30);
  const weekly = weekdayAverages(allLogs);

  return (
    <>
      <SleepOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-4">
          <View className="gap-6">
            <ModuleHomeHeader
              addWidgetCategory="sleep"
              title={t("title")}
              hue="ink"
              icon="bedtime"
              moduleLabel={null}
              description={t("description")}
              actions={[
                { type: "notifications", targetKey: "sleep" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              meta={
                <ToolStats
                  accentClassName="text-ink"
                  items={[
                    { value: formatHours(sevenDayDuration), label: t("hero.avg") },
                    {
                      value: sevenDayQuality !== null ? `${sevenDayQuality}/5` : "–",
                      label: t("hero.quality"),
                    },
                    {
                      value: t("hero.nights", { count: totalNights ?? allLogs.length }),
                      label: "",
                    },
                  ]}
                />
              }
            />

            <View className="flex-row gap-3">
              <Button onPress={() => router.push("/tools/sleep/new")} className="self-start">
                <Icon name="bedtime" className="size-4 text-primary-foreground" />
                <Text>{t("cta.log")}</Text>
              </Button>
            </View>

            <View className="gap-3">
              <Text variant="h3">{t("sections.trend")}</Text>
              <SleepDurationChart nights={nights14} />
            </View>

            <View className="gap-3">
              <Text variant="h3">{t("sections.stats")}</Text>
              <View className="flex-row flex-wrap gap-3">
                <StatTile
                  label={t("summary.sevenDay")}
                  value={formatHours(sevenDayDuration)}
                  sub={
                    sevenDayQuality !== null
                      ? t("summary.avgQuality", { quality: sevenDayQuality })
                      : undefined
                  }
                />
                <StatTile
                  label={t("summary.thirtyDay")}
                  value={formatHours(thirtyDayDuration)}
                  sub={
                    thirtyDayQuality !== null
                      ? t("summary.avgQuality", { quality: thirtyDayQuality })
                      : undefined
                  }
                />
                <StatTile
                  label={t("stats.longest")}
                  value={longest !== null ? formatDuration(longest) : "–"}
                />
                <StatTile
                  label={t("stats.shortest")}
                  value={shortest !== null ? formatDuration(shortest) : "–"}
                />
              </View>
            </View>

            <View className="gap-3">
              <Text variant="h3">{t("sections.quality")}</Text>
              <SleepQualityMix distribution={distribution} />
            </View>

            <View className="gap-3">
              <Text variant="h3">{t("sections.weekday")}</Text>
              <SleepWeekdayChart averages={weekly} />
            </View>

            <View className="gap-3">
              <Text variant="h3">{t("sections.recent")}</Text>
              <SleepRecentList logs={allLogs} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
}

function StatTile({ label, value, sub }: StatTileProps) {
  return (
    <Card className="min-w-[150px] flex-1 basis-[150px]">
      <CardHeader>
        <Text variant="muted" className="text-xs uppercase tracking-wide">
          {label}
        </Text>
      </CardHeader>
      <CardContent>
        <View className="gap-1">
          <Text className="text-2xl font-semibold">{value}</Text>
          {sub ? (
            <Text variant="muted" className="text-xs">
              {sub}
            </Text>
          ) : null}
        </View>
      </CardContent>
    </Card>
  );
}

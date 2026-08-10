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
import { SleepOnboarding } from "@/src/components/app/sleep-onboarding-modal";
import { useSleepLogs, useSleepLogCount, useSleepStats } from "@/src/features/sleep/queries";
import { useSession } from "@/src/providers/session-provider";
import { cn } from "@/lib/utils";
import { HOME_COLUMN } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { formatAtOffset } from "@/src/utils/date";
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
  const roomStyle = useRoomStyle("ink");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: logs } = useSleepLogs(userId, 50);
  // Exact lifetime total for the hero - the list above is capped at 50, so its length
  // would freeze the displayed "nights" count once a user passes that many logs.
  const { data: totalNights } = useSleepLogCount(userId);
  // Every summary below used to be computed from that same capped list, so each was
  // really a "newest 50 logs" figure sitting next to an exact lifetime night count: the
  // longest/shortest night and the weekday averages truncated past 50 logs, and the 7-
  // and 30-day windows truncated once more than 50 logs fell inside them (#256).
  const { data: stats } = useSleepStats(userId);
  const [forceOnboarding, setForceOnboarding] = useState(false);

  const allLogs = logs ?? [];
  // The loaded logs stand in only until the server stats arrive (`undefined` while
  // loading); once they do they win, including a genuine null for "no nights in that
  // window", which is not the same as a zero-hour average.
  const sevenDayDuration = stats
    ? stats.sevenDayDurationMinutes
    : averageDurationMinutes(allLogs, 7);
  const thirtyDayDuration = stats
    ? stats.thirtyDayDurationMinutes
    : averageDurationMinutes(allLogs, 30);
  const sevenDayQuality = stats ? stats.sevenDayQuality : averageQuality(allLogs, 7);
  const thirtyDayQuality = stats ? stats.thirtyDayQuality : averageQuality(allLogs, 30);
  const { longest, shortest } = stats
    ? { longest: stats.longestMinutes, shortest: stats.shortestMinutes }
    : extremes(allLogs);
  const distribution = stats ? stats.qualityDistribution30 : qualityDistribution(allLogs, 30);
  const weekly = stats ? stats.weekdayAverageMinutes : weekdayAverages(allLogs);
  // Left on the capped list deliberately: the chart draws the newest 14 nights, which the
  // 50-log query always covers, so there is nothing here for a server aggregate to fix.
  const nights14 = recentNights(allLogs, 14);
  // ISO timestamps sort lexically, so the max is the latest log regardless of
  // the list's own ordering.
  const lastLog = allLogs.reduce<(typeof allLogs)[number] | null>(
    (latest, log) => (latest === null || log.loggedAt > latest.loggedAt ? log : latest),
    null,
  );
  const lastWhen = lastLog ? formatAtOffset(lastLog.loggedAt, lastLog.loggedOffsetMinutes) : null;
  // `logs` is undefined while loading and after a failed fetch with no cache -
  // only an actually-loaded (possibly empty) history may claim "no sleep
  // logged", or a returning user's history reads as erased.
  const subline = lastWhen
    ? t("stats.last", { when: lastWhen })
    : logs
      ? t("stats.never")
      : undefined;

  return (
    <>
      <SleepOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <ScrollView contentContainerClassName="grow p-4">
          <View className={cn(HOME_COLUMN, "gap-6")}>
            <ModuleHomeHeader
              addWidgetCategory="sleep"
              title={t("title")}
              tourScope="sleep"
              description={t("description")}
              actions={[
                { type: "notifications", targetKey: "sleep" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              stats={[
                { value: formatHours(sevenDayDuration), label: t("hero.avg") },
                {
                  value: sevenDayQuality !== null ? `${sevenDayQuality}/5` : "-",
                  label: t("hero.quality"),
                },
                {
                  value: String(totalNights ?? allLogs.length),
                  label: t("hero.entries", { count: totalNights ?? allLogs.length }),
                },
                // The old ToolStats.subline, folded into the row as a value-less
                // item - which is how the design renders "last logged 4:50 pm".
                ...(subline ? [{ value: "", label: subline }] : []),
              ]}
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
                  value={longest !== null ? formatDuration(longest) : "-"}
                />
                <StatTile
                  label={t("stats.shortest")}
                  value={shortest !== null ? formatDuration(shortest) : "-"}
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
    <Card variant="soft" className="min-w-[150px] flex-1 basis-[150px]">
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

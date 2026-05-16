import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  computeMeditationInsights,
  type MeditationInsights,
} from "@/src/features/meditation/insights";
import type { MeditationSession } from "@/src/features/meditation/types";

interface Props {
  sessions: MeditationSession[];
}

const MIN_SESSIONS_TO_SHOW = 5;

export function MeditationInsightsCard({ sessions }: Props) {
  const { t } = useTranslation("meditation");

  if (sessions.length < MIN_SESSIONS_TO_SHOW) return null;

  const insights = computeMeditationInsights(sessions);

  return (
    <Card>
      <CardContent className="gap-3 pt-6">
        <CardTitle>{t("module.insights.title")}</CardTitle>
        <Text variant="muted" className="text-sm">
          {t("module.insights.subtitle")}
        </Text>

        <View className="gap-2 pt-2">
          <InsightRow
            label={t("module.insights.totalSessions")}
            value={t("module.insights.sessionCount", { count: insights.totalSessions })}
          />
          <InsightRow
            label={t("module.insights.totalMinutes")}
            value={t("module.insights.minuteCount", { count: insights.totalMinutes })}
          />
          <InsightRow
            label={t("module.insights.longestSit")}
            value={t("module.insights.minuteCount", { count: insights.longestSitMinutes })}
          />
          {insights.averageMoodAfter !== null ? (
            <InsightRow
              label={t("module.insights.avgMood")}
              value={`${insights.averageMoodAfter.toFixed(1)} / 10`}
            />
          ) : null}
        </View>

        {insights.stageDistribution.length > 0 ? (
          <View className="gap-2 pt-2">
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("module.insights.stageBreakdown")}
            </Text>
            {insights.stageDistribution.map((entry) => (
              <InsightRow
                key={entry.stage}
                label={t("module.insights.stageLabel", { stage: entry.stage })}
                value={t("module.insights.stageValue", {
                  sessions: entry.sessionCount,
                  minutes: entry.totalMinutes,
                })}
              />
            ))}
          </View>
        ) : null}

        {insights.mindWanderingTrend !== null ? (
          <View className="pt-2">
            <Text variant="muted" className="text-xs">
              {t(mindWanderingMessageKey(insights), {
                count: Math.abs(Math.round(insights.mindWanderingTrend * 10) / 10),
              })}
            </Text>
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}

function mindWanderingMessageKey(insights: MeditationInsights): string {
  const trend = insights.mindWanderingTrend ?? 0;
  if (trend < -0.5) return "module.insights.mindWanderingDown";
  if (trend > 0.5) return "module.insights.mindWanderingUp";
  return "module.insights.mindWanderingFlat";
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline justify-between gap-3">
      <Text variant="muted" className="text-sm">
        {label}
      </Text>
      <Text className="text-sm font-semibold">{value}</Text>
    </View>
  );
}

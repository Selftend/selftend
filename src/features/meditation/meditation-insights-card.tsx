import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import type { MeditationWindowInsights } from "@/src/features/meditation/insights";

interface Props {
  insights: MeditationWindowInsights;
  /** How many days the window covers - stated on the card, since nothing else says. */
  windowDays: number;
}

/**
 * What you've been sitting with, over the recent window (#853).
 *
 * Rebuilt on inputs that still accrue: the redesigned reflection (#786) stopped
 * collecting the stage-conditional TMI probes, so the old card's mood average
 * and mind-wandering trend were going null for all new activity. What survives
 * is what the window plainly held - sits, time, and the obstacles tagged.
 *
 * Deliberately no window-over-window comparison and no trend arrows: the card
 * is informational, not evaluative. The lifetime rows the old card carried
 * (longest sit, stage distribution) are gone with it - the hero already states
 * the lifetime record, and ten stage rows made the card a table, not a note.
 */
export function MeditationInsightsCard({ insights, windowDays }: Props) {
  const { t } = useTranslation("meditation");

  return (
    <Card variant="soft">
      <CardContent className="gap-3 pt-6">
        <CardTitle aria-level={2}>{t("module.insights.title")}</CardTitle>
        <Text variant="muted" className="text-sm">
          {t("module.insights.subtitle", { count: windowDays })}
        </Text>

        <View className="gap-2 pt-2">
          <InsightRow
            label={t("module.insights.totalSessions")}
            value={t("module.insights.sessionCount", { count: insights.sessionCount })}
          />
          <InsightRow
            label={t("module.insights.totalMinutes")}
            value={t("module.insights.minuteCount", { count: insights.totalMinutes })}
          />
        </View>

        {insights.topObstacles.length > 0 ? (
          <View className="gap-2 pt-2">
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("module.insights.obstaclesLabel")}
            </Text>
            {insights.topObstacles.map((entry) => (
              <InsightRow
                key={entry.tag}
                label={t(`module.obstacles.${entry.tag}`)}
                // The count is "tagged in N sits", so the sit plural is the
                // right noun - no dedicated key needed.
                value={t("module.insights.sessionCount", { count: entry.count })}
              />
            ))}
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
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

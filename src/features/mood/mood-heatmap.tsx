import { useMemo, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { MOOD_EMOJI_BY_SCORE } from "@/src/components/app/mood-scale";
import { Heatmap, type HeatmapColumn } from "@/src/components/charts/heatmap";
import { Text } from "@/src/components/react-native-reusables/text";
import { buildMoodHeatmapWeeks } from "@/src/features/mood/heatmap-data";
import { ALL_TIME_FROM_ISO, useMoodScorePoints } from "@/src/features/mood/queries";
import { useAccentRamp } from "@/src/lib/theme-palette";
import { parseLocalNoon } from "@/src/utils/date";

interface MoodHeatmapProps {
  userId: string | null;
}

/**
 * The mood map: weeks-as-columns cells colored by the day's rounded
 * average score on the accent ramp (the active style's `--primary`, #924 —
 * pinned `be` pink before that). A glance view — tapping a cell only reveals a
 * read-only callout (date · face · score word), never navigation.
 *
 * Always the whole history (#899 reverted #880's range bounds): the
 * horizontal scroller, anchored at the newest column, is how the past is
 * reached.
 */
export function MoodHeatmap({ userId }: MoodHeatmapProps) {
  const { t, i18n } = useTranslation("mood");
  const { data: scorePoints } = useMoodScorePoints(userId, ALL_TIME_FROM_ISO);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const ramp = useAccentRamp();
  const weeks = useMemo(
    () => buildMoodHeatmapWeeks(scorePoints, i18n.language),
    [scorePoints, i18n.language],
  );

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short", year: "numeric" }),
    [i18n.language],
  );

  const { columns, scoreByDay } = useMemo(() => {
    const byDay = new Map<string, number>();
    const cols: HeatmapColumn[] = weeks.map((week, w) => ({
      key: week.days.find((d) => d !== null)?.dateKey ?? `week-${w}`,
      monthLabel: week.monthLabel,
      cells: week.days.map((day) => {
        if (day === null) return null;
        if (day.score !== null) byDay.set(day.dateKey, day.score);
        const dayLabel = dateFmt.format(parseLocalNoon(day.dateKey));
        return {
          key: day.dateKey,
          color: day.score === null ? null : ramp[day.score - 1],
          accessibilityLabel:
            day.score === null
              ? t("week.dayNoEntry", { day: dayLabel })
              : t("week.dayScore", { day: dayLabel, score: t(`checkin.scaleLabels.${day.score}`) }),
        };
      }),
    }));
    return { columns: cols, scoreByDay: byDay };
  }, [weeks, ramp, dateFmt, t]);

  if (weeks.length === 0) {
    return (
      <Text variant="muted" className="text-[13px]">
        {t("heatmap.empty")}
      </Text>
    );
  }

  const selectedScore = selectedKey !== null ? scoreByDay.get(selectedKey) : undefined;

  return (
    <View className="gap-3">
      <Heatmap
        columns={columns}
        selectedKey={selectedKey}
        onCellPress={(key) => setSelectedKey((prev) => (prev === key ? null : key))}
      />
      {selectedKey !== null ? (
        <Text className="text-[13px]">
          {dateFmt.format(parseLocalNoon(selectedKey))} ·{" "}
          {selectedScore !== undefined
            ? `${MOOD_EMOJI_BY_SCORE[selectedScore]} · ${t(`checkin.scaleLabels.${selectedScore}`)}`
            : t("heatmap.calloutNoEntry")}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
        {([1, 2, 3, 4, 5] as const).map((score) => (
          <View key={score} className="flex-row items-center gap-1">
            <View
              style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: ramp[score - 1] }}
            />
            <Text variant="muted" className="text-[11px]">
              {t(`checkin.scaleLabels.${score}`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

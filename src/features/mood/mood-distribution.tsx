import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { accentRampClass } from "@/src/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { MoodDistribution } from "@/src/features/mood/summaries";

interface MoodDistributionChartProps {
  counts: MoodDistribution;
}

/**
 * How many check-ins landed at each of the five levels, over this section's
 * range — the design's stacked pill (#881, amending #701 on form while keeping
 * its constraints).
 *
 * **The accent ramp, not the design's five hues.** The five-hue mapping stays
 * rejected on measurement (#701: non-monotonic 2.60–3.56 against the
 * background, adjacent 1.28–1.51, deuteranopia 1.01) and on #691's rule that
 * hue encodes data, not identity. The fill is the same score→step ramp the
 * heatmap reads, so the two surfaces agree; the ramp is monotonic, so
 * Rough→Great carries an ordinal cue the five hues never did. It rides the
 * active style's accent since #924 (it was pinned to the `be` pink before,
 * which clashed with every non-default style — the encoding is `relative`,
 * so the hue was never the meaning).
 *
 * **Non-colour cues, mandatory per #691:** position along the bar (left→right
 * = worst→best), a 1px hairline between adjacent segments, and the counted
 * legend. Counts, not percentages (#701 upheld — "33%" from three check-ins
 * claims precision the data has not earned).
 *
 * **Zero-count levels take no bar width** but keep their legend entry with
 * `· 0` — absence is absence, never a faint swatch read as a small value
 * (#691's measured-invisible constraint).
 */
export function MoodDistributionChart({ counts }: MoodDistributionChartProps) {
  const { t } = useTranslation("mood");
  // The hairline separates ADJACENT VISIBLE segments, so "first" means the
  // first level with a count — zero-width levels don't own a boundary.
  const firstVisible = counts.findIndex((count) => count > 0);

  return (
    <View className="gap-3.5">
      <View className="h-2.5 flex-row overflow-hidden rounded-full bg-muted/50">
        {counts.map((count, index) => {
          if (count === 0) return null;
          const score = index + 1;
          const word = t(`checkin.scaleLabels.${score}`);
          return (
            <View
              key={score}
              accessible
              accessibilityLabel={t("distribution.column", { level: word, count })}
              style={{ flexGrow: count, flexBasis: 0 }}
              className={cn(
                accentRampClass(score),
                index !== firstVisible && "border-l border-border",
              )}
            />
          );
        })}
      </View>
      <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
        {counts.map((count, index) => {
          const score = index + 1;
          const word = t(`checkin.scaleLabels.${score}`);
          return (
            <View key={score} className="flex-row items-center gap-1.5">
              <View className={cn("h-2.5 w-2.5 rounded-[3px]", accentRampClass(score))} />
              <Text variant="muted" className="text-xs tabular-nums">
                {word} · {count}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

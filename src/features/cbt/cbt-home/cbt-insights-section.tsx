import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Section } from "@/src/components/app/section";
import { ShowAllLink } from "@/src/components/app/show-all-link";
import { Text } from "@/src/components/react-native-reusables/text";
import type { InsightCardModel } from "./build-insight-cards";
import { InsightCard } from "./insight-card";
import type { DistortionCount } from "@/src/features/cbt/use-cbt-insights";

interface CbtInsightsSectionProps {
  bars: DistortionCount[];
  cards: InsightCardModel[];
  ruled: boolean;
}

/**
 * The insights section: the thinking-pattern bars first (#1387, replacing the
 * old top-distortion prose card), then the other insight card kinds, each
 * still gated on its own datum.
 *
 * The gate is bars OR cards: with the bars replacing the card, hiding the
 * section on an empty card list would hide a user's pattern counts whenever
 * the other seven kinds are silent - the common case at five to ten records.
 *
 * The section's action is a second door to the patterns reference (the Think
 * pillar's "Thinking patterns" tool is the first): a catalogue entry and a
 * reading suggestion are different registers, so both stay (#1229's rule). The
 * label deliberately asserts no count (SR-3) - the drawn "Read the twelve
 * patterns" was false on arrival, seventeen ship today.
 */
export function CbtInsightsSection({ bars, cards, ruled }: CbtInsightsSectionProps) {
  const { t } = useTranslation("cbt");

  if (bars.length === 0 && cards.length === 0) {
    return null;
  }

  const maxCount = bars[0]?.count ?? 0;

  return (
    <Section
      ruled={ruled}
      title={t("dashboard.insights.title")}
      action={<ShowAllLink label={t("home.distortionGuide")} route="/modules/cbt/learn" />}
      className="gap-3"
    >
      {bars.length > 0 ? (
        <View className="gap-2.5">
          {bars.map((bar) => (
            <View key={bar.key} className="gap-1">
              <View className="flex-row items-baseline justify-between gap-3">
                <Text className="shrink text-sm text-foreground">
                  {t(`distortions.${bar.key}.title`, { defaultValue: bar.key })}
                </Text>
                {/* A bare count, like the header stats' values: numbers are not
                    translatable strings, and the name beside it is the label. */}
                <Text className="text-sm font-medium text-foreground">{bar.count}</Text>
              </View>
              {/* Decorative: the name + count above are the reading. Fill is
                  `bg-primary` on a muted track (`AlignmentBar`'s idiom; a
                  muted-only bar on this surface is invisible, #725) - neutral
                  chrome plus the app accent, never a module hue (#1221). */}
              <View aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted">
                <View
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(bar.count / Math.max(maxCount, 1)) * 100}%` }}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {cards.map((card) => (
        <InsightCard key={card.key} title={card.title} description={card.description} />
      ))}
    </Section>
  );
}

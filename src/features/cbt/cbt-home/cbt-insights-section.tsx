import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import type { InsightCardModel } from "./build-insight-cards";
import { InsightCard } from "./insight-card";

interface CbtInsightsSectionProps {
  cards: InsightCardModel[];
}

export function CbtInsightsSection({ cards }: CbtInsightsSectionProps) {
  const { t } = useTranslation("cbt");

  if (cards.length === 0) {
    return null;
  }

  return (
    <View className="gap-3">
      <Text variant="h3">{t("dashboard.insights.title")}</Text>
      {cards.map((card) => (
        <InsightCard key={card.key} title={card.title} description={card.description} />
      ))}
    </View>
  );
}

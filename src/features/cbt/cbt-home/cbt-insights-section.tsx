import { useTranslation } from "react-i18next";

import { Section } from "@/src/components/app/section";
import type { InsightCardModel } from "./build-insight-cards";
import { InsightCard } from "./insight-card";

interface CbtInsightsSectionProps {
  cards: InsightCardModel[];
  ruled: boolean;
}

export function CbtInsightsSection({ cards, ruled }: CbtInsightsSectionProps) {
  const { t } = useTranslation("cbt");

  if (cards.length === 0) {
    return null;
  }

  return (
    <Section ruled={ruled} title={t("dashboard.insights.title")} className="gap-3">
      {cards.map((card) => (
        <InsightCard key={card.key} title={card.title} description={card.description} />
      ))}
    </Section>
  );
}

import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { HairlineRow } from "@/src/components/app/hairline-row";
import { Section } from "@/src/components/app/section";
import { ShowAllLink } from "@/src/components/app/show-all-link";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import type { Goal } from "@/src/features/goals/types";

interface ActiveGoalsSectionProps {
  goals: Goal[];
  ruled: boolean;
}

/**
 * The overview's active goals (#1386).
 *
 * Its door used to be a ghost `Button` reading "See all" while the records door
 * two sections below said "Show all …" - two door vocabularies on one screen.
 * Both are `ShowAllLink` now, and this one names what it opens.
 *
 * The rows moved off `AccessibleCardLink` with the recent records and the
 * history screen: a card per goal directly beneath a hairline section reads as a
 * panel inside a list. See that component's docblock for which consumers stayed.
 */
export function ActiveGoalsSection({ goals, ruled }: ActiveGoalsSectionProps) {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("cbt");

  if (goals.length === 0) {
    return null;
  }

  return (
    <Section
      ruled={ruled}
      title={t("dashboard.activeGoals")}
      action={<ShowAllLink label={t("dashboard.seeAll")} route="/modules/cbt/goals" />}
    >
      <View>
        {goals.map((goal) => (
          <HairlineRow
            key={goal.id}
            title={goal.title}
            onPress={() => pushWithOrigin(`/modules/cbt/goals/${goal.id}`)}
            meta={
              <Text variant="muted" className="text-xs">
                {t(`goals.domain.${goal.lifeDomain}`)}
              </Text>
            }
          />
        ))}
      </View>
    </Section>
  );
}

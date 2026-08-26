import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { Section } from "@/src/components/app/section";
import { ShowAllLink } from "@/src/components/app/show-all-link";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
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
          // No explicit accessible name: the title and the life domain are both
          // part of what this row says, and an `accessibilityLabel` would hide
          // the second of them from assistive tech on the web.
          <Pressable
            key={goal.id}
            accessibilityRole="button"
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={() => pushWithOrigin(`/modules/cbt/goals/${goal.id}`)}
            className="flex-row items-center gap-4 border-t border-border py-4 active:bg-accent/40"
            role="button"
          >
            <View className="flex-1 gap-1">
              <Text className="font-semibold leading-snug" numberOfLines={2}>
                {goal.title}
              </Text>
              <Text variant="muted" className="text-xs">
                {t(`goals.domain.${goal.lifeDomain}`)}
              </Text>
            </View>
            <Icon name="chevron-right" className="size-4 shrink-0 text-muted-foreground" />
          </Pressable>
        ))}
      </View>
    </Section>
  );
}

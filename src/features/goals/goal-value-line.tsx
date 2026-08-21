import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Text } from "@/src/components/react-native-reusables/text";

/**
 * The one line that says what a goal is anchored to, or null when it is anchored
 * to nothing (#1291).
 *
 * Split out from the component so the goals list can pass the same sentence as the
 * card's accessibility hint: the card's `accessibilityLabel` is the goal title, and
 * on both platforms that label replaces the card's contents for a screen reader, so
 * a value rendered only as a child would be seen by sighted users alone.
 *
 * The label is looked up in the static value list's own translations - the same
 * `personalValues.*` keys the values screen renders. Nothing here reads the user's
 * values profile, which is what makes a demoted value a non-event: there is no
 * priority list to compare against, so there is nothing to warn about and nothing
 * to clear.
 */
export function goalValueText(t: TFunction<"cbt">, valueKey: string | null): string | null {
  if (!valueKey) return null;
  return t("goals.valueAnchor", { value: t(`personalValues.${valueKey}.label`) });
}

interface GoalValueLineProps {
  valueKey: string | null;
  className?: string;
}

/**
 * A goal's value, on the detail view and on its row in the goals list (#1291).
 *
 * One shared line rather than a treatment per surface, so the two can never drift
 * into saying different things about the same record. It names itself - "Guiding
 * value: Courageous" - because the value is an adjective, and a bare adjective chip
 * sitting beside the goal's life domain and type would read as a third taxonomy
 * rather than as the reason the goal was set.
 *
 * Renders nothing at all when there is no value: an anchor is optional, and the
 * programme's first week sets goals before it clarifies values, so an empty slot
 * or a placeholder would put a hole in the majority of goals rather than in a rare
 * few.
 */
export function GoalValueLine({ valueKey, className }: GoalValueLineProps) {
  const { t } = useTranslation("cbt");
  const text = goalValueText(t, valueKey);

  if (!text) return null;

  return <Text className={cn("text-sm text-muted-foreground", className)}>{text}</Text>;
}

import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Text } from "@/src/components/react-native-reusables/text";
import { personalValuesList } from "@/src/constants/personal-values-list";

/**
 * The keys a goal may be anchored to.
 *
 * `value_key` is free text to Postgres and `string | null` in TypeScript, and the
 * label is looked up by interpolating the key into a translation path - so a key the
 * static list does not carry would render the raw path, `personalValues.foo.label`,
 * straight to the user. Checking against the list the labels come from is what stops
 * that.
 */
const VALUE_KEYS = new Set(personalValuesList.map((value) => value.key));

/**
 * The one line that says what a goal is anchored to, or null when it is anchored to
 * nothing - or to something the static value list no longer carries (#1291).
 *
 * Split out from the component so the goals list can build the same sentence into
 * its card's accessible name.
 *
 * Nothing here reads the user's values profile, which is what makes a demoted value
 * a non-event: there is no priority list to compare against, so there is nothing to
 * warn about and nothing to clear.
 */
export function goalValueText(t: TFunction<"cbt">, valueKey: string | null): string | null {
  if (!valueKey || !VALUE_KEYS.has(valueKey)) return null;
  return t("goals.valueAnchor", { value: t(`personalValues.${valueKey}.label`) });
}

/**
 * The accessible name for a goal's row in the goals list.
 *
 * The value has to be part of the NAME rather than an `accessibilityHint`, for two
 * reasons pointing the same way. The row sets its name explicitly, and an explicit
 * name replaces the row's contents for a screen reader - so the value line inside it
 * is never read out. And `react-native-web` does not implement `accessibilityHint`
 * at all (see the note in `mood/manage-emotions-modal.tsx`), so a hint would carry
 * this on native and silently drop it on web, which is the platform the suite
 * actually exercises. `docs/accessibility.md` also reserves the hint for what an
 * action will do, which this is not.
 *
 * Composed with a literal separator, as `values.tsx` already composes a value's
 * label with its tier.
 */
export function goalRowAccessibleName(
  t: TFunction<"cbt">,
  title: string,
  valueKey: string | null,
): string {
  const text = goalValueText(t, valueKey);
  return text ? `${title}, ${text}` : title;
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

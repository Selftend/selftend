import { router } from "expo-router";
import { Pressable } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

/**
 * The entrance to the sleep all-history screen (#696 pattern, adopted on #775).
 *
 * Two surfaces carry it: the overview's recent-entries section header (beside
 * the list it extends), and the foot of entry detail (the way back out to
 * everything else once you have read one entry). Shared so the two never drift
 * into two different words for the same door.
 */
export function ShowAllSleepLink() {
  const { t } = useTranslation("sleep");

  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push("/tools/sleep/history")}
      className="flex-row items-center gap-1 active:opacity-70"
      role="link"
    >
      <Text className="text-[13px] font-semibold text-primary-ink">{t("allHistory.link")}</Text>
      <Icon name="arrow-forward" className="size-3.5 text-primary-ink" />
    </Pressable>
  );
}

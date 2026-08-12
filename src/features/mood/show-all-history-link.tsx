import { router } from "expo-router";
import { Pressable } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

/**
 * The entrance to the all-history screen (#696).
 *
 * Two surfaces carry it. On the overview it sits with the week strip, because the
 * strip is check-in's recency view and the link belongs with it rather than under a
 * duplicate list of recent entries. On entry detail (#741) it sits at the foot, as
 * the way back out to everything else once you have read one entry.
 *
 * Shared so the two never drift into two different words for the same door.
 */
export function ShowAllHistoryLink() {
  const { t } = useTranslation("mood");

  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push("/tools/check-in/history")}
      className="flex-row items-center gap-1 active:opacity-70"
      role="link"
    >
      <Text className="text-[13px] font-semibold text-primary-ink">{t("allHistory.link")}</Text>
      <Icon name="arrow-forward" className="size-3.5 text-primary-ink" />
    </Pressable>
  );
}

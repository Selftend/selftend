import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { SleepEntryRow } from "@/src/features/sleep/sleep-entry-row";
import { formatRelativeDayKey } from "@/src/utils/relative-time";
import type { SleepLog } from "@/src/features/sleep/types";

/** The design draws five recent rows; everything older lives on all-history. */
const RECENT_COUNT = 5;

/**
 * The overview's recent entries as hairline rows (#775). The old expandable
 * card list (`Show all (N)` in place) went with `Load 5 more`: an overview that
 * expands in place has no honest end, so depth moved to the paged all-history
 * screen and this list stays exactly five rows deep.
 */
export function SleepRecentList({ logs }: { logs: SleepLog[] }) {
  const { t } = useTranslation("sleep");

  if (logs.length === 0) {
    return <Text variant="muted">{t("recent.empty")}</Text>;
  }

  // Same ordering as the all-history screen (entry day, then creation time,
  // #800), so the five rows here are exactly the first five rows there.
  const sorted = [...logs].sort((a, b) =>
    a.entryDay === b.entryDay
      ? a.createdAt < b.createdAt
        ? 1
        : -1
      : a.entryDay < b.entryDay
        ? 1
        : -1,
  );

  return (
    <View>
      {sorted.slice(0, RECENT_COUNT).map((log) => (
        <SleepEntryRow
          key={log.id}
          entry={log}
          className="border-t border-border"
          // The summary block above groups by dayKey; label in the same frame (#433 §2).
          when={formatRelativeDayKey(log.dayKey, t)}
        />
      ))}
      {/* Closing hairline: the rows are top-ruled, so the last one needs a floor. */}
      <View className="border-t border-border" />
    </View>
  );
}

import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { selectRecordTitle } from "@/src/features/cbt/select-record-title";
import { resolveHotThought } from "@/src/features/cbt/thought-record-form";
import type { ThoughtRecord } from "@/src/features/cbt/types";
import { formatTimestamp } from "@/src/utils/date";

interface ThoughtRecordRowProps {
  record: ThoughtRecord;
  onPress: () => void;
}

/**
 * One thought record as a hairline row (#1386). Used by the CBT overview's
 * recent records AND by the history screen behind its door - converting only
 * the overview would change the row shape mid-journey, so both sit on this
 * component.
 *
 * ☠️ It carries **no explicit `accessibilityLabel`**: its children are its
 * accessible name. An explicit label hides the children from assistive tech on
 * the web, which would silence the belief pair - the same trap that disqualified
 * `AccessibleCardLink` here, whose `description` becomes an
 * `accessibilityHint` that react-native-web never implements.
 *
 * The meta line reads "Updated", not a bare date. `listThoughtRecords` orders by
 * `updated_at`, so this list is "recently touched" rather than "recently
 * written" - a bare date would present somebody's edit as the moment they wrote
 * the thought.
 *
 * The belief pair is **omitted when either number is null**, never dashed: it is
 * the gate the completion screen already applies, and `belief_after` is a column
 * added late enough (#1376) that every older record is null on both counts.
 */
export function ThoughtRecordRow({ record, onPress }: ThoughtRecordRowProps) {
  const { t } = useTranslation("cbt");

  const beliefBefore = resolveHotThought(record.nats)?.beliefRating ?? null;
  const beliefAfter = record.beliefAfter ?? null;
  const hasBeliefPair = beliefBefore !== null && beliefAfter !== null;

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className="flex-row items-center gap-4 border-t border-border py-4 active:bg-accent/40"
      role="button"
    >
      <View className="flex-1 gap-1">
        {/* Clamped at two lines: a thought is free text and the row is a row. */}
        <Text className="font-semibold leading-snug" numberOfLines={2}>
          {selectRecordTitle(record, t("history.untitledRecord"))}
        </Text>
        <View className="flex-row flex-wrap items-center gap-x-2">
          {hasBeliefPair ? (
            // One interpolated string rather than a "Belief" + "85 -> 40" pair:
            // split into two nodes it is an unorderable fragment for a
            // translator, and the arrow's direction is not universal.
            <Text className="text-xs text-foreground">
              {t("history.beliefShift", { before: beliefBefore, after: beliefAfter })}
            </Text>
          ) : null}
          <Text variant="muted" className="text-xs">
            {t("history.updated", { timestamp: formatTimestamp(record.updatedAt) })}
          </Text>
        </View>
      </View>
      <Icon name="chevron-right" className="size-4 shrink-0 text-muted-foreground" />
    </Pressable>
  );
}

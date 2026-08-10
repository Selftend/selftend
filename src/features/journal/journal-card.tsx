import { memo } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { formatRelativeDayKey } from "@/src/utils/relative-time";
import { countWords } from "@/src/features/journal/word-count";
import type { JournalEntry } from "@/src/features/journal/types";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

function firstLine(body: string) {
  const trimmed = body.trim();
  const idx = trimmed.indexOf("\n");
  return idx === -1 ? trimmed : trimmed.slice(0, idx);
}

interface JournalCardProps {
  entry: JournalEntry;
  /** Timestamp already shaped for the row's group (time, weekday + time, or date). */
  when?: string;
  // Takes the id (not a per-row closure) so callers can pass ONE stable callback,
  // letting the memo skip re-rendering all cards on an unrelated parent re-render.
  onOpen: (id: string) => void;
}

export const JournalCard = memo(function JournalCard({
  entry,
  when: whenProp,
  onOpen,
}: JournalCardProps) {
  const { t } = useTranslation("journal");
  // Labelled in the captured day frame, matching the dayKey these cards group by.
  const when = whenProp ?? formatRelativeDayKey(entry.dayKey, t);
  const title = entry.title.trim().length > 0 ? entry.title.trim() : t("list.untitled");
  const preview = firstLine(entry.body);
  const words = countWords(entry.body);

  return (
    <Pressable
      accessibilityLabel={t("list.viewEntry", { when })}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => onOpen(entry.id)}
      className="border-b border-border py-3 active:opacity-80"
    >
      <View className="flex-row gap-3">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="w-[3px] self-stretch rounded-full bg-primary"
        />
        <View className="min-w-0 flex-1 justify-center">
          <Text className="text-[15px] font-semibold tracking-tight" numberOfLines={1}>
            {title}
          </Text>
          {preview.length > 0 ? (
            <Text variant="muted" numberOfLines={1} className="mt-1 text-[13px] leading-5">
              {preview}
            </Text>
          ) : null}
        </View>
        <View className="w-[92px] shrink-0 items-end justify-center gap-1">
          <Text variant="muted" className="text-right text-[11px] tabular-nums" numberOfLines={1}>
            {when}
          </Text>
          <Text variant="muted" className="text-right text-[11px] tabular-nums" numberOfLines={1}>
            {t("hero.words", { count: words })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

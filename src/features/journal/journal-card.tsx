import { memo } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
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
  // Takes the id (not a per-row closure) so callers can pass ONE stable callback,
  // letting the memo skip re-rendering all cards on an unrelated parent re-render.
  onOpen: (id: string) => void;
}

export const JournalCard = memo(function JournalCard({ entry, onOpen }: JournalCardProps) {
  const { t } = useTranslation("journal");
  const when = formatMoodRelativeTime(entry.createdAt, t);
  const title = entry.title.trim().length > 0 ? entry.title.trim() : t("list.untitled");
  const preview = firstLine(entry.body);
  const words = countWords(entry.body);

  return (
    <Pressable
      accessibilityLabel={t("list.viewEntry", { when })}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => onOpen(entry.id)}
    >
      <Card spine="ink" className="px-5 py-4 gap-0">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className="flex-1 text-base font-semibold tracking-tight" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="muted" className="text-xs">
            {when}
          </Text>
        </View>
        {preview.length > 0 ? (
          <Text variant="muted" numberOfLines={2} className="mt-1.5 text-[13px] leading-relaxed">
            {preview}
          </Text>
        ) : null}
        <Text variant="muted" className="mt-2.5 text-[11px] tabular-nums">
          {t("hero.words", { count: words })}
        </Text>
      </Card>
    </Pressable>
  );
});

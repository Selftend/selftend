import { memo } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { MOOD_EMOJI_BY_SCORE } from "@/src/components/app/mood-scale";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { formatHistoryWhen, type HistorySectionKind } from "@/src/features/mood/history-groups";
import type { EmotionDisplay } from "@/src/features/mood/use-emotion-display";
import type { MoodLog } from "@/src/features/mood/types";

/** Emotions named on the row before the rest collapse into a `+N`. */
const NAMED_EMOTIONS = 3;

interface MoodHistoryRowProps {
  entry: MoodLog;
  kind: HistorySectionKind;
  language: string;
  // Hoisted to the screen so the whole list runs ONE emotion-preferences query and
  // builds ONE lookup map, instead of one per row.
  resolveEmotion: (id: string) => EmotionDisplay;
}

/**
 * One check-in on the all-history screen — the design's day-panel row, plus a
 * note preview (#696).
 *
 * Not `MoodEntryCard`: this screen drops the card container and shadow (the
 * quiet scale from #690), the tinted score circle (it re-encodes the score
 * already sitting beside it as a numeral), and the `Badge` chips (dot-separated
 * text instead, so the emotions fit one line at 360dp).
 *
 * The note line is the one deliberate deviation from the design, and it is not
 * taste: `notes` is ciphertext at rest, so text search over it is permanently
 * impossible — on the one screen built for finding an old entry, the note is the
 * only *content* cue a person has.
 */
function MoodHistoryRowComponent({ entry, kind, language, resolveEmotion }: MoodHistoryRowProps) {
  const { t } = useTranslation("mood");

  const when = formatHistoryWhen(entry, kind, language);
  const named = entry.emotions.slice(0, NAMED_EMOTIONS).map((id) => resolveEmotion(id).name);
  const remaining = entry.emotions.length - named.length;
  const emotionLine = [...named, ...(remaining > 0 ? [`+${remaining}`] : [])].join(" · ");
  const note = entry.notes.trim();
  const scoreWord = t(`checkin.scaleLabels.${entry.moodScore}`);

  return (
    <Pressable
      accessibilityHint={note || undefined}
      accessibilityLabel={t("allHistory.viewEntry", { when, score: scoreWord })}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(`/tools/check-in/${entry.id}`)}
      className="flex-row items-center gap-3 px-0.5 py-2.5 active:bg-accent/40"
      role="button"
    >
      <Text className="text-xl leading-none">{MOOD_EMOJI_BY_SCORE[entry.moodScore] ?? ""}</Text>

      <View className="min-w-0 flex-1 gap-px">
        <Text className="text-[13.5px] font-semibold">
          {scoreWord} · {entry.moodScore}
        </Text>
        {emotionLine ? (
          <Text variant="muted" className="text-[12.5px]" numberOfLines={1}>
            {emotionLine}
          </Text>
        ) : null}
        {note ? (
          <Text variant="muted" className="text-[12.5px] italic" numberOfLines={1}>
            {note}
          </Text>
        ) : null}
      </View>

      <Text variant="muted" className="text-xs">
        {when}
      </Text>
      <Icon name="chevron-right" className="size-4 text-muted-foreground" />
    </Pressable>
  );
}

export const MoodHistoryRow = memo(MoodHistoryRowComponent);

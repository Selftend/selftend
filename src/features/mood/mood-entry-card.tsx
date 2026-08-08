import { memo } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { Badge } from "@/src/components/react-native-reusables/badge";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { MOOD_EMOJI_BY_SCORE } from "@/src/components/app/mood-scale";
import type { MoodLog } from "@/src/features/mood/types";
import { formatRelativeDayKey } from "@/src/utils/relative-time";
import type { EmotionDisplay } from "@/src/features/mood/use-emotion-display";
import { scoreToneClass } from "@/src/features/mood/score-tone";

interface MoodEntryCardProps {
  entry: MoodLog;
  // Resolver is hoisted to the list so it runs ONE emotion-preferences query + builds ONE
  // lookup map for the whole history, instead of one per row (200+ on a heavy user).
  resolveEmotion: (id: string) => EmotionDisplay;
}

function MoodEntryCardComponent({ entry, resolveEmotion }: MoodEntryCardProps) {
  const { t } = useTranslation("mood");

  // Label from the captured day, not the instant: the list groups on dayKey, so
  // labelling from the viewer's zone can file this card under YESTERDAY while it
  // reads "Today" (#433 §2).
  const when = formatRelativeDayKey(entry.dayKey, t);
  const emotionDisplays = entry.emotions.slice(0, 3).map(resolveEmotion);
  const remainingEmotions = Math.max(0, entry.emotions.length - emotionDisplays.length);
  const trimmedNotes = entry.notes.trim();

  return (
    <Pressable
      accessibilityHint={trimmedNotes || undefined}
      accessibilityLabel={t("recent.viewEntry", { when })}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(`/tools/check-in/${entry.id}`)}
      className="gap-2 rounded-3xl bg-card p-4 shadow-lg shadow-black/10 dark:shadow-none active:bg-accent/40"
      role="button"
    >
      <View className="flex-row items-center justify-between gap-3">
        <View
          className={cn(
            "size-10 items-center justify-center rounded-full",
            scoreToneClass(entry.moodScore),
          )}
        >
          <Text className="text-xl">{MOOD_EMOJI_BY_SCORE[entry.moodScore] ?? ""}</Text>
        </View>
        <Text className="text-sm font-semibold">{entry.moodScore}</Text>
        <Text variant="muted" className="ml-auto text-xs">
          {when}
        </Text>
      </View>

      {emotionDisplays.length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5">
          {emotionDisplays.map((display) => (
            <Badge key={display.id} variant="secondary">
              <Text className="text-xs">
                {display.emoji} {display.name}
              </Text>
            </Badge>
          ))}
          {remainingEmotions > 0 ? (
            <Badge variant="outline">
              <Text className="text-xs">+{remainingEmotions}</Text>
            </Badge>
          ) : null}
        </View>
      ) : null}

      {trimmedNotes ? (
        <Text variant="muted" numberOfLines={2} className="text-sm">
          {trimmedNotes}
        </Text>
      ) : null}
    </Pressable>
  );
}

export const MoodEntryCard = memo(MoodEntryCardComponent);

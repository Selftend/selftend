import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { Badge } from "@/src/components/react-native-reusables/badge";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { MOOD_EMOJI_BY_SCORE } from "@/src/components/app/mood-scale";
import type { MoodLog } from "@/src/features/mood/types";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { useEmotionDisplay } from "@/src/features/mood/use-emotion-display";

interface MoodEntryCardProps {
  entry: MoodLog;
}

function scoreToneClass(score: number): string {
  switch (score) {
    case 1:
      return "bg-red-500/15";
    case 2:
      return "bg-orange-500/15";
    case 3:
      return "bg-yellow-400/20";
    case 4:
      return "bg-lime-500/15";
    case 5:
      return "bg-green-500/15";
    default:
      return "bg-muted";
  }
}

export function MoodEntryCard({ entry }: MoodEntryCardProps) {
  const { t } = useTranslation("mood");
  const { resolveEmotion } = useEmotionDisplay();

  const when = formatMoodRelativeTime(entry.loggedAt, t);
  const emotionDisplays = entry.emotions.slice(0, 3).map(resolveEmotion);
  const remainingEmotions = Math.max(0, entry.emotions.length - emotionDisplays.length);
  const trimmedNotes = entry.notes.trim();

  return (
    <Pressable
      accessibilityHint={trimmedNotes || undefined}
      accessibilityLabel={t("recent.viewEntry", { when })}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(`/tools/mood-tracker/${entry.id}`)}
      className="gap-2 rounded-2xl border border-border bg-card p-4 active:bg-accent/40"
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

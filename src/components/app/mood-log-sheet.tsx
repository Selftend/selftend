import { ActivityIndicator, Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { NumberRating } from "@/src/components/app/number-rating";
import { emotionOptions } from "@/src/constants/emotions";
import { useSaveMoodLog } from "@/src/features/mood/queries";
import { useSession } from "@/src/providers/session-provider";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

interface MoodLogSheetProps {
  linkedStrategy?: string;
  onClose: () => void;
  onSaved?: (moodScore: number) => void;
  visible: boolean;
}

export function MoodLogSheet({ linkedStrategy, onClose, onSaved, visible }: MoodLogSheetProps) {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const saveMutation = useSaveMoodLog(user?.id ?? null);
  const reduceMotionEnabled = useReduceMotionEnabled();
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!moodScore) return;
    setError("");
    try {
      await saveMutation.mutateAsync({
        moodScore,
        emotions,
        notes,
        linkedStrategy: linkedStrategy ?? null,
      });
      onSaved?.(moodScore);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mood.saveError"));
    }
  };

  const showCrisis = moodScore !== null && moodScore <= 2;

  const toggleEmotion = (emotion: string) => {
    setEmotions((prev) =>
      prev.includes(emotion) ? prev.filter((e) => e !== emotion) : [...prev, emotion],
    );
  };

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onClose}
      visible={visible}
    >
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-6 p-6 pb-12">
          <View className="gap-2">
            <Text variant="h2">{t("mood.title")}</Text>
            <Text variant="muted">{t("mood.description")}</Text>
          </View>

          {showCrisis ? <CrisisSupportCallout /> : null}

          <View className="gap-3">
            <Label>{t("mood.scoreLabel")}</Label>
            <Text variant="muted">{t("mood.scoreHint")}</Text>
            <NumberRating value={moodScore} onChange={setMoodScore} />
          </View>

          <View className="gap-3">
            <Label>{t("mood.emotionsLabel")}</Label>
            {emotionOptions.map((emotion) => {
              const checked = emotions.includes(emotion);
              const label = t(`emotions.${emotion.toLowerCase()}`);
              return (
                <View key={emotion} className="flex-row items-center gap-3">
                  <Checkbox
                    accessibilityLabel={label}
                    checked={checked}
                    onCheckedChange={() => toggleEmotion(emotion)}
                  />
                  <Label onPress={() => toggleEmotion(emotion)}>{label}</Label>
                </View>
              );
            })}
          </View>

          <View className="gap-2">
            <Label>{t("mood.notesLabel")}</Label>
            <Textarea
              accessibilityLabel={t("mood.notesLabel")}
              onChangeText={setNotes}
              placeholder={t("mood.notesPlaceholder")}
              value={notes}
            />
          </View>

          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button onPress={onClose} variant="ghost">
                <Text>{t("mood.cancel")}</Text>
              </Button>
            </View>
            <View className="flex-1">
              <Button
                disabled={!moodScore || saveMutation.isPending}
                onPress={() => void handleSave()}
              >
                {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{t("mood.save")}</Text>
              </Button>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

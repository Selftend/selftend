import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import { PostSit } from "@/src/features/meditation/meditation-session-screen";
import {
  useMeditationProgramState,
  useSaveMeditationSession,
} from "@/src/features/meditation/queries";
import type {
  DistractionLevel,
  DullnessLevel,
  MeditationObstacleTag,
  StageNumber,
} from "@/src/features/meditation/types";
import { useSession } from "@/src/providers/session-provider";

export default function MeditationSessionLogScreen() {
  const { t } = useTranslation("meditation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const params = useLocalSearchParams<{ duration?: string }>();
  const durationMinutes = Math.max(1, Number(params.duration) || 15);

  const { data: programState } = useMeditationProgramState(userId);
  const saveMutation = useSaveMeditationSession(userId);

  const currentStage: StageNumber = (programState?.currentStage ?? 1) as StageNumber;

  const [reflection, setReflection] = useState("");
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [dullness, setDullness] = useState<DullnessLevel | null>(null);
  const [distraction, setDistraction] = useState<DistractionLevel | null>(null);
  const [mindWandering, setMindWandering] = useState<number | null>(null);
  const [obstacleTags, setObstacleTags] = useState<MeditationObstacleTag[]>([]);

  function toggleObstacleTag(tag: MeditationObstacleTag) {
    setObstacleTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function handleSave(skipReflection: boolean) {
    saveMutation.mutate(
      {
        stageAtSession: currentStage,
        durationMinutes,
        techniqueUsed: null,
        reflection: skipReflection ? "" : reflection,
        moodAfter: skipReflection ? null : moodAfter,
        dullnessLevel: skipReflection ? null : dullness,
        distractionLevel: skipReflection ? null : distraction,
        mindWanderingEpisodes: skipReflection ? null : mindWandering,
        obstacleTags: skipReflection ? [] : obstacleTags,
      },
      {
        onSettled: () => router.replace("/tools/meditation"),
      },
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="flex-row items-center gap-2">
            <BackButton showLabel={false} className="-ml-2" />
            <Text variant="h2">{t("module.session.title")}</Text>
          </View>
          <PostSit
            stageNumber={currentStage}
            durationMinutes={durationMinutes}
            reflection={reflection}
            onReflectionChange={setReflection}
            moodAfter={moodAfter}
            onMoodChange={setMoodAfter}
            dullness={dullness}
            onDullnessChange={setDullness}
            distraction={distraction}
            onDistractionChange={setDistraction}
            mindWandering={mindWandering}
            onMindWanderingChange={setMindWandering}
            obstacleTags={obstacleTags}
            onObstacleTagToggle={toggleObstacleTag}
            onSave={() => handleSave(false)}
            onSkip={() => handleSave(true)}
            isPending={saveMutation.isPending}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { mindfulnessLookup } from "@/src/constants/mindfulness";
import { MindfulnessEntry } from "@/src/features/mindfulness/mindfulness-entry";
import { MindfulnessTimer } from "@/src/features/mindfulness/mindfulness-timer";
import {
  MindfulnessComplete,
  type CompletePayload,
} from "@/src/features/mindfulness/mindfulness-complete";
import { useSaveMindfulnessSession } from "@/src/features/mindfulness/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

type Phase = "entry" | "active" | "complete";

export default function MindfulnessExerciseScreen() {
  const { t } = useTranslation("cbt");
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const exercise = slug ? mindfulnessLookup[slug] : undefined;

  const [phase, setPhase] = useState<Phase>("entry");
  const [duration, setDuration] = useState<number>(() => {
    const ds = exercise?.durations ?? [5];
    return ds[Math.floor(ds.length / 2)] ?? ds[0];
  });

  const saveMutation = useSaveMindfulnessSession(user?.id ?? null);

  if (!exercise) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center p-6">
          <Text variant="h2">{t("mindfulness.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const goHome = () => router.replace("/tools/mindfulness" as Parameters<typeof router.replace>[0]);

  const handleSave = async ({ feeling, reflection }: CompletePayload) => {
    try {
      await saveMutation.mutateAsync({
        exerciseName: exercise.slug,
        durationMinutes: duration,
        reflection,
        feelingAfter: feeling,
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      goHome();
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  if (phase === "entry") {
    return (
      <MindfulnessEntry
        exercise={exercise}
        duration={duration}
        onChangeDuration={setDuration}
        onStart={() => setPhase("active")}
        onBack={() => router.back()}
      />
    );
  }

  if (phase === "active") {
    return (
      <MindfulnessTimer
        exercise={exercise}
        durationMinutes={duration}
        onComplete={() => setPhase("complete")}
        onBack={() => setPhase("entry")}
      />
    );
  }

  return (
    <MindfulnessComplete
      exercise={exercise}
      durationMinutes={duration}
      isSaving={saveMutation.isPending}
      onSave={(payload) => void handleSave(payload)}
      onSkip={goHome}
    />
  );
}

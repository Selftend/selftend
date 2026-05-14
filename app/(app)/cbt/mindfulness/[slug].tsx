import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { NumberRating } from "@/src/components/app/number-rating";
import { mindfulnessLookup } from "@/src/constants/mindfulness";
import { useSaveMindfulnessSession } from "@/src/features/mindfulness/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

type Phase = "intro" | "active" | "reflection";

export default function MindfulnessExerciseScreen() {
  const { t } = useTranslation("cbt");
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const exercise = slug ? mindfulnessLookup[slug] : undefined;

  const [phase, setPhase] = useState<Phase>("intro");
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [reflection, setReflection] = useState("");

  const saveMutation = useSaveMindfulnessSession(user?.id ?? null);

  useEffect(() => {
    if (phase !== "active" || secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          setPhase("reflection");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, secondsLeft]);

  const instructions = useMemo(() => {
    if (!exercise) return [];
    const list = t(`mindfulness.exercises.${exercise.slug}.instructions`, {
      returnObjects: true,
    });
    return Array.isArray(list) ? (list as string[]) : [];
  }, [exercise, t]);

  if (!exercise) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center p-6">
          <Text variant="h2">{t("mindfulness.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleStart = () => {
    if (!selectedDuration) return;
    setSecondsLeft(selectedDuration * 60);
    setPhase("active");
  };

  const handleSave = async () => {
    if (!selectedDuration) return;
    try {
      await saveMutation.mutateAsync({
        exerciseName: exercise.slug,
        durationMinutes: selectedDuration,
        reflection,
        moodAfter,
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace("/cbt/mindfulness");
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{t(`mindfulness.exercises.${exercise.slug}.title`)}</Text>
            <Text variant="muted">
              {t(`mindfulness.exercises.${exercise.slug}.shortDescription`)}
            </Text>
          </View>

          {phase === "intro" ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t("mindfulness.howTo")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <View className="gap-2">
                    {instructions.map((instruction, i) => (
                      <Text key={i} variant="muted">
                        {i + 1}. {instruction}
                      </Text>
                    ))}
                  </View>
                </CardContent>
              </Card>

              <View className="gap-3">
                <Label>{t("mindfulness.chooseDuration")}</Label>
                <View className="flex-row flex-wrap gap-2">
                  {exercise.durations.map((d) => (
                    <Button
                      key={d}
                      onPress={() => setSelectedDuration(d)}
                      variant={selectedDuration === d ? "default" : "outline"}
                    >
                      <Text>{t("mindfulness.minutes", { value: d })}</Text>
                    </Button>
                  ))}
                </View>
              </View>

              <Button disabled={!selectedDuration} onPress={handleStart}>
                <Text>{t("mindfulness.start")}</Text>
              </Button>
            </>
          ) : null}

          {phase === "active" ? (
            <Card>
              <CardContent className="items-center gap-4 pt-6">
                <Text variant="muted">{t("mindfulness.followAlong")}</Text>
                <Text className="text-5xl font-bold">{timeDisplay}</Text>
                <Text variant="muted" className="text-center">
                  {instructions[0]}
                </Text>
                <Button onPress={() => setPhase("reflection")} variant="ghost">
                  <Text>{t("mindfulness.finishEarly")}</Text>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {phase === "reflection" ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t("mindfulness.afterTitle")}</CardTitle>
                  <CardDescription>{t("mindfulness.afterDescription")}</CardDescription>
                </CardHeader>
              </Card>

              <View className="gap-2">
                <Label>{t("mindfulness.moodAfter")}</Label>
                <NumberRating value={moodAfter} onChange={setMoodAfter} />
              </View>

              <View className="gap-2">
                <Label>{t("mindfulness.reflection")}</Label>
                <Textarea
                  accessibilityLabel={t("mindfulness.reflection")}
                  onChangeText={setReflection}
                  placeholder={t("mindfulness.reflectionPlaceholder")}
                  value={reflection}
                />
              </View>

              <Button disabled={saveMutation.isPending} onPress={() => void handleSave()}>
                {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{t("mindfulness.save")}</Text>
              </Button>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

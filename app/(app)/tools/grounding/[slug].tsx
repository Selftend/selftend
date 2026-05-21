import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import { groundingLookup } from "@/src/constants/grounding";
import { useSaveGroundingSession } from "@/src/features/grounding/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

type Phase = "intro" | "active" | "done";

export default function GroundingExerciseScreen() {
  const { t } = useTranslation("cbt");
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);

  const technique = slug ? groundingLookup[slug] : undefined;

  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIndex, setStepIndex] = useState(0);

  const saveMutation = useSaveGroundingSession(user?.id ?? null);

  const steps = (() => {
    if (!technique) return [];
    const list = t(`grounding.techniques.${technique.slug}.steps`, { returnObjects: true });
    return Array.isArray(list) ? (list as string[]) : [];
  })();

  if (!technique) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center p-6">
          <Text variant="h2">{t("grounding.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setPhase("done");
    }
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        exerciseName: technique.slug,
        durationMinutes: 1,
        reflection: "",
        moodAfter: null,
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace("/tools/grounding" as Parameters<typeof router.replace>[0]);
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t(`grounding.techniques.${technique.slug}.title`)}</Text>
            </View>
            <Text variant="muted">
              {t(`grounding.techniques.${technique.slug}.shortDescription`)}
            </Text>
          </View>

          {phase === "intro" ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t("grounding.howTo")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <View className="gap-2">
                    {steps.map((step, i) => (
                      <Text key={i} variant="muted">
                        {i + 1}. {step}
                      </Text>
                    ))}
                  </View>
                </CardContent>
              </Card>

              <Button onPress={() => setPhase("active")}>
                <Text>{t("grounding.start")}</Text>
              </Button>
            </>
          ) : null}

          {phase === "active" ? (
            <View className="gap-6">
              <Text variant="muted" className="text-center">
                {t("grounding.step", { current: stepIndex + 1, total: steps.length })}
              </Text>

              <Card>
                <CardContent className="pt-6">
                  <Text className="text-lg text-center leading-relaxed">{steps[stepIndex]}</Text>
                </CardContent>
              </Card>

              <Button onPress={handleNext}>
                <Text>
                  {stepIndex < steps.length - 1 ? t("grounding.next") : t("grounding.finish")}
                </Text>
              </Button>
            </View>
          ) : null}

          {phase === "done" ? (
            <View className="gap-6">
              <Card>
                <CardContent className="items-center gap-2 pt-6">
                  <Text className="text-2xl font-semibold text-center">{t("grounding.done")}</Text>
                  <Text variant="muted" className="text-center">
                    {t("grounding.doneMessage")}
                  </Text>
                </CardContent>
              </Card>

              <Button disabled={saveMutation.isPending} onPress={() => void handleSave()}>
                {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{t("grounding.save")}</Text>
              </Button>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

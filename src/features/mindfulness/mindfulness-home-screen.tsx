import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { MindfulnessOnboarding } from "@/src/components/app/mindfulness-onboarding-modal";
import { mindfulnessExercises } from "@/src/constants/mindfulness";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useSession } from "@/src/providers/session-provider";

export default function MindfulnessHomeScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: sessions } = useMindfulnessSessions(userId, 7);

  const [forceOnboarding, setForceOnboarding] = useState(false);

  return (
    <>
      <MindfulnessOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <ModuleHomeHeader
                title={t("mindfulness.title")}
                actions={[
                  { type: "notifications", targetKey: "mindfulness" },
                  { type: "info", onPress: () => setForceOnboarding(true) },
                ]}
              />
              <Text variant="muted">{t("mindfulness.description")}</Text>
            </View>

            {sessions && sessions.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("mindfulness.streakTitle")}</CardTitle>
                  <CardDescription>
                    {t("mindfulness.recentCount", { count: sessions.length })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <View className="gap-1">
                    {sessions.slice(0, 3).map((s) => (
                      <Text key={s.id} variant="muted" className="text-sm">
                        • {t(`mindfulness.exercises.${s.exerciseName}.title`)} ·{" "}
                        {t("mindfulness.minutes", { value: s.durationMinutes })}
                      </Text>
                    ))}
                  </View>
                </CardContent>
              </Card>
            ) : null}

            <View className="gap-3">
              <Text variant="h3">{t("mindfulness.choose")}</Text>
              {mindfulnessExercises.map((exercise) => (
                <AccessibleCardLink
                  key={exercise.slug}
                  title={t(`mindfulness.exercises.${exercise.slug}.title`)}
                  description={t(`mindfulness.exercises.${exercise.slug}.shortDescription`)}
                  onPress={() => router.push(`/tools/mindfulness/${exercise.slug}`)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

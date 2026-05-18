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
import { BackButton } from "@/src/components/app/back-button";
import { MindfulnessOnboarding } from "@/src/components/app/mindfulness-onboarding-modal";
import { mindfulnessExercises } from "@/src/constants/mindfulness";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useUserPreferences, useUpdateUserPreferences } from "@/src/features/settings/queries";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useSession } from "@/src/providers/session-provider";

export default function MindfulnessHomeScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);
  const { data: sessions } = useMindfulnessSessions(userId, 7);

  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | undefined>();

  const onboardingNeeded =
    !prefsLoading && Boolean(preferences) && !preferences?.mindfulnessOnboardingCompleted;
  const showOnboarding = onboardingNeeded || forceOnboarding;

  async function handleOnboardingComplete() {
    if (!preferences) return;
    setOnboardingError(undefined);
    try {
      await updatePreferences.mutateAsync(
        mergeUserPreferences(preferences, { mindfulnessOnboardingCompleted: true }),
      );
      setForceOnboarding(false);
    } catch (error) {
      setOnboardingError(error instanceof Error ? error.message : undefined);
    }
  }

  return (
    <>
      <MindfulnessOnboarding
        visible={showOnboarding}
        isPending={updatePreferences.isPending}
        errorMessage={onboardingError}
        onComplete={handleOnboardingComplete}
      />
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <BackButton showLabel={false} className="-ml-2" />
                <Text variant="h1">{t("mindfulness.title")}</Text>
              </View>
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

import { router } from "expo-router";
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
import { mindfulnessExercises } from "@/src/constants/mindfulness";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useSession } from "@/src/providers/session-provider";

export default function MindfulnessScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: sessions } = useMindfulnessSessions(user?.id ?? null, 7);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{t("mindfulness.title")}</Text>
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
                onPress={() => router.push(`/cbt/mindfulness/${exercise.slug}`)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

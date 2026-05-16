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
import { BackButton } from "@/src/components/app/back-button";
import { breathingPatterns } from "@/src/constants/breathing";
import { useBreathingSessions } from "@/src/features/breathing/queries";
import { useSession } from "@/src/providers/session-provider";

export default function BreathingScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: sessions } = useBreathingSessions(user?.id ?? null, 7);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("breathing.title")}</Text>
            </View>
            <Text variant="muted">{t("breathing.description")}</Text>
          </View>

          {sessions && sessions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("mindfulness.streakTitle")}</CardTitle>
                <CardDescription>
                  {t("breathing.recentCount", { count: sessions.length })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <View className="gap-1">
                  {sessions.slice(0, 3).map((s) => (
                    <Text key={s.id} variant="muted" className="text-sm">
                      • {t(`breathing.exercises.${s.exerciseName}.title`)} ·{" "}
                      {t("breathing.minutes", { value: s.durationMinutes })}
                    </Text>
                  ))}
                </View>
              </CardContent>
            </Card>
          ) : null}

          <View className="gap-3">
            <Text variant="h3">{t("breathing.choose")}</Text>
            {breathingPatterns.map((pattern) => (
              <AccessibleCardLink
                key={pattern.slug}
                title={t(`breathing.exercises.${pattern.slug}.title`)}
                description={t(`breathing.exercises.${pattern.slug}.shortDescription`)}
                onPress={() =>
                  router.push(
                    `/tools/breathing/${pattern.slug}` as Parameters<typeof router.push>[0],
                  )
                }
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

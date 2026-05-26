import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { useMindfulnessSession } from "@/src/features/mindfulness/queries";
import { useSession } from "@/src/providers/session-provider";

export default function MindfulnessSessionDetailScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const params = useLocalSearchParams<{ id: string }>();
  const { data: session, isLoading } = useMindfulnessSession(user?.id ?? null, params.id ?? null);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <View className="gap-3 p-6">
          <ScreenHeader title={t("mindfulness.sessionDetail.notFound")} titleVariant="h2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t(`mindfulness.exercises.${session.exerciseName}.title`)} />
            <Text variant="muted">
              {t("mindfulness.sessionDetail.completedAt", {
                date: new Date(session.completedAt).toLocaleString(),
              })}
            </Text>
          </View>

          <Card>
            <CardContent className="gap-2 pt-6">
              <Text>{t("mindfulness.minutes", { value: session.durationMinutes })}</Text>
              {session.feelingAfter ? (
                <Text>
                  {t("mindfulness.sessionDetail.feeling", {
                    feeling: t(`mindfulness.feelings.${session.feelingAfter}`),
                  })}
                </Text>
              ) : null}
            </CardContent>
          </Card>

          {session.reflection.trim().length > 0 ? (
            <Card>
              <CardContent className="gap-2 pt-6">
                <CardTitle>{t("mindfulness.reflection")}</CardTitle>
                <Text variant="muted">{session.reflection}</Text>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
